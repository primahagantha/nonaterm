//! Commands domain PTY.

use serde::Serialize;
use tauri::State;

use crate::AppState;

/// Metadata session PTY yang dikembalikan saat spawn berhasil.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PtySessionInfo {
    session_id: String,
    workspace_id: String,
    pane_id: String,
    shell: String,
    cwd: String,
    startup_command: Option<String>,
    rows: u16,
    cols: u16,
    process_id: Option<u32>,
}

/// Membuat PTY session baru untuk pane tertentu.
#[tauri::command]
pub async fn pty_spawn(
    state: State<'_, AppState>,
    workspace_id: String,
    pane_id: String,
    shell: Option<String>,
    cwd: Option<String>,
    startup_command: Option<String>,
    rows: Option<u16>,
    cols: Option<u16>,
) -> Result<PtySessionInfo, String> {
    state
        .pty_manager
        .spawn_session(workspace_id, pane_id, shell, cwd, startup_command, rows, cols)
        .await
        .map(|session| PtySessionInfo {
            session_id: session.session_id,
            workspace_id: session.workspace_id,
            pane_id: session.pane_id,
            shell: session.shell,
            cwd: session.cwd,
            startup_command: session.startup_command,
            rows: session.rows,
            cols: session.cols,
            process_id: session.process_id,
        })
}

/// Menutup PTY session dan child process terkait.
#[tauri::command]
pub async fn pty_close(state: State<'_, AppState>, pane_id: String) -> Result<(), String> {
    state.pty_manager.close_session(&pane_id).await
}

/// Mengirim input teks ke PTY.
#[tauri::command]
pub async fn pty_write(
    state: State<'_, AppState>,
    pane_id: String,
    data: String,
) -> Result<(), String> {
    state.pty_manager.write_text(&pane_id, &data).await
}

/// Mengirim input biner ke PTY.
#[tauri::command]
pub async fn pty_write_binary(
    state: State<'_, AppState>,
    pane_id: String,
    data: Vec<u8>,
) -> Result<(), String> {
    state.pty_manager.write_binary(&pane_id, &data).await
}

/// Mengubah ukuran PTY saat pane di-resize.
#[tauri::command]
pub async fn pty_resize(
    state: State<'_, AppState>,
    pane_id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    state.pty_manager.resize_session(&pane_id, rows, cols).await
}

/// ACK dari frontend bahwa batch output sudah diproses.
#[tauri::command]
pub async fn pty_ack(state: State<'_, AppState>, pane_id: String) -> Result<(), String> {
    state.pty_manager.acknowledge_output(&pane_id).await
}

/// Restart shell untuk pane aktif dengan metadata session yang sama.
#[tauri::command]
pub async fn pty_restart(
    state: State<'_, AppState>,
    pane_id: String,
) -> Result<PtySessionInfo, String> {
    state
        .pty_manager
        .restart_session(&pane_id)
        .await
        .map(|session| PtySessionInfo {
            session_id: session.session_id,
            workspace_id: session.workspace_id,
            pane_id: session.pane_id,
            shell: session.shell,
            cwd: session.cwd,
            startup_command: session.startup_command,
            rows: session.rows,
            cols: session.cols,
            process_id: session.process_id,
        })
}
