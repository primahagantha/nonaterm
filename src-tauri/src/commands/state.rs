//! Commands domain state persistence dan crash recovery.

use std::fs;

use tauri::{AppHandle, State};

use crate::state::{ExportPayload, RecoveryStatus, StateSnapshot};
use crate::AppState;

/// Mengambil status recovery dari snapshot terakhir dan lockfile dirty shutdown.
#[tauri::command]
pub fn state_get_recovery_status(state: State<'_, AppState>) -> Result<RecoveryStatus, String> {
    state.state_manager.recovery_status()
}

/// Menyimpan snapshot workspace secara atomic untuk autosave.
///
/// Menulis ke SQLite (primary) dan JSON snapshot (fallback/mirror).
#[tauri::command]
pub fn state_save_snapshot(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    snapshot: StateSnapshot,
) -> Result<(), String> {
    state.state_manager.save_snapshot(&app_handle, snapshot)
}

/// Menghapus lockfile saat shutdown bersih.
#[tauri::command]
pub fn state_mark_clean_shutdown(state: State<'_, AppState>) -> Result<(), String> {
    state.state_manager.mark_clean_shutdown()
}

/// Menginisialisasi database SQLite persistence (jalankan migration).
///
/// Dipanggil dari frontend bootstrap (dan sudah dipanggil di setup hook).
#[tauri::command]
pub fn state_init_db(state: State<'_, AppState>) -> Result<(), String> {
    state.state_manager.init_db()
}

/// Mengekspor konfigurasi workspace sebagai JSON string (pretty-printed).
#[tauri::command]
pub fn state_export_config(state: State<'_, AppState>) -> Result<String, String> {
    let payload = state.state_manager.export_state()?;
    serde_json::to_string_pretty(&payload).map_err(|error| error.to_string())
}

/// Mengimpor konfigurasi workspace dari JSON string.
///
/// Memvalidasi struktur (harus memiliki array `workspaces`) lalu menyimpan
/// ke SQLite + JSON snapshot. Mengembalikan jumlah workspace yang diimpor.
#[tauri::command]
pub fn state_import_config(state: State<'_, AppState>, config: String) -> Result<usize, String> {
    let payload: ExportPayload =
        serde_json::from_str(&config).map_err(|error| format!("invalid config JSON: {error}"))?;
    state.state_manager.import_state(&payload)
}

/// Mengekspor konfigurasi workspace ke file pada path yang ditentukan user.
#[tauri::command]
pub fn state_export_to_file(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let payload = state.state_manager.export_state()?;
    let json = serde_json::to_string_pretty(&payload).map_err(|error| error.to_string())?;
    fs::write(&path, json).map_err(|error| format!("failed to write file: {error}"))
}

/// Membaca file konfigurasi workspace dari path dan mengimpornya.
#[tauri::command]
pub fn state_import_from_file(state: State<'_, AppState>, path: String) -> Result<usize, String> {
    let json =
        fs::read_to_string(&path).map_err(|error| format!("failed to read file: {error}"))?;
    let payload: ExportPayload =
        serde_json::from_str(&json).map_err(|error| format!("invalid config JSON: {error}"))?;
    state.state_manager.import_state(&payload)
}
