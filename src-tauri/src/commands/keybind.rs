//! Tauri command IPC untuk keybind backend.
//!
//! Kontrak:
//! - `keybind_get_overrides()` → `Vec<KeybindOverride>` (semua override).
//! - `keybind_set_override(id, key, ctrl, shift, alt, meta)` →
//!   `{ override, conflicts }` — return row yang disimpan plus
//!   [`ConflictHint`] list supaya frontend bisa inline-warning
//!   user sebelum commit (per PRD §17).
//! - `keybind_clear_override(id)` → `bool` (true = ada row, false = tidak).
//! - `keybind_clear_all_overrides()` → `usize` (jumlah row dihapus).
//! - `keybind_check_conflict(key, ctrl, shift, alt, meta)` →
//!   `Vec<ConflictHint>` — dipakai FE untuk live preview saat
//!   user merekam combo baru.
//! - `pane_get_passthrough_list()` → `Vec<PassthroughEntry>`.
//! - `pane_set_passthrough(pane_id, enabled)` → `()`.

use serde::Serialize;
use tauri::State;

use crate::keybind::{
    check_combo_conflict, ConflictHint, KeybindOverride, KeybindStore, NormalizedCombo,
    PassthroughEntry,
};

/// Wrapper untuk hasil `keybind_set_override` — row yang disimpan +
/// hint konflik (kosong jika tidak ada konflik known).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SetOverrideResult {
    pub override_row: KeybindOverride,
    pub conflicts: Vec<ConflictHint>,
}

/// Mengambil semua keybind override dari SQLite.
///
/// Frontend panggil ini saat boot untuk hydrate
/// `KeybindRegistry.setOverrides()`. Return array kosong (bukan
/// error) jika belum ada override tersimpan.
#[tauri::command]
pub fn keybind_get_overrides(
    store: State<'_, KeybindStore>,
) -> Result<Vec<KeybindOverride>, String> {
    store.get_overrides()
}

/// Set satu override. Return row + conflict hints supaya FE bisa
/// show inline warning. FE tetap harus konfirmasi user (via UI
/// dialog "Tetap Pakai?") sebelum commit kalau ada conflict —
/// command ini TIDAK enforce, hanya kasih info.
#[tauri::command]
pub fn keybind_set_override(
    store: State<'_, KeybindStore>,
    keybind_id: String,
    key: String,
    ctrl: bool,
    shift: bool,
    alt: bool,
    meta: bool,
) -> Result<SetOverrideResult, String> {
    let combo = NormalizedCombo::new(&key, ctrl, shift, alt, meta);
    let conflicts = check_combo_conflict(&combo);
    let row = store.set_override(&keybind_id, &combo)?;
    Ok(SetOverrideResult {
        override_row: row,
        conflicts,
    })
}

/// Hapus satu override (reset binding ke default). Return true
/// kalau row ada dan dihapus, false kalau tidak ada.
#[tauri::command]
pub fn keybind_clear_override(
    store: State<'_, KeybindStore>,
    keybind_id: String,
) -> Result<bool, String> {
    store.clear_override(&keybind_id)
}

/// Hapus semua override. Return jumlah row yang dihapus.
#[tauri::command]
pub fn keybind_clear_all_overrides(
    store: State<'_, KeybindStore>,
) -> Result<usize, String> {
    store.clear_all_overrides()
}

/// Cek konflik untuk sebuah combo tanpa menyimpannya. Dipakai
/// FE saat user merekam combo baru untuk live preview warning.
#[tauri::command]
pub fn keybind_check_conflict(
    key: String,
    ctrl: bool,
    shift: bool,
    alt: bool,
    meta: bool,
) -> Result<Vec<ConflictHint>, String> {
    let combo = NormalizedCombo::new(&key, ctrl, shift, alt, meta);
    Ok(check_combo_conflict(&combo))
}

/// Ambil daftar pane yang sedang dalam passthrough mode.
#[tauri::command]
pub fn pane_get_passthrough_list(
    store: State<'_, KeybindStore>,
) -> Result<Vec<PassthroughEntry>, String> {
    store.passthrough_list()
}

/// Toggle passthrough mode untuk satu pane. `enabled = true` akan
/// insert/update row; `false` akan hapus row.
#[tauri::command]
pub fn pane_set_passthrough(
    store: State<'_, KeybindStore>,
    pane_id: String,
    enabled: bool,
) -> Result<(), String> {
    store.set_passthrough(&pane_id, enabled)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    /// Build a KeybindStore dari in-memory connection. Tidak pakai
    /// Tauri `State<>` karena Tauri runtime tidak ada di unit test.
    fn tmp_store() -> KeybindStore {
        let conn = Connection::open_in_memory().expect("memory db");
        KeybindStore::from_connection(conn)
    }

    #[test]
    fn set_override_returns_empty_conflicts_for_safe_combo() {
        // Ctrl+Shift+P = command palette (PRD default, aman).
        let store = tmp_store();
        let combo = NormalizedCombo::new("p", true, true, false, false);
        let conflicts = check_combo_conflict(&combo);
        assert!(conflicts.is_empty());
        let row = store.set_override("command_palette", &combo).expect("set");
        assert_eq!(row.to_combo(), combo);
    }

    #[test]
    fn set_override_detects_ctrl_p_conflict() {
        // Ctrl+P = readline previous history — pasti konflik.
        let store = tmp_store();
        let combo = NormalizedCombo::new("p", true, false, false, false);
        let conflicts = check_combo_conflict(&combo);
        assert!(!conflicts.is_empty());
        // Tetap simpan — FE yang enforce confirmation.
        store.set_override("custom_p", &combo).expect("set");
        let all = store.get_overrides().expect("get");
        assert_eq!(all.len(), 1);
    }

    #[test]
    fn passthrough_toggle_roundtrips() {
        let store = tmp_store();
        store.set_passthrough("pane-1", true).expect("on");
        let list = store.passthrough_list().expect("list");
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].pane_id, "pane-1");

        store.set_passthrough("pane-1", false).expect("off");
        let list = store.passthrough_list().expect("list");
        assert!(list.is_empty());
    }
}
