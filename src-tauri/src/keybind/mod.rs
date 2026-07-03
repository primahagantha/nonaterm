//! Backend keybind persistence + conflict detection (TDD 3.6).
//!
//! Layers (highest priority first):
//!   1. **Global Hotkey** (OS-level, only show/hide) — di luar scope
//!      modul ini. Ditangani oleh `tauri-plugin-global-shortcut`.
//!   2. **App-level shortcuts** (Alt+1..9, Ctrl+Shift+*) — didaftarkan
//!      lewat `KeybindRegistry` di frontend. Override combo user
//!      dipersist via [`KeybindStore`] ke SQLite.
//!   3. **Terminal passthrough** (default) — semua input lain
//!      diteruskan mentah ke PTY oleh [`crate::pty`].
//!
//! Modul ini TIDAK meniru `KeybindRegistry` frontend. Tugasnya cuma
//! dua hal yang butuh backend:
//!   1. **Persistence** — supaya override user tidak hilang saat
//!      localStorage di-clear atau saat sync antar device.
//!   2. **Conflict detection** — list common CLI/readline shortcuts
//!      yang akan bentrok dengan binding app-level. Saat user
//!      customize keybind lewat UI, backend tunjukin list konflik
//!      sebelum disimpan (PRD §17 "Conflict detector at customization").
//!
//! Per-pane passthrough mode juga dipersist di sini via tabel
//! `pane_passthrough` (sebelumnya hanya di localStorage frontend).

mod conflict;
mod store;

pub use conflict::{check_combo_conflict, combo_label, ConflictHint, NormalizedCombo};
pub use store::{KeybindOverride, KeybindStore, PassthroughEntry};
