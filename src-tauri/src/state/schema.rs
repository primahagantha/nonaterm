//! Skema database SQLite dan migration untuk persistence workspace.

/// SQL migration awal: membuat tabel `workspaces`, `panes`, dan `app_state`.
///
/// - `workspaces` menyimpan metadata workspace.
/// - `panes` menyimpan pane terminal per workspace dengan foreign key cascade.
/// - `app_state` menyimpan key-value global (active workspace id, saved_at, dll).
pub const MIGRATION_V1: &str = "
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    accent_color TEXT NOT NULL,
    layout_preset TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS panes (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    cwd TEXT NOT NULL DEFAULT '',
    startup_command TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
";

/// SQL migration v2: keybind override + per-pane passthrough mode.
///
/// - `keybind_overrides` menyimpan custom combo user per keybind id.
///   Hanya override yang disimpan (default combos tetap hardcoded di
///   `KeybindRegistry` frontend). Saat boot, frontend baca SQLite dulu,
///   fallback ke localStorage jika SQLite kosong.
/// - `pane_passthrough` menyimpan daftar pane yang sedang dalam
///   passthrough mode (presence = active). Per PRD §17: toggle per
///   pane supaya TUI app (vim/opencode/tmux) di dalam pane itu
///   dapat kontrol penuh.
pub const MIGRATION_V2: &str = "
CREATE TABLE IF NOT EXISTS keybind_overrides (
    keybind_id TEXT PRIMARY KEY,
    key_code   TEXT NOT NULL,
    ctrl       INTEGER NOT NULL DEFAULT 0,
    shift      INTEGER NOT NULL DEFAULT 0,
    alt        INTEGER NOT NULL DEFAULT 0,
    meta       INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS pane_passthrough (
    pane_id    TEXT PRIMARY KEY,
    enabled_at TEXT NOT NULL DEFAULT (datetime('now'))
);
";

/// SQL migration v3: vault table for SSH credentials.
pub const MIGRATION_V3: &str = "
CREATE TABLE IF NOT EXISTS vault (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    group_name TEXT,
    tags TEXT,
    host TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 22,
    username TEXT NOT NULL,
    auth_type TEXT NOT NULL,
    agent_forwarding INTEGER NOT NULL DEFAULT 0,
    startup_command TEXT,
    proxy TEXT,
    theme_color TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
";

/// Menjalankan semua migration pada koneksi SQLite yang diberikan.
///
/// Idempoten: aman dipanggil berulang (pakai `CREATE TABLE IF NOT EXISTS`).
pub fn run_migrations(conn: &rusqlite::Connection) -> Result<(), String> {
    conn.execute_batch(MIGRATION_V1)
        .map_err(|error| error.to_string())?;
    conn.execute_batch(MIGRATION_V2)
        .map_err(|error| error.to_string())?;
    conn.execute_batch(MIGRATION_V3)
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn migrations_create_all_tables() {
        let conn = Connection::open_in_memory().expect("memory db");
        run_migrations(&conn).expect("migrations");
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master \
                 WHERE type='table' AND name IN \
                 ('workspaces','panes','app_state','keybind_overrides','pane_passthrough','vault')",
                [],
                |row| row.get(0),
            )
            .expect("query");
        assert_eq!(count, 6, "semua 6 tabel harus tercipta");
    }

    #[test]
    fn migrations_are_idempotent() {
        let conn = Connection::open_in_memory().expect("memory db");
        run_migrations(&conn).expect("first");
        run_migrations(&conn).expect("second idempotent");
    }
}
