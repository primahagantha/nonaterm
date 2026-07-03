//! PTY manager utama untuk spawn, write, resize, dan close session.

use std::collections::HashMap;
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use tauri::{AppHandle, Runtime};
use tokio::sync::RwLock;
use uuid::Uuid;

use super::backpressure::FlowControl;
use super::reader::spawn_reader_thread;
use super::session::PtySession;
use super::shell_resolver::{ShellResolution, ShellResolver};
use super::{
    PtyConfig, PtyEventSink, PtyExitEventPayload, PtySessionSnapshot, ShellSpec, TauriPtyEventSink,
};

pub struct PtyManager {
    event_sink: Arc<dyn PtyEventSink>,
    sessions: Arc<RwLock<HashMap<String, Arc<PtySession>>>>,
    config: PtyConfig,
    resolver: ShellResolver,
}

impl PtyManager {
    pub fn new<R: Runtime>(app_handle: AppHandle<R>) -> Self {
        Self::new_with_sink(Arc::new(TauriPtyEventSink::new(app_handle)))
    }

    pub fn new_with_sink(event_sink: Arc<dyn PtyEventSink>) -> Self {
        Self {
            event_sink,
            sessions: Arc::new(RwLock::new(HashMap::new())),
            config: PtyConfig::default(),
            resolver: ShellResolver::default(),
        }
    }

    /// Build a manager with a custom resolver (used in tests + perf).
    pub fn with_resolver(event_sink: Arc<dyn PtyEventSink>, resolver: ShellResolver) -> Self {
        Self {
            event_sink,
            sessions: Arc::new(RwLock::new(HashMap::new())),
            config: PtyConfig::default(),
            resolver,
        }
    }

    pub async fn spawn_session(
        &self,
        workspace_id: String,
        pane_id: String,
        shell: Option<String>,
        cwd: Option<String>,
        startup_command: Option<String>,
        rows: Option<u16>,
        cols: Option<u16>,
    ) -> Result<PtySessionSnapshot, String> {
        self.spawn_session_with_spec(
            workspace_id,
            pane_id,
            ShellSpec::from_legacy(shell),
            cwd,
            startup_command,
            rows,
            cols,
        )
        .await
    }

    pub async fn spawn_session_with_spec(
        &self,
        workspace_id: String,
        pane_id: String,
        spec: ShellSpec,
        cwd: Option<String>,
        startup_command: Option<String>,
        rows: Option<u16>,
        cols: Option<u16>,
    ) -> Result<PtySessionSnapshot, String> {
        {
            let sessions = self.sessions.read().await;
            if sessions.contains_key(&pane_id) {
                return Err(format!(
                    "pane `{pane_id}` already has an active PTY session"
                ));
            }
        }

        let resolution = self.resolver.resolve(&spec)?;
        let program = resolution.program.clone();
        let args = resolution.args.clone();
        tracing::info!(
            pane_id = %pane_id,
            workspace_id = %workspace_id,
            shell = %program,
            shell_source = %resolution.source.label(),
            args_count = args.len(),
            "Resolved PTY shell"
        );

        let cwd = resolve_cwd(cwd.as_deref())?;
        tracing::info!(
            pane_id = %pane_id,
            workspace_id = %workspace_id,
            cwd = %cwd,
            "Spawning PTY session"
        );
        let size = PtySize {
            rows: rows.unwrap_or(self.config.default_rows),
            cols: cols.unwrap_or(self.config.default_cols),
            pixel_width: 0,
            pixel_height: 0,
        };

        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(size)
            .map_err(|error| error.to_string())?;

        let mut command = CommandBuilder::new(&program);
        for arg in &args {
            command.arg(arg);
        }
        command.cwd(cwd.clone());

        let child = pair
            .slave
            .spawn_command(command)
            .map_err(|error| format!("failed to spawn PTY child `{program}`: {error}"))?;
        let process_id = child.process_id();
        let killer = child.clone_killer();
        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|error| error.to_string())?;
        let writer = pair
            .master
            .take_writer()
            .map_err(|error| error.to_string())?;
        let (shutdown_tx, shutdown_rx) = std::sync::mpsc::channel();
        let flow_control = Arc::new(FlowControl::new(self.config.max_pending_batches));
        let master = Arc::new(Mutex::new(pair.master));
        let session_writer: Arc<Mutex<Box<dyn Write + Send>>> = Arc::new(Mutex::new(writer));
        let session = Arc::new(PtySession {
            session_id: Uuid::new_v4().to_string(),
            workspace_id: workspace_id.clone(),
            pane_id: pane_id.clone(),
            shell: program.clone(),
            cwd: cwd.clone(),
            startup_command: startup_command.clone(),
            process_id,
            master: Arc::clone(&master),
            writer: Arc::clone(&session_writer),
            child: Arc::new(Mutex::new(child)),
            killer: Arc::new(Mutex::new(killer)),
            size: Arc::new(Mutex::new(size)),
            flow_control: Arc::clone(&flow_control),
            shutdown_tx,
        });

        // Inject startup command from backend after a short delay to
        // give the shell time to initialize its prompt. This replaces
        // the old frontend `ptyWrite` injection and is more reliable
        // because the backend controls timing and the frontend no
        // longer needs to guess when the shell is ready.
        if let Some(cmd) = startup_command.as_ref() {
            let cmd = cmd.trim().to_string();
            if !cmd.is_empty() {
                let writer = Arc::clone(&session_writer);
                let pane_id_clone = pane_id.clone();
                std::thread::Builder::new()
                    .name(format!("pty-startup-{pane_id_clone}"))
                    .spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(150));
                        let line = format!("{cmd}\r\n");
                        let mut w = writer.lock().expect("PTY writer mutex poisoned");
                        let _ = w.write_all(line.as_bytes());
                        let _ = w.flush();
                        tracing::info!(
                            pane_id = %pane_id_clone,
                            command = %cmd,
                            "Injected startup command into PTY"
                        );
                    })
                    .expect("failed to spawn PTY startup injection thread");
            }
        }

        spawn_reader_thread(
            Arc::clone(&self.event_sink),
            workspace_id.clone(),
            pane_id.clone(),
            reader,
            shutdown_rx,
            flow_control,
            self.config.clone(),
        );
        spawn_exit_watcher(
            Arc::clone(&self.event_sink),
            Arc::clone(&self.sessions),
            Arc::clone(&session.child),
            session.session_id.clone(),
            workspace_id.clone(),
            pane_id.clone(),
        );

        self.sessions
            .write()
            .await
            .insert(pane_id.clone(), Arc::clone(&session));

        Ok(session.snapshot())
    }

    /// Expose the resolver so commands and tests can probe it.
    pub fn resolver(&self) -> &ShellResolver {
        &self.resolver
    }

    /// Resolve a shell spec into a concrete program + args. This is what
    /// `system_run_perf_probe` calls so the perf measurement uses the
    /// exact same resolver as live spawns.
    pub fn resolve_shell_spec(&self, spec: &ShellSpec) -> Result<ShellResolution, String> {
        self.resolver.resolve(spec)
    }

    pub async fn close_session(&self, pane_id: &str) -> Result<(), String> {
        tracing::info!(pane_id = %pane_id, "Closing PTY session");
        let session = self
            .sessions
            .write()
            .await
            .remove(pane_id)
            .ok_or_else(|| format!("pane `{pane_id}` does not have an active PTY session"))?;

        let _ = session.shutdown_tx.send(());
        let kill_result = session
            .killer
            .lock()
            .expect("PTY killer mutex poisoned")
            .kill();

        match kill_result {
            Ok(()) => Ok(()),
            Err(error) if error.raw_os_error() == Some(6) => Ok(()),
            Err(error) => Err(error.to_string()),
        }
    }

    pub async fn write_text(&self, pane_id: &str, data: &str) -> Result<(), String> {
        self.write_binary(pane_id, data.as_bytes()).await
    }

    pub async fn write_binary(&self, pane_id: &str, data: &[u8]) -> Result<(), String> {
        let session = self.get_session(pane_id).await?;
        tracing::debug!(pane_id = %pane_id, bytes = data.len(), "Writing PTY input batch");
        let mut writer = session.writer.lock().expect("PTY writer mutex poisoned");
        writer.write_all(data).map_err(|error| error.to_string())?;
        writer.flush().map_err(|error| error.to_string())
    }

    pub async fn resize_session(&self, pane_id: &str, rows: u16, cols: u16) -> Result<(), String> {
        let session = self.get_session(pane_id).await?;
        tracing::debug!(pane_id = %pane_id, rows, cols, "Resizing PTY session");
        let new_size = PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };

        session
            .master
            .lock()
            .expect("PTY master mutex poisoned")
            .resize(new_size)
            .map_err(|error| error.to_string())?;

        *session.size.lock().expect("PTY size mutex poisoned") = new_size;
        Ok(())
    }

    pub async fn acknowledge_output(&self, pane_id: &str) -> Result<(), String> {
        let session = self.get_session(pane_id).await?;
        session.flow_control.acknowledge();
        Ok(())
    }

    pub async fn restart_session(&self, pane_id: &str) -> Result<PtySessionSnapshot, String> {
        let session = self.get_session(pane_id).await?;
        let snapshot = session.snapshot();

        self.close_session(pane_id).await?;
        self.spawn_session(
            snapshot.workspace_id,
            snapshot.pane_id,
            Some(snapshot.shell),
            Some(snapshot.cwd),
            snapshot.startup_command,
            Some(snapshot.rows),
            Some(snapshot.cols),
        )
        .await
    }

    pub async fn has_session(&self, pane_id: &str) -> bool {
        self.sessions.read().await.contains_key(pane_id)
    }

    pub async fn active_session_count(&self) -> usize {
        self.sessions.read().await.len()
    }

    async fn get_session(&self, pane_id: &str) -> Result<Arc<PtySession>, String> {
        self.sessions
            .read()
            .await
            .get(pane_id)
            .cloned()
            .ok_or_else(|| format!("pane `{pane_id}` does not have an active PTY session"))
    }
}

fn spawn_exit_watcher(
    event_sink: Arc<dyn PtyEventSink>,
    sessions: Arc<RwLock<HashMap<String, Arc<PtySession>>>>,
    child: Arc<Mutex<Box<dyn portable_pty::Child + Send + Sync>>>,
    session_id: String,
    workspace_id: String,
    pane_id: String,
) {
    std::thread::Builder::new()
        .name(format!("pty-exit-{pane_id}"))
        .spawn(move || {
            let exit_code = child
                .lock()
                .expect("PTY child mutex poisoned")
                .wait()
                .ok()
                .map(|status| status.exit_code() as i32);

            let should_remove = sessions
                .blocking_read()
                .get(&pane_id)
                .map(|session| session.session_id == session_id)
                .unwrap_or(false);

            if should_remove {
                sessions.blocking_write().remove(&pane_id);
            }
            tracing::info!(pane_id = %pane_id, workspace_id = %workspace_id, exit_code = ?exit_code, "PTY session exited");
            event_sink.emit_exit(PtyExitEventPayload {
                workspace_id,
                pane_id,
                exit_code,
            });
        })
        .expect("failed to spawn PTY exit watcher thread");
}

pub fn resolve_cwd(cwd: Option<&str>) -> Result<String, String> {
    let expanded = super::shell_resolver::expand_path(cwd.unwrap_or(""));
    let resolved = if expanded.is_empty() {
        std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
    } else {
        PathBuf::from(expanded)
    };

    if !resolved.exists() || !resolved.is_dir() {
        return Err(format!(
            "working directory does not exist: {}",
            resolved.display()
        ));
    }

    Ok(resolved.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use std::sync::mpsc;
    use std::sync::{Arc, Mutex};
    use std::time::Duration;

    use super::{resolve_cwd, ShellResolver};
    use crate::pty::{PtyEventSink, PtyExitEventPayload, PtyOutputEventPayload, ShellSpec};
    use tokio::runtime::Runtime;

    struct MemoryEventSink {
        output_tx: Mutex<mpsc::Sender<PtyOutputEventPayload>>,
        exit_tx: Mutex<mpsc::Sender<PtyExitEventPayload>>,
    }

    impl PtyEventSink for MemoryEventSink {
        fn emit_output(&self, payload: PtyOutputEventPayload) {
            let _ = self
                .output_tx
                .lock()
                .expect("output sender mutex poisoned")
                .send(payload);
        }

        fn emit_exit(&self, payload: PtyExitEventPayload) {
            let _ = self
                .exit_tx
                .lock()
                .expect("exit sender mutex poisoned")
                .send(payload);
        }
    }

    #[test]
    fn resolve_cwd_rejects_missing_directory() {
        let result = resolve_cwd(Some("Z:\\definitely-missing-directory-for-Nonaterm"));

        assert!(result.is_err());
    }

    #[test]
    fn resolve_cwd_defaults_to_current_dir() {
        let result = resolve_cwd(None).expect("cwd should resolve to current dir");
        assert!(!result.is_empty());
    }

    #[test]
    fn shell_legacy_mapping_for_known_exes() {
        let spec = ShellSpec::from_legacy(Some("pwsh.exe".to_string()));
        assert_eq!(spec.source, "pwsh");
        assert_eq!(spec.custom, "");

        let spec = ShellSpec::from_legacy(Some("powershell.exe".to_string()));
        assert_eq!(spec.source, "powershell");
    }

    #[test]
    fn shell_legacy_treats_unknown_as_custom() {
        let spec = ShellSpec::from_legacy(Some("C:\\Tools\\fish.exe".to_string()));
        assert_eq!(spec.source, "custom");
        assert_eq!(spec.custom, "C:\\Tools\\fish.exe");
    }

    #[test]
    fn shell_legacy_none_yields_default_preset() {
        let spec = ShellSpec::from_legacy(None);
        assert_eq!(spec.source, "");
        assert_eq!(spec.custom, "");
    }

    #[test]
    fn resolver_uses_explicit_when_path_is_absolute() {
        let resolver = ShellResolver::without_path();
        let spec = ShellSpec::from_legacy(Some("C:\\Windows\\System32\\cmd.exe".to_string()));
        let result = resolver
            .resolve(&spec)
            .expect("absolute path should resolve on Windows");
        assert!(result.program.to_ascii_lowercase().contains("cmd"));
    }

    #[test]
    fn pty_spawn_output_close_smoke() {
        let (output_tx, output_rx) = mpsc::channel::<PtyOutputEventPayload>();
        let (exit_tx, _exit_rx) = mpsc::channel::<PtyExitEventPayload>();
        let manager = super::PtyManager::new_with_sink(Arc::new(MemoryEventSink {
            output_tx: Mutex::new(output_tx),
            exit_tx: Mutex::new(exit_tx),
        }));
        let pane_id = "pane-smoke".to_string();

        let runtime = Runtime::new().expect("tokio runtime should build");
        runtime.block_on(async {
            manager
                .spawn_session(
                    "workspace-smoke".to_string(),
                    pane_id.clone(),
                    Some("cmd.exe".to_string()),
                    Some(
                        std::env::current_dir()
                            .expect("cwd should exist")
                            .to_string_lossy()
                            .into_owned(),
                    ),
                    None,
                    Some(24),
                    Some(80),
                )
                .await
                .expect("PTY session should spawn");

            tokio::time::sleep(Duration::from_millis(250)).await;

            manager
                .write_text(&pane_id, "echo Nonaterm-smoke\r\n")
                .await
                .expect("PTY write should succeed");
        });

        let output = output_rx
            .recv_timeout(Duration::from_secs(5))
            .expect("should receive PTY output within timeout");

        assert!(!output.chunk.trim().is_empty());

        runtime.block_on(async {
            manager
                .close_session(&pane_id)
                .await
                .expect("PTY close should succeed");
            assert!(!manager.has_session(&pane_id).await);
        });
    }
}
