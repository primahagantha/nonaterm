//! SQLite-backed keybind override + pane passthrough store.
//!
//! Schema: [`crate::state::schema::MIGRATION_V2`] menambah dua tabel:
//!   - `keybind_overrides` — `keybind_id` → `Combo` user-customized
//!   - `pane_passthrough`  — `pane_id` → `enabled_at` (presence = active)
//!
//! Store ini share koneksi dengan [`crate::state::StateManager`] —
//! lewat `&StateManager` agar reuse WAL mode + foreign keys.

use std::path::PathBuf;
use std::sync::Mutex;

use chrono::{DateTime, Utc};
use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::conflict::NormalizedCombo;

/// Satu row keybind override yang di-persist ke SQLite.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KeybindOverride {
    pub keybind_id: String,
    pub key: String,
    pub ctrl: bool,
    pub shift: bool,
    pub alt: bool,
    pub meta: bool,
    pub updated_at: DateTime<Utc>,
}

impl KeybindOverride {
    pub fn to_combo(&self) -> NormalizedCombo {
        NormalizedCombo {
            key: self.key.clone(),
            ctrl: self.ctrl,
            shift: self.shift,
            alt: self.alt,
            meta: self.meta,
        }
    }

    pub fn from_combo(id: &str, combo: &NormalizedCombo) -> Self {
        Self {
            keybind_id: id.to_string(),
            key: combo.key.clone(),
            ctrl: combo.ctrl,
            shift: combo.shift,
            alt: combo.alt,
            meta: combo.meta,
            updated_at: Utc::now(),
        }
    }
}

/// Row `pane_passthrough` table. `enabled_at` null = mode off, non-null = on.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PassthroughEntry {
    pub pane_id: String,
    pub enabled_at: DateTime<Utc>,
}

/// Thread-safe wrapper untuk SQLite keybind store.
///
/// Pemegang `Mutex<rusqlite::Connection>` (synchronous SQLite, simple).
/// Cukup karena semua call singkat — tidak ada long-running query.
/// Kalau nanti perlu concurrent read, bisa di-upgrade ke connection
/// pool via `r2d2_sqlite`.
pub struct KeybindStore {
    conn: Mutex<rusqlite::Connection>,
    #[allow(dead_code)]
    db_path: PathBuf,
}

impl KeybindStore {
    /// Build store dengan path ke `Nonaterm.db` (sama dengan yang
    /// dipakai [`crate::state::StateManager`]).
    pub fn new(db_path: PathBuf) -> Result<Self, String> {
        let conn = rusqlite::Connection::open(&db_path)
            .map_err(|error| format!("open keybind db {}: {error}", db_path.display()))?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
            .map_err(|error| error.to_string())?;
        // Migrations v1 + v2 (keybind_overrides + pane_passthrough)
        conn.execute_batch(crate::state::schema::MIGRATION_V1)
            .map_err(|error| format!("apply MIGRATION_V1: {error}"))?;
        conn.execute_batch(crate::state::schema::MIGRATION_V2)
            .map_err(|error| format!("apply MIGRATION_V2: {error}"))?;
        Ok(Self {
            conn: Mutex::new(conn),
            db_path,
        })
    }

    /// Build store dari koneksi yang sudah ada (dipakai di tests
    /// untuk share dengan StateManager). Aman — menjalankan migrations
    /// kalau belum dijalankan.
    #[cfg(test)]
    pub fn from_connection(conn: rusqlite::Connection) -> Self {
        // Apply migrations on the provided connection (idempotent).
        let _ = conn.execute_batch(crate::state::schema::MIGRATION_V1);
        let _ = conn.execute_batch(crate::state::schema::MIGRATION_V2);
        Self {
            conn: Mutex::new(conn),
            db_path: PathBuf::from(":memory:"),
        }
    }

    /// Mengambil semua override (id → KeybindOverride).
    pub fn get_overrides(&self) -> Result<Vec<KeybindOverride>, String> {
        let conn = self.conn.lock().expect("keybind store poisoned");
        let mut stmt = conn
            .prepare(
                "SELECT keybind_id, key_code, ctrl, shift, alt, meta, updated_at \
                 FROM keybind_overrides ORDER BY keybind_id ASC",
            )
            .map_err(|error| error.to_string())?;
        let rows: Vec<KeybindOverride> = stmt
            .query_map([], |row| {
                let updated_at_raw: String = row.get(6)?;
                let updated_at = DateTime::parse_from_rfc3339(&updated_at_raw)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now());
                Ok(KeybindOverride {
                    keybind_id: row.get(0)?,
                    key: row.get(1)?,
                    ctrl: row.get::<_, i64>(2)? != 0,
                    shift: row.get::<_, i64>(3)? != 0,
                    alt: row.get::<_, i64>(4)? != 0,
                    meta: row.get::<_, i64>(5)? != 0,
                    updated_at,
                })
            })
            .map_err(|error| error.to_string())?
            .collect::<Result<_, _>>()
            .map_err(|error| error.to_string())?;
        Ok(rows)
    }

    /// Upsert satu override. Mengembalikan row yang baru di-persist
    /// (dengan `updated_at` server-side).
    pub fn set_override(
        &self,
        keybind_id: &str,
        combo: &NormalizedCombo,
    ) -> Result<KeybindOverride, String> {
        if keybind_id.trim().is_empty() {
            return Err("keybind_id kosong".to_string());
        }
        let conn = self.conn.lock().expect("keybind store poisoned");
        conn.execute(
            "INSERT INTO keybind_overrides (keybind_id, key_code, ctrl, shift, alt, meta, updated_at) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) \
             ON CONFLICT(keybind_id) DO UPDATE SET \
                 key_code = excluded.key_code, \
                 ctrl = excluded.ctrl, \
                 shift = excluded.shift, \
                 alt = excluded.alt, \
                 meta = excluded.meta, \
                 updated_at = excluded.updated_at",
            params![
                keybind_id,
                combo.key,
                combo.ctrl as i64,
                combo.shift as i64,
                combo.alt as i64,
                combo.meta as i64,
                Utc::now().to_rfc3339(),
            ],
        )
        .map_err(|error| error.to_string())?;
        Ok(KeybindOverride::from_combo(keybind_id, combo))
    }

    /// Hapus satu override.
    pub fn clear_override(&self, keybind_id: &str) -> Result<bool, String> {
        let conn = self.conn.lock().expect("keybind store poisoned");
        let affected = conn
            .execute(
                "DELETE FROM keybind_overrides WHERE keybind_id = ?1",
                params![keybind_id],
            )
            .map_err(|error| error.to_string())?;
        Ok(affected > 0)
    }

    /// Hapus semua override (reset ke default).
    pub fn clear_all_overrides(&self) -> Result<usize, String> {
        let conn = self.conn.lock().expect("keybind store poisoned");
        let affected = conn
            .execute("DELETE FROM keybind_overrides", [])
            .map_err(|error| error.to_string())?;
        Ok(affected)
    }

    /// Ambil daftar pane yang sedang dalam passthrough mode.
    pub fn passthrough_list(&self) -> Result<Vec<PassthroughEntry>, String> {
        let conn = self.conn.lock().expect("keybind store poisoned");
        let mut stmt = conn
            .prepare("SELECT pane_id, enabled_at FROM pane_passthrough ORDER BY pane_id ASC")
            .map_err(|error| error.to_string())?;
        let rows: Vec<PassthroughEntry> = stmt
            .query_map([], |row| {
                let raw: String = row.get(1)?;
                let enabled_at = DateTime::parse_from_rfc3339(&raw)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now());
                Ok(PassthroughEntry {
                    pane_id: row.get(0)?,
                    enabled_at,
                })
            })
            .map_err(|error| error.to_string())?
            .collect::<Result<_, _>>()
            .map_err(|error| error.to_string())?;
        Ok(rows)
    }

    /// Toggle passthrough mode untuk satu pane. `true` = aktif,
    /// `false` = off (hapus row).
    pub fn set_passthrough(&self, pane_id: &str, enabled: bool) -> Result<(), String> {
        if pane_id.trim().is_empty() {
            return Err("pane_id kosong".to_string());
        }
        let conn = self.conn.lock().expect("keybind store poisoned");
        if enabled {
            conn.execute(
                "INSERT INTO pane_passthrough (pane_id, enabled_at) VALUES (?1, ?2) \
                 ON CONFLICT(pane_id) DO UPDATE SET enabled_at = excluded.enabled_at",
                params![pane_id, Utc::now().to_rfc3339()],
            )
            .map_err(|error| error.to_string())?;
        } else {
            conn.execute(
                "DELETE FROM pane_passthrough WHERE pane_id = ?1",
                params![pane_id],
            )
            .map_err(|error| error.to_string())?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn tmp_store() -> KeybindStore {
        let conn = Connection::open_in_memory().expect("memory db");
        KeybindStore::from_connection(conn)
    }

    #[test]
    fn migrations_create_keybind_tables() {
        let store = tmp_store();
        let conn = store.conn.lock().expect("poisoned");
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master \
                 WHERE type='table' AND name IN ('keybind_overrides','pane_passthrough')",
                [],
                |row| row.get(0),
            )
            .expect("query gagal");
        assert_eq!(count, 2, "kedua tabel harus tercipta");
    }

    #[test]
    fn set_and_get_override_roundtrips() {
        let store = tmp_store();
        let combo = NormalizedCombo::new("p", true, true, false, false);
        let saved = store
            .set_override("command_palette", &combo)
            .expect("set_override gagal");
        assert_eq!(saved.keybind_id, "command_palette");
        assert_eq!(saved.to_combo(), combo);

        let all = store.get_overrides().expect("get_overrides gagal");
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].to_combo(), combo);
    }

    #[test]
    fn set_override_upserts_existing() {
        let store = tmp_store();
        let combo1 = NormalizedCombo::new("p", true, true, false, false);
        let combo2 = NormalizedCombo::new(",", true, false, false, false);
        store.set_override("k1", &combo1).expect("first set");
        store.set_override("k1", &combo2).expect("second set");
        let all = store.get_overrides().expect("get");
        assert_eq!(all.len(), 1, "upsert tidak boleh insert kedua");
        assert_eq!(all[0].to_combo(), combo2);
    }

    #[test]
    fn clear_override_removes_row() {
        let store = tmp_store();
        let combo = NormalizedCombo::new("p", true, false, false, false);
        store.set_override("k1", &combo).expect("set");
        let removed = store.clear_override("k1").expect("clear");
        assert!(removed, "clear harus return true saat row ada");
        let all = store.get_overrides().expect("get");
        assert!(all.is_empty());
    }

    #[test]
    fn clear_override_returns_false_when_missing() {
        let store = tmp_store();
        let removed = store.clear_override("nope").expect("clear");
        assert!(!removed);
    }

    #[test]
    fn clear_all_overrides_wipes_table() {
        let store = tmp_store();
        for i in 0..5 {
            let combo = NormalizedCombo::new(&format!("k{i}"), true, false, false, false);
            store
                .set_override(&format!("binding-{i}"), &combo)
                .expect("set");
        }
        let cleared = store.clear_all_overrides().expect("clear_all");
        assert_eq!(cleared, 5);
        let all = store.get_overrides().expect("get");
        assert!(all.is_empty());
    }

    #[test]
    fn set_override_rejects_empty_id() {
        let store = tmp_store();
        let combo = NormalizedCombo::new("p", true, false, false, false);
        let result = store.set_override("   ", &combo);
        assert!(result.is_err());
    }

    #[test]
    fn passthrough_set_and_list() {
        let store = tmp_store();
        store.set_passthrough("pane-1", true).expect("on");
        store.set_passthrough("pane-2", true).expect("on");
        let list = store.passthrough_list().expect("list");
        assert_eq!(list.len(), 2);
        let ids: Vec<String> = list.iter().map(|e| e.pane_id.clone()).collect();
        assert!(ids.contains(&"pane-1".to_string()));
        assert!(ids.contains(&"pane-2".to_string()));
    }

    #[test]
    fn passthrough_off_removes_row() {
        let store = tmp_store();
        store.set_passthrough("pane-1", true).expect("on");
        store.set_passthrough("pane-1", false).expect("off");
        let list = store.passthrough_list().expect("list");
        assert!(list.is_empty());
    }

    #[test]
    fn passthrough_toggle_on_updates_timestamp() {
        let store = tmp_store();
        store.set_passthrough("pane-1", true).expect("first on");
        let first_ts = store
            .passthrough_list()
            .expect("list")
            .first()
            .map(|e| e.enabled_at)
            .expect("ada row");
        // sleep singkat untuk memastikan timestamp berbeda
        std::thread::sleep(std::time::Duration::from_millis(10));
        store.set_passthrough("pane-1", true).expect("second on");
        let second_ts = store
            .passthrough_list()
            .expect("list")
            .first()
            .map(|e| e.enabled_at)
            .expect("ada row");
        assert!(second_ts > first_ts, "timestamp harus update");
    }

    #[test]
    fn set_passthrough_rejects_empty_pane_id() {
        let store = tmp_store();
        assert!(store.set_passthrough("", true).is_err());
    }
}
