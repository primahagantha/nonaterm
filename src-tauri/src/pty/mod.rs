//! Domain PTY untuk lifecycle terminal dan I/O streaming.

mod backpressure;
mod manager;
mod reader;
mod session;
mod shell_resolver;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Runtime};

pub use manager::PtyManager;
#[allow(unused_imports)]
pub use shell_resolver::{
    expand_path, parse_args as parse_shell_args, ShellPreset, ShellResolution, ShellResolver,
    ShellSource,
};

/// Event output PTY yang nantinya di-stream ke frontend.
pub const PTY_OUTPUT_EVENT: &str = "pty:output";

/// Event exit PTY yang nantinya di-stream ke frontend.
pub const PTY_EXIT_EVENT: &str = "pty:exit";

#[derive(Clone)]
pub struct PtyConfig {
    pub default_rows: u16,
    pub default_cols: u16,
    pub read_buffer_size: usize,
    pub batch_interval_ms: u64,
    pub max_batch_bytes: usize,
    pub max_pending_batches: u64,
}

impl Default for PtyConfig {
    fn default() -> Self {
        Self {
            default_rows: 24,
            default_cols: 80,
            read_buffer_size: 4096,
            batch_interval_ms: 16,
            max_batch_bytes: 4096,
            max_pending_batches: 8,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PtyOutputEventPayload {
    pub workspace_id: String,
    pub pane_id: String,
    pub chunk: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PtyExitEventPayload {
    pub workspace_id: String,
    pub pane_id: String,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Clone)]
pub struct PtySessionSnapshot {
    pub session_id: String,
    pub workspace_id: String,
    pub pane_id: String,
    pub shell: String,
    pub cwd: String,
    pub startup_command: Option<String>,
    pub rows: u16,
    pub cols: u16,
    pub process_id: Option<u32>,
}

pub trait PtyEventSink: Send + Sync {
    fn emit_output(&self, payload: PtyOutputEventPayload);
    fn emit_exit(&self, payload: PtyExitEventPayload);
}

pub struct TauriPtyEventSink<R: Runtime> {
    app_handle: AppHandle<R>,
}

impl<R: Runtime> TauriPtyEventSink<R> {
    pub fn new(app_handle: AppHandle<R>) -> Self {
        Self { app_handle }
    }
}

impl<R: Runtime> PtyEventSink for TauriPtyEventSink<R> {
    fn emit_output(&self, payload: PtyOutputEventPayload) {
        let _ = self.app_handle.emit(PTY_OUTPUT_EVENT, payload);
    }

    fn emit_exit(&self, payload: PtyExitEventPayload) {
        let _ = self.app_handle.emit(PTY_EXIT_EVENT, payload);
    }
}

/// Resolver input dari frontend. `source` = preset id atau path
/// eksplisit; `custom` = path yang ditulis user; `args` = string
/// argumen (diparse dengan dukungan quote).
#[derive(Debug, Clone, Default)]
pub struct ShellSpec {
    pub source: String,
    pub custom: String,
    pub args: String,
}

impl ShellSpec {
    /// Build a spec from the legacy single-string shell parameter used
    /// by the older IPC contract. Maps `powershell.exe` → `powershell`
    /// preset, etc. Falls back to `default` when input is empty.
    pub fn from_legacy(shell: Option<String>) -> Self {
        match shell {
            Some(value) => {
                let trimmed = value.trim();
                if trimmed.is_empty() {
                    Self::default()
                } else {
                    let lower = trimmed.to_ascii_lowercase();
                    let preset_id = match lower.as_str() {
                        "powershell.exe" | "powershell" => Some("powershell"),
                        "pwsh.exe" | "pwsh" => Some("pwsh"),
                        "cmd.exe" | "cmd" => Some("cmd"),
                        "bash" | "bash.exe" | "git-bash" | "gitbash" => Some("gitbash"),
                        "wsl" | "wsl.exe" => Some("wsl"),
                        _ => None,
                    };
                    if let Some(preset_id) = preset_id {
                        Self {
                            source: preset_id.to_string(),
                            custom: String::new(),
                            args: String::new(),
                        }
                    } else {
                        Self {
                            source: "custom".to_string(),
                            custom: trimmed.to_string(),
                            args: String::new(),
                        }
                    }
                }
            }
            None => Self::default(),
        }
    }
}
