//! Commands domain sistem untuk health check dasar.

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_updater::UpdaterExt;

use crate::config::CONFIG_FILE_NAME;
use crate::crash::{CrashCounters, CrashInjector, CrashScenario, CrashSummary, InjectionPlan};
use crate::perf::{
    measure_idle_with_sink, measure_multi_spawn, measure_throughput_with_sink,
    measure_throughput_with_tty_responding, noop_sink, MultiSpawnReport,
};
use crate::pty::{ShellSpec, PTY_EXIT_EVENT, PTY_OUTPUT_EVENT};
use crate::state::{AUTOSAVE_TRIGGERED_EVENT, WORKSPACE_CHANGED_EVENT};
use crate::utils::diagnostics::DiagnosticsSummary;
use crate::utils::normalize_label;
use crate::workspace::SUPPORTED_LAYOUT_PRESETS;
use crate::AppState;

/// Payload health check awal untuk verifikasi wiring frontend-backend.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemHealth {
    status: String,
    service: String,
    config_file_name: String,
    supported_layout_presets: Vec<String>,
    pty_output_event: String,
    pty_exit_event: String,
    workspace_changed_event: String,
    autosave_triggered_event: String,
}

/// Satu baris log yang sudah diparsing dari JSON log file.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogLine {
    pub timestamp: String,
    pub level: String,
    pub target: String,
    pub message: String,
}

/// Mengembalikan status awal backend untuk verifikasi wiring IPC.
#[tauri::command]
pub fn system_health_check() -> Result<SystemHealth, String> {
    Ok(SystemHealth {
        status: "ok".to_string(),
        service: normalize_label("Nonaterm Backend"),
        config_file_name: CONFIG_FILE_NAME.to_string(),
        supported_layout_presets: SUPPORTED_LAYOUT_PRESETS
            .into_iter()
            .map(ToString::to_string)
            .collect(),
        pty_output_event: PTY_OUTPUT_EVENT.to_string(),
        pty_exit_event: PTY_EXIT_EVENT.to_string(),
        workspace_changed_event: WORKSPACE_CHANGED_EVENT.to_string(),
        autosave_triggered_event: AUTOSAVE_TRIGGERED_EVENT.to_string(),
    })
}

/// Informasi hasil pengecekan update aplikasi.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub available: bool,
    pub version: Option<String>,
    pub current_version: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PerfProbeResult {
    pub spawn_ms: u128,
    pub shell: String,
    pub shell_source: String,
    pub cwd: String,
    pub resolver_probe_ms: u128,
    pub total_ms: u128,
    pub active_sessions_after: usize,
}

/// Mengambil ringkasan lokasi log dan crash report untuk troubleshooting user.
#[tauri::command]
pub fn system_get_diagnostics(state: State<'_, AppState>) -> Result<DiagnosticsSummary, String> {
    Ok(crate::utils::diagnostics::collect_summary(
        &state.app_data_dir,
        &state.log_dir,
    ))
}

/// Mengambil N baris log terbaru, difilter berdasarkan level (info/warn/error/debug).
/// Level kosong berarti mengembalikan semua level.
#[tauri::command]
pub fn system_get_log_lines(
    state: State<'_, AppState>,
    lines: Option<usize>,
    level: Option<String>,
) -> Result<Vec<LogLine>, String> {
    let max_lines = lines.unwrap_or(200);
    let filter_level = level
        .map(|l| l.trim().to_uppercase())
        .filter(|l| !l.is_empty());

    let log_file = match &crate::utils::diagnostics::latest_log_file_path(&state.log_dir) {
        Some(path) => path.clone(),
        None => return Ok(vec![]),
    };

    let content = std::fs::read_to_string(&log_file).map_err(|e| e.to_string())?;
    let mut result: Vec<LogLine> = Vec::new();

    for line in content.lines().rev() {
        if result.len() >= max_lines {
            break;
        }

        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        if let Ok(entry) = serde_json::from_str::<serde_json::Value>(trimmed) {
            let log_level = entry
                .get("level")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_uppercase();

            if let Some(ref filter) = filter_level {
                if &log_level != filter {
                    continue;
                }
            }

            result.push(LogLine {
                timestamp: entry
                    .get("timestamp")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                level: log_level,
                target: entry
                    .get("target")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                message: entry
                    .get("fields")
                    .and_then(|f| f.get("message"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
            });
        }
    }

    result.reverse();
    Ok(result)
}

/// Mengecek apakah ada update aplikasi yang tersedia tanpa menginstalnya.
#[tauri::command]
pub async fn system_check_updates(app: AppHandle) -> Result<UpdateInfo, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let current_version = app.package_info().version.to_string();

    match updater.check().await {
        Ok(Some(update)) => Ok(UpdateInfo {
            available: true,
            version: Some(update.version),
            current_version,
            notes: update.body,
        }),
        Ok(None) => Ok(UpdateInfo {
            available: false,
            version: None,
            current_version,
            notes: None,
        }),
        Err(e) => Err(e.to_string()),
    }
}

/// Mengunduh dan menginstal update aplikasi, lalu me-restart aplikasi.
#[tauri::command]
pub async fn system_install_update(app: AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater
        .check()
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No update available".to_string())?;

    update
        .download_and_install(|_len, _total| {}, || {})
        .await
        .map_err(|e| e.to_string())?;

    app.restart()
}

#[tauri::command]
pub async fn system_run_perf_probe(state: State<'_, AppState>) -> Result<PerfProbeResult, String> {
    let total_started = Instant::now();
    let pane_id = format!("perf-probe-{}", uuid::Uuid::new_v4());
    let spec = ShellSpec::from_legacy(Some("powershell.exe".to_string()));

    // First measure the resolver cost in isolation.
    let resolver_started = Instant::now();
    let resolved = state
        .pty_manager
        .resolve_shell_spec(&spec)
        .map_err(|e| format!("resolver failed: {e}"))?;
    let resolver_probe_ms = resolver_started.elapsed().as_millis();

    let spawn_started = Instant::now();
    let session = state
        .pty_manager
        .spawn_session_with_spec(
            "workspace-probe".to_string(),
            pane_id.clone(),
            spec,
            None,
            None,
            Some(24),
            Some(80),
        )
        .await?;
    let spawn_ms = spawn_started.elapsed().as_millis();
    let _ = state.pty_manager.close_session(&pane_id).await;
    let active_sessions_after = state.pty_manager.active_session_count().await;
    let total_ms = total_started.elapsed().as_millis();

    Ok(PerfProbeResult {
        spawn_ms,
        shell: session.shell,
        shell_source: resolved.source.label().to_string(),
        cwd: session.cwd,
        resolver_probe_ms,
        total_ms,
        active_sessions_after,
    })
}

/// Multi-spawn perf benchmark for 9-pane layout. Spawns N PTY sessions
/// sequentially, records per-call latency + memory delta, then cleans
/// them up. Returns aggregated stats.
#[tauri::command]
pub async fn system_run_multi_spawn_probe(
    state: State<'_, AppState>,
    panes: Option<usize>,
    rows: Option<u16>,
    cols: Option<u16>,
) -> Result<MultiSpawnReport, String> {
    let panes = panes.unwrap_or(9).clamp(1, 9);
    let rows = rows.unwrap_or(24);
    let cols = cols.unwrap_or(80);
    measure_multi_spawn(&state, panes, rows, cols).await
}

/// Idle RSS probe — spawn N panes via dedicated manager, sample RSS
/// selama `dwell_ms` window. Tidak mengganggu session live app karena
/// pakai NoopPtyEventSink (event output di-drop, tidak di-emit ke
/// frontend). Default: 9 panes, 1500ms dwell, 200ms sample interval.
#[tauri::command]
pub async fn system_run_idle_probe(
    panes: Option<usize>,
    dwell_ms: Option<u64>,
    sample_interval_ms: Option<u64>,
) -> Result<crate::perf::IdleReport, String> {
    let panes = panes.unwrap_or(9).clamp(1, 9);
    let dwell = dwell_ms.unwrap_or(1500).clamp(200, 30_000);
    let interval = sample_interval_ms.unwrap_or(200).clamp(50, 1_000);
    measure_idle_with_sink(noop_sink(), panes, dwell, interval).await
}

/// Output throughput probe — spawn N panes, write synthetic
/// `for /L %i in (1,1,N) do @echo perf-line-%i` ke masing-masing,
/// hitung total bytes/batches via CountingPtyEventSink selama
/// fixed measurement window. Validates pipeline output di skenario
/// output deras (npm install / build log).
#[tauri::command]
pub async fn system_run_throughput_probe(
    panes: Option<usize>,
    lines_per_pane: Option<u32>,
    measurement_window_ms: Option<u64>,
) -> Result<crate::perf::ThroughputReport, String> {
    let panes = panes.unwrap_or(9).clamp(1, 9);
    let lines = lines_per_pane.unwrap_or(100).clamp(1, 5_000);
    let window = measurement_window_ms.unwrap_or(3_000).clamp(200, 30_000);
    measure_throughput_with_sink(noop_sink(), panes, lines, window).await
}

/// Throughput probe dengan [`crate::perf::TtyRespondingSink`] — sama
/// dengan `system_run_throughput_probe` tapi juga menghitung terminal
/// control queries (`ESC[6n` cursor, `ESC[0c` device attributes) yang
/// diterima dari shell. `unhandledQueries > 0` atau
/// `cursorQueryReceived > 0` menandakan pipeline output dalam
/// kondisi degraded.
#[tauri::command]
pub async fn system_run_tty_responding_probe(
    panes: Option<usize>,
    lines_per_pane: Option<u32>,
    measurement_window_ms: Option<u64>,
) -> Result<crate::perf::TtyRespondingProbeReport, String> {
    let panes = panes.unwrap_or(9).clamp(1, 9);
    let lines = lines_per_pane.unwrap_or(100).clamp(1, 5_000);
    let window = measurement_window_ms.unwrap_or(3_000).clamp(200, 30_000);
    measure_throughput_with_tty_responding(noop_sink(), panes, lines, window, 24, 80).await
}

// ================== Crash simulation ==================

/// One crash simulation scenario to enqueue. Provided as a typed
/// string so the frontend doesn't need to import Rust enums.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrashScenarioInput {
    pub scenario: String,
    pub count: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CrashSimulationResult {
    pub consumed: Vec<String>,
    pub summary: CrashSummary,
}

/// Enqueue crash scenarios + execute one quick synthetic fault
/// (e.g. cmd.exe /C exit 137) so the frontend can verify the
/// diagnostics + perf probe paths still respond when a session
/// dies. Returns the count of scenarios that actually fired.
///
/// State-level scenarios (SnapshotWriteIoError, SqliteBusyTimeout,
/// RecoveryRace) di-route ke live [`AppState::state_manager`]
/// via [`crate::state::StateManager`] scenario helpers. Fault
/// injector di-install sebelum operasi + di-clear setelah selesai
/// supaya tidak bocor ke sesi berikutnya. PTY-level scenarios
/// tetap pakai counter lokal (no StateManager access).
#[tauri::command]
pub async fn system_run_crash_simulation(
    state: State<'_, AppState>,
    scenarios: Vec<CrashScenarioInput>,
) -> Result<CrashSimulationResult, String> {
    let counters = Arc::new(CrashCounters::new());
    let injector = CrashInjector::new(counters.clone());

    for input in &scenarios {
        let scenario = parse_scenario(&input.scenario)?;
        injector.enqueue(InjectionPlan::new(scenario, input.count.max(1)));
    }

    let state_manager = &state.state_manager;
    // Snapshot dummy untuk trigger write path. active_workspace_id
    // bisa kosong — yang penting `save_to_db_then_json` harus
    // konsult fault injector sebelum write.
    let probe_snapshot = crate::state::StateSnapshot {
        active_workspace_id: "crash-probe".into(),
        workspaces: Vec::new(),
        saved_at: chrono::Utc::now(),
    };

    let mut consumed: Vec<String> = Vec::new();
    let total_count = scenarios.iter().map(|s| s.count as usize).sum::<usize>();

    for _ in 0..total_count {
        let Some(scenario) = injector.pick() else {
            break;
        };
        consumed.push(scenario.label().to_string());

        match scenario {
            CrashScenario::ProcessExitsImmediately => {
                let (elapsed, code) = crate::crash::measure_spawn_then_exit("crash-probe");
                tracing::warn!(
                    elapsed_ms = elapsed,
                    exit_code = code,
                    "crash simulation: process exits immediately"
                );
            }
            CrashScenario::PanicDuringOutput => {
                let _ = injector.run_with_panic_guard(|| {
                    panic!("simulated output panic");
                });
            }
            CrashScenario::BrokenPipeOnRead => {
                counters
                    .read_attempts
                    .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                counters
                    .read_broken_pipe
                    .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            }
            CrashScenario::SpawnEagain => {
                counters
                    .spawn_attempts
                    .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                counters
                    .spawn_failed
                    .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            }
            CrashScenario::ResizeInvalid => {
                counters
                    .resize_attempts
                    .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                counters
                    .resize_invalid
                    .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            }
            // -- State-level: route ke live StateManager. Fault
            //    injector di-install sebelum, di-clear setelah
            //    supaya tidak bocor.
            CrashScenario::SnapshotWriteIoError => {
                if let Err(error) =
                    state_manager.run_snapshot_write_io_error_scenario(&counters, &probe_snapshot)
                {
                    tracing::warn!(error = %error, "snapshot-write-io-error scenario anomali");
                }
            }
            CrashScenario::SqliteBusyTimeout => {
                if let Err(error) = state_manager.run_sqlite_busy_timeout_scenario(
                    &counters,
                    std::time::Duration::from_millis(200),
                ) {
                    tracing::warn!(error = %error, "sqlite-busy-timeout scenario anomali");
                }
            }
            CrashScenario::RecoveryRace => {
                if let Err(error) =
                    state_manager.run_recovery_race_scenario(&counters, &probe_snapshot)
                {
                    tracing::warn!(error = %error, "recovery-race scenario anomali");
                }
            }
        }
        injector.consume();
    }

    // Safety net: pastikan injector cleared kalau scenario helper
    // di-skip (mis. exception yang di-swallow). Idempotent.
    state_manager.clear_fault_injector();

    let summary = counters.summary();
    Ok(CrashSimulationResult { consumed, summary })
}

fn parse_scenario(label: &str) -> Result<CrashScenario, String> {
    match label.trim().to_ascii_lowercase().as_str() {
        "process-exits-immediately" | "exit" | "exit137" => {
            Ok(CrashScenario::ProcessExitsImmediately)
        }
        "broken-pipe-on-read" | "broken-pipe" | "epipe" => Ok(CrashScenario::BrokenPipeOnRead),
        "spawn-eagain" | "eagain" | "spawn-fail" => Ok(CrashScenario::SpawnEagain),
        "panic-during-output" | "panic" => Ok(CrashScenario::PanicDuringOutput),
        "resize-invalid" | "einval" | "resize-fail" => Ok(CrashScenario::ResizeInvalid),
        "snapshot-write-io-error" | "snapshot-io" | "disk-full" => {
            Ok(CrashScenario::SnapshotWriteIoError)
        }
        "sqlite-busy-timeout" | "sqlite-busy" | "busy-timeout" => {
            Ok(CrashScenario::SqliteBusyTimeout)
        }
        "recovery-race" | "race" | "snapshot-race" => Ok(CrashScenario::RecoveryRace),
        other => Err(format!("unknown crash scenario: `{other}`")),
    }
}

/// Read a text file from disk. Returns null if file doesn't exist.
#[tauri::command]
pub fn system_read_text_file(path: String) -> Result<Option<String>, String> {
    match std::fs::read_to_string(&path) {
        Ok(content) => Ok(Some(content)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("Failed to read {}: {}", path, e)),
    }
}

/// Check if any project rules files exist in the given directory.
/// Returns the content of the first one found (AGENTS.md, CLAUDE.md, .cursorrules).
#[tauri::command]
pub fn system_detect_project_rules(dir: String) -> Result<Option<String>, String> {
    let candidates = ["AGENTS.md", "CLAUDE.md", ".cursorrules", "CONVENTIONS.md"];
    for name in &candidates {
        let path = std::path::Path::new(&dir).join(name);
        if let Ok(content) = std::fs::read_to_string(&path) {
            return Ok(Some(content));
        }
    }
    Ok(None)
}

/// Placeholder for future global hotkey support.
/// Requires tauri-plugin-global-shortcut with correct API version.
#[tauri::command]
pub fn system_register_global_hotkey(_shortcut: String) -> Result<(), String> {
    Err("Global hotkey not yet supported in this build".to_string())
}

#[tauri::command]
pub fn system_unregister_global_hotkey(_shortcut: String) -> Result<(), String> {
    Err("Global hotkey not yet supported in this build".to_string())
}

/// Start watching a directory for file changes (PRD Section 11.4).
/// Emits "fs:file-changed" events when files are created/modified/deleted.
#[tauri::command]
pub fn system_start_file_watcher(
    workspace_id: String,
    path: String,
    app_handle: AppHandle,
) -> Result<(), String> {
    let ws_id = workspace_id.clone();
    crate::fs_watcher::start_watching(workspace_id, &path, move |event| {
        let _ = app_handle.emit("fs:file-changed", &event);
    })?;
    tracing::info!(workspace_id = %ws_id, path = %path, "File watcher started");
    Ok(())
}

/// CLI scripting interface (PRD Section 9 - WezTerm).
/// Returns app status for external CLI tools.
#[tauri::command]
pub fn system_cli_status() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "version": env!("CARGO_PKG_VERSION"),
        "platform": std::env::consts::OS,
        "status": "running",
    }))
}

/// CLI scripting: send text to a specific pane.
#[tauri::command]
pub async fn system_cli_send(pane_id: String, text: String) -> Result<(), String> {
    tracing::info!(pane_id = %pane_id, text = %text, "CLI send requested");
    Ok(())
}

/// CLI scripting: list all active panes.
#[tauri::command]
pub fn system_cli_list_panes() -> Result<Vec<serde_json::Value>, String> {
    // Placeholder - would need PTY manager access
    Ok(vec![])
}

/// Get the current platform for reliable cross-platform detection.
#[tauri::command]
pub fn system_get_platform() -> String {
    std::env::consts::OS.to_string()
}

/// Get the default shell for the current platform.
#[tauri::command]
pub fn system_get_default_shell() -> String {
    #[cfg(windows)]
    {
        std::env::var("COMSPEC").unwrap_or_else(|_| "cmd.exe".to_string())
    }
    #[cfg(not(windows))]
    {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::{system_health_check, UpdateInfo};
    use crate::pty::{
        expand_path, parse_shell_args, ShellPreset, ShellResolution, ShellResolver, ShellSource,
    };

    #[test]
    fn shell_resolver_exposes_public_api() {
        // Touch each public type so the re-exports stay honest.
        let resolver = ShellResolver::default();
        let _ = &resolver;
        let _: Option<ShellPreset> = ShellPreset::parse("pwsh");
        let _: Vec<String> = parse_shell_args("-NoLogo -Command \"hi\"");
        let _: String = expand_path("~/projects");
        let source = ShellSource::Preset("test");
        let _: &str = source.label();
        let _ = ShellResolution {
            program: "cmd".to_string(),
            args: vec![],
            source,
        };
    }

    #[test]
    fn returns_expected_health_contract() {
        let health = system_health_check().expect("system health should be available");
        let value = serde_json::to_value(health).expect("system health should serialize");

        assert_eq!(value["status"], "ok");
        assert_eq!(value["service"], "nonaterm-backend");
        assert_eq!(value["configFileName"], "config.json");
        assert_eq!(value["ptyOutputEvent"], "pty:output");
        assert_eq!(value["ptyExitEvent"], "pty:exit");
        assert_eq!(value["workspaceChangedEvent"], "workspace:changed");
        assert_eq!(value["autosaveTriggeredEvent"], "autosave:triggered");
        assert_eq!(
            value["supportedLayoutPresets"].as_array().map(Vec::len),
            Some(5)
        );
    }

    #[test]
    fn update_info_serializes_with_camel_case() {
        let info = UpdateInfo {
            available: true,
            version: Some("0.2.0".to_string()),
            current_version: "0.1.0".to_string(),
            notes: Some("Bug fixes".to_string()),
        };
        let value = serde_json::to_value(&info).expect("UpdateInfo should serialize");

        assert_eq!(value["available"], true);
        assert_eq!(value["version"], "0.2.0");
        assert_eq!(value["currentVersion"], "0.1.0");
        assert_eq!(value["notes"], "Bug fixes");
    }

    #[test]
    fn update_info_serializes_no_update_case() {
        let info = UpdateInfo {
            available: false,
            version: None,
            current_version: "0.1.0".to_string(),
            notes: None,
        };
        let value = serde_json::to_value(&info).expect("UpdateInfo should serialize");

        assert_eq!(value["available"], false);
        assert_eq!(value["version"], serde_json::Value::Null);
        assert_eq!(value["currentVersion"], "0.1.0");
        assert_eq!(value["notes"], serde_json::Value::Null);
    }
}
