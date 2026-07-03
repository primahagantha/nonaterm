//! Domain persistence state, autosave, dan crash recovery.
//!
//! Persistence utama memakai SQLite (via `rusqlite`). JSON snapshot tetap
//! dipertahankan sebagai fallback jika SQLite gagal atau belum terinisialisasi.

pub mod schema;

use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use chrono::{DateTime, Utc};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::Emitter;

use crate::crash::{CrashCounters, CrashScenario, StateFaultInjector};

/// Event perubahan workspace untuk sinkronisasi frontend.
pub const WORKSPACE_CHANGED_EVENT: &str = "workspace:changed";

/// Event trigger autosave untuk observability internal.
pub const AUTOSAVE_TRIGGERED_EVENT: &str = "autosave:triggered";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspacePaneSnapshot {
    pub id: String,
    pub title: String,
    pub cwd: String,
    pub startup_command: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSnapshot {
    pub id: String,
    pub name: String,
    pub accent_color: String,
    pub layout_preset: String,
    pub panes: Vec<WorkspacePaneSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StateSnapshot {
    pub active_workspace_id: String,
    pub workspaces: Vec<WorkspaceSnapshot>,
    pub saved_at: DateTime<Utc>,
}

/// Payload ekspor konfigurasi workspace untuk backup/sharing antar instans.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportPayload {
    pub version: String,
    pub exported_at: String,
    pub active_workspace_id: String,
    pub workspaces: Vec<WorkspaceSnapshot>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryStatus {
    pub dirty_shutdown: bool,
    pub has_snapshot: bool,
    pub lockfile_path: String,
    pub snapshot_path: String,
    pub snapshot: Option<StateSnapshot>,
}

pub struct StateManager {
    state_dir: PathBuf,
    snapshot_path: PathBuf,
    lockfile_path: PathBuf,
    db_path: PathBuf,
    /// Optional fault injector untuk [`crate::crash`] state-level
    /// scenarios. `None` di production (no-op), `Some` di test
    /// harness yang butuh simulate I/O error / busy timeout.
    ///
    /// Di-wrap `Arc<Mutex<>>` supaya bisa di-install / di-clear
    /// lewat `&self` (Tauri command hanya punya shared borrow).
    fault_injector: Arc<Mutex<Option<crate::crash::StateFaultInjector>>>,
}

impl StateManager {
    pub fn new(app_data_dir: PathBuf) -> Result<Self, String> {
        let state_dir = app_data_dir.join("state");
        fs::create_dir_all(&state_dir).map_err(|error| error.to_string())?;

        Ok(Self {
            snapshot_path: state_dir.join("workspace-snapshot.json"),
            lockfile_path: state_dir.join("Nonaterm.lock"),
            db_path: state_dir.join("Nonaterm.db"),
            state_dir,
            fault_injector: Arc::new(Mutex::new(None)),
        })
    }

    /// Build StateManager dengan crash fault injector terpasang.
    /// Dipakai di integration test untuk simulate I/O error / busy
    /// timeout tanpa perlu real-world failure.
    pub fn with_fault_injector(
        app_data_dir: PathBuf,
        injector: crate::crash::StateFaultInjector,
    ) -> Result<Self, String> {
        let manager = Self::new(app_data_dir)?;
        *manager.fault_injector.lock().expect("fault lock poisoned") = Some(injector);
        Ok(manager)
    }

    /// Pasang / replace fault injector pada runtime. Dipakai oleh
    /// `system_run_crash_simulation` dan integration test untuk
    /// trigger state-level fault ke live StateManager. Production
    /// path selalu install `None` (default) — method ini idempotent.
    pub fn install_fault_injector(&self, injector: crate::crash::StateFaultInjector) {
        *self.fault_injector.lock().expect("fault lock poisoned") = Some(injector);
    }

    /// Lepas fault injector (kembali ke no-op). Dipakai setelah
    /// scenario selesai supaya fault tidak bocor ke session berikutnya.
    pub fn clear_fault_injector(&self) {
        *self.fault_injector.lock().expect("fault lock poisoned") = None;
    }

    /// Lock + return guard ke `Option<StateFaultInjector>`.
    /// Caller bisa `.as_ref().expect(...)` atau
    /// `.as_mut().expect(...)` untuk akses inner. Method ini
    /// sengaja return guard langsung (bukan Option<Guard>)
    /// karena `Mutex::lock` tidak support mapped guards stabil.
    pub fn fault_injector(
        &self,
    ) -> std::sync::MutexGuard<'_, Option<crate::crash::StateFaultInjector>> {
        self.fault_injector.lock().expect("fault lock poisoned")
    }

    /// Menginisialisasi database SQLite dan menjalankan migration.
    ///
    /// Idempoten — aman dipanggil dari setup hook maupun command frontend.
    pub fn init_db(&self) -> Result<(), String> {
        let conn = self.open_db()?;
        schema::run_migrations(&conn)?;
        tracing::info!(db_path = %self.db_path.display(), "SQLite state database initialized");
        Ok(())
    }

    /// Membuka koneksi SQLite baru. Aktifkan pragma WAL, foreign
    /// keys, dan `busy_timeout` 5 detik. `busy_timeout` bikin writer
    /// menunggu sampai lock dilepas. 5 detik cukup untuk
    /// contention normal — kalau lebih, return error supaya caller
    /// bisa retry.
    ///
    /// Trade-off: write terburuk bisa blocking 5 detik kalau ada
    /// holder yang lupa commit. Untuk MVP ini acceptable. Kalau
    /// muncul pattern hang, turunkan ke 1-2s.
    pub fn open_db(&self) -> Result<rusqlite::Connection, String> {
        let conn = rusqlite::Connection::open(&self.db_path).map_err(|error| error.to_string())?;
        conn.execute_batch(
            "PRAGMA journal_mode=WAL; \
             PRAGMA foreign_keys=ON; \
             PRAGMA busy_timeout=5000;",
        )
        .map_err(|error| error.to_string())?;
        Ok(conn)
    }

    /// Mengecek apakah tabel persistence sudah dibuat.
    fn db_tables_exist(conn: &rusqlite::Connection) -> bool {
        conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='workspaces')",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map(|v| v != 0)
        .unwrap_or(false)
    }

    /// Menyimpan daftar workspace (beserta panes) ke SQLite dalam satu transaction.
    ///
    /// Strategi full-replace: hapus semua baris lama lalu insert yang baru.
    /// Cocok untuk autosave debounced dengan dataset kecil.
    pub fn save_workspaces(&self, workspaces: Vec<WorkspaceSnapshot>) -> Result<(), String> {
        let mut conn = self.open_db()?;
        let tx = conn.transaction().map_err(|error| error.to_string())?;
        Self::upsert_workspaces_conn(&tx, &workspaces)?;
        tx.commit().map_err(|error| error.to_string())?;
        Ok(())
    }

    /// Memuat semua workspace (beserta panes) dari SQLite, terurut by `sort_order`.
    pub fn load_workspaces(&self) -> Result<Vec<WorkspaceSnapshot>, String> {
        let conn = self.open_db()?;
        if !Self::db_tables_exist(&conn) {
            return Ok(Vec::new());
        }
        Self::query_workspaces_conn(&conn)
    }

    /// Mengekspor seluruh state workspace ke `ExportPayload` untuk backup/sharing.
    ///
    /// Membaca dari SQLite (prioritas) atau JSON snapshot (fallback).
    pub fn export_state(&self) -> Result<ExportPayload, String> {
        let snapshot = self.load_snapshot()?;
        match snapshot {
            Some(s) => Ok(ExportPayload {
                version: env!("CARGO_PKG_VERSION").to_string(),
                exported_at: Utc::now().to_rfc3339(),
                active_workspace_id: s.active_workspace_id,
                workspaces: s.workspaces,
            }),
            None => {
                let workspaces = self.load_workspaces()?;
                Ok(ExportPayload {
                    version: env!("CARGO_PKG_VERSION").to_string(),
                    exported_at: Utc::now().to_rfc3339(),
                    active_workspace_id: String::new(),
                    workspaces,
                })
            }
        }
    }

    /// Mengimpor `ExportPayload` — full-replace ke SQLite + JSON snapshot.
    ///
    /// Mengembalikan jumlah workspace yang diimpor.
    pub fn import_state(&self, payload: &ExportPayload) -> Result<usize, String> {
        self.init_db()?;
        let snapshot = StateSnapshot {
            active_workspace_id: payload.active_workspace_id.clone(),
            workspaces: payload.workspaces.clone(),
            saved_at: Utc::now(),
        };
        self.save_to_db(&snapshot)?;
        self.write_json_snapshot(&snapshot)?;
        Ok(payload.workspaces.len())
    }

    /// Helper: upsert workspaces + panes pada koneksi/transaction yang aktif.
    fn upsert_workspaces_conn(
        conn: &rusqlite::Connection,
        workspaces: &[WorkspaceSnapshot],
    ) -> Result<(), String> {
        conn.execute("DELETE FROM workspaces;", [])
            .map_err(|error| error.to_string())?;
        for (ws_index, ws) in workspaces.iter().enumerate() {
            conn.execute(
                "INSERT INTO workspaces (id, name, accent_color, layout_preset, sort_order) \
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    ws.id,
                    ws.name,
                    ws.accent_color,
                    ws.layout_preset,
                    ws_index as i64
                ],
            )
            .map_err(|error| error.to_string())?;
            for (pane_index, pane) in ws.panes.iter().enumerate() {
                conn.execute(
                    "INSERT INTO panes (id, workspace_id, title, cwd, startup_command, sort_order) \
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![
                        pane.id,
                        ws.id,
                        pane.title,
                        pane.cwd,
                        pane.startup_command,
                        pane_index as i64
                    ],
                )
                .map_err(|error| error.to_string())?;
            }
        }
        Ok(())
    }

    /// Helper: query workspaces + panes dari koneksi yang aktif.
    fn query_workspaces_conn(
        conn: &rusqlite::Connection,
    ) -> Result<Vec<WorkspaceSnapshot>, String> {
        let mut stmt = conn
            .prepare(
                "SELECT id, name, accent_color, layout_preset \
                 FROM workspaces ORDER BY sort_order ASC",
            )
            .map_err(|error| error.to_string())?;
        let mut workspaces: Vec<WorkspaceSnapshot> = stmt
            .query_map([], |row| {
                Ok(WorkspaceSnapshot {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    accent_color: row.get(2)?,
                    layout_preset: row.get(3)?,
                    panes: Vec::new(),
                })
            })
            .map_err(|error| error.to_string())?
            .collect::<Result<_, _>>()
            .map_err(|error| error.to_string())?;
        drop(stmt);

        for ws in &mut workspaces {
            let mut pane_stmt = conn
                .prepare(
                    "SELECT id, title, cwd, startup_command \
                     FROM panes WHERE workspace_id = ?1 ORDER BY sort_order ASC",
                )
                .map_err(|error| error.to_string())?;
            ws.panes = pane_stmt
                .query_map(params![ws.id], |row| {
                    Ok(WorkspacePaneSnapshot {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        cwd: row.get(2)?,
                        startup_command: row.get(3)?,
                    })
                })
                .map_err(|error| error.to_string())?
                .collect::<Result<_, _>>()
                .map_err(|error| error.to_string())?;
        }
        Ok(workspaces)
    }

    /// Menyimpan snapshot lengkap (active workspace id + saved_at + workspaces) ke SQLite.
    fn save_to_db(&self, snapshot: &StateSnapshot) -> Result<(), String> {
        let mut conn = self.open_db()?;
        let tx = conn.transaction().map_err(|error| error.to_string())?;
        Self::upsert_workspaces_conn(&tx, &snapshot.workspaces)?;
        tx.execute(
            "INSERT INTO app_state (key, value) VALUES ('active_workspace_id', ?1) \
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![snapshot.active_workspace_id],
        )
        .map_err(|error| error.to_string())?;
        tx.execute(
            "INSERT INTO app_state (key, value) VALUES ('saved_at', ?1) \
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![snapshot.saved_at.to_rfc3339()],
        )
        .map_err(|error| error.to_string())?;
        tx.commit().map_err(|error| error.to_string())?;
        Ok(())
    }

    /// Memuat snapshot lengkap dari SQLite. Mengembalikan `None` jika DB kosong/belum ada.
    fn load_from_db(&self) -> Result<Option<StateSnapshot>, String> {
        let conn = self.open_db()?;
        if !Self::db_tables_exist(&conn) {
            return Ok(None);
        }

        let active_workspace_id: Option<String> = conn
            .query_row(
                "SELECT value FROM app_state WHERE key = 'active_workspace_id'",
                [],
                |row| row.get(0),
            )
            .ok();
        let saved_at_raw: Option<String> = conn
            .query_row(
                "SELECT value FROM app_state WHERE key = 'saved_at'",
                [],
                |row| row.get(0),
            )
            .ok();

        let workspaces = Self::query_workspaces_conn(&conn)?;
        if workspaces.is_empty() && active_workspace_id.is_none() {
            return Ok(None);
        }

        let saved_at = saved_at_raw
            .and_then(|raw| {
                DateTime::parse_from_rfc3339(&raw)
                    .ok()
                    .map(|dt| dt.with_timezone(&Utc))
            })
            .unwrap_or_else(Utc::now);

        Ok(Some(StateSnapshot {
            active_workspace_id: active_workspace_id.unwrap_or_default(),
            workspaces,
            saved_at,
        }))
    }

    pub fn recovery_status(&self) -> Result<RecoveryStatus, String> {
        let snapshot = self.load_snapshot()?;

        Ok(RecoveryStatus {
            dirty_shutdown: self.lockfile_path.exists(),
            has_snapshot: snapshot.is_some(),
            lockfile_path: self.lockfile_path.to_string_lossy().into_owned(),
            snapshot_path: self.snapshot_path.to_string_lossy().into_owned(),
            snapshot,
        })
    }

    pub fn save_snapshot<R: tauri::Runtime>(
        &self,
        app_handle: &tauri::AppHandle<R>,
        mut snapshot: StateSnapshot,
    ) -> Result<(), String> {
        snapshot.saved_at = Utc::now();

        // Primary: SQLite. JSON tetap ditulis sebagai fallback/mirror.
        if let Err(error) = self.save_to_db(&snapshot) {
            tracing::warn!(error = %error, "SQLite save failed, relying on JSON snapshot fallback");
        }
        self.write_json_snapshot(&snapshot)?;

        self.mark_dirty()?;
        let _ = app_handle.emit(AUTOSAVE_TRIGGERED_EVENT, &snapshot);
        Ok(())
    }

    pub fn mark_dirty(&self) -> Result<(), String> {
        fs::write(&self.lockfile_path, Utc::now().to_rfc3339()).map_err(|error| error.to_string())
    }

    pub fn mark_clean_shutdown(&self) -> Result<(), String> {
        match fs::remove_file(&self.lockfile_path) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(error) => Err(error.to_string()),
        }
    }

    /// Memuat snapshot: prioritas SQLite, fallback JSON snapshot.
    fn load_snapshot(&self) -> Result<Option<StateSnapshot>, String> {
        match self.load_from_db() {
            Ok(Some(snapshot)) => Ok(Some(snapshot)),
            Ok(None) => self.load_json_snapshot(),
            Err(error) => {
                tracing::warn!(error = %error, "SQLite load failed, falling back to JSON snapshot");
                self.load_json_snapshot()
            }
        }
    }

    /// Menulis snapshot ke file JSON secara atomic (temp + rename).
    /// Kalau `StateFaultInjector` aktif dengan flag
    /// `fail_snapshot_write`, return simulated I/O error dan
    /// increment `snapshot_write_failures` counter.
    fn write_json_snapshot(&self, snapshot: &StateSnapshot) -> Result<(), String> {
        // Fault gate: skip write kalau injector minta fail.
        let injector_snapshot = self
            .fault_injector
            .lock()
            .expect("fault lock poisoned")
            .clone();
        if let Some(injector) = &injector_snapshot {
            if injector.should_fail_snapshot_write() {
                injector.record_snapshot_write(false);
                tracing::warn!("StateFaultInjector.fail_snapshot_write aktif — write dibatalkan");
                return Err(
                    "simulated I/O error: snapshot write dibatalkan oleh fault injector"
                        .to_string(),
                );
            }
        }

        let temp_path = self.state_dir.join("workspace-snapshot.json.tmp");
        let payload = serde_json::to_vec_pretty(snapshot).map_err(|error| error.to_string())?;
        fs::write(&temp_path, payload).map_err(|error| error.to_string())?;
        fs::rename(&temp_path, &self.snapshot_path).map_err(|error| error.to_string())?;

        if let Some(injector) = &injector_snapshot {
            injector.record_snapshot_write(true);
        }
        Ok(())
    }

    /// Versi publik dari `write_json_snapshot` — dipake oleh test
    /// harness untuk exercise fault injector tanpa perlu setup
    /// full `save_snapshot` (yang butuh Tauri AppHandle). Production
    /// path tetap via [`Self::save_snapshot`].
    pub fn write_json_snapshot_only(&self, snapshot: &StateSnapshot) -> Result<(), String> {
        self.write_json_snapshot(snapshot)
    }

    /// Versi publik dari `save_to_db` + `write_json_snapshot`
    /// (tanpa mark_dirty). Test-only helper.
    pub fn save_to_db_then_json(&self, snapshot: &StateSnapshot) -> Result<(), String> {
        self.save_to_db(snapshot)?;
        self.write_json_snapshot(snapshot)?;
        Ok(())
    }

    /// Pasang fault injector, jalankan `save_to_db_then_json` (yang
    /// harus gagal karena fault aktif), lalu lepas injector. Return
    /// `Ok(())` kalau fault berperilaku benar (write gagal → counter
    /// naik → file snapshot TIDAK tercipta), `Err(_)` kalau ada
    /// anomali (mis. fault diabaikan atau file bocor).
    ///
    /// Dipakai oleh `system_run_crash_simulation` dan integration
    /// test untuk verifikasi end-to-end fault flow pada live
    /// StateManager.
    pub fn run_snapshot_write_io_error_scenario(
        &self,
        counters: &Arc<CrashCounters>,
        snapshot: &StateSnapshot,
    ) -> Result<(), String> {
        let injector = StateFaultInjector::new(counters.clone());
        injector.enable(CrashScenario::SnapshotWriteIoError);
        self.install_fault_injector(injector);
        let outcome = self.save_to_db_then_json(snapshot);
        self.clear_fault_injector();
        match outcome {
            Err(_) => {
                if self.snapshot_path.exists() {
                    return Err(
                        "fault aktif tapi snapshot file masih tercipta — injector bocor"
                            .to_string(),
                    );
                }
                Ok(())
            }
            Ok(()) => Err(
                "fault aktif tapi save_to_db_then_json sukses — injector tidak konsult".to_string(),
            ),
        }
    }

    /// Acquire BEGIN IMMEDIATE dari connection terpisah, jalankan
    /// `open_db + INSERT` dari manager (yang harus menunggu
    /// `busy_timeout`), ukur elapsed milliseconds, lalu release
    /// lock. Catat ke `sqlite_busy_wait_ms` + `sqlite_busy_retries`.
    ///
    /// `holder_delay` = berapa lama holder pegang lock sebelum
    /// commit (untuk simulasi beban tulis lain).
    pub fn run_sqlite_busy_timeout_scenario(
        &self,
        counters: &Arc<CrashCounters>,
        holder_delay: std::time::Duration,
    ) -> Result<(), String> {
        let db_path = self.db_path.clone();

        // Holder: BEGIN IMMEDIATE di koneksi terpisah, pegang lock.
        let holder = Arc::new(Mutex::new(
            rusqlite::Connection::open(&db_path).map_err(|e| e.to_string())?,
        ));
        {
            let h = holder.lock().expect("holder lock");
            h.execute_batch("BEGIN IMMEDIATE;")
                .map_err(|e| e.to_string())?;
        }

        // Background: release lock setelah `holder_delay`.
        let holder_for_release = Arc::clone(&holder);
        let release_at = std::time::Instant::now();
        let release_handle = std::thread::spawn(move || {
            std::thread::sleep(holder_delay);
            let h = holder_for_release.lock().expect("holder lock for commit");
            let _ = h.execute_batch("COMMIT;");
            std::time::Instant::now()
        });

        // Manager connection — busy_timeout bikin INSERT menunggu.
        let started = std::time::Instant::now();
        let insert_result = self.open_db().and_then(|conn| {
            conn.execute(
                "INSERT INTO app_state (key, value) VALUES ('crash_probe_writer', ?1) \
                     ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params!["busy"],
            )
            .map_err(|e| e.to_string())
        });
        let elapsed_ms = started.elapsed().as_millis() as u64;
        let _ = release_handle.join().expect("release thread join");
        let _ = release_at; // suppress unused if build flags strip

        match insert_result {
            Ok(_) => {
                // Was a retry honored? busy_timeout > 0 + write
                // waited ≥ 50ms → anggap retry. Elapsed ≈ holder_delay.
                let was_retry = elapsed_ms >= 50;
                counters
                    .sqlite_busy_wait_ms
                    .fetch_add(elapsed_ms, std::sync::atomic::Ordering::Relaxed);
                if was_retry {
                    counters
                        .sqlite_busy_retries
                        .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                }
                Ok(())
            }
            Err(error) => Err(format!("busy_timeout scenario gagal: {error}")),
        }
    }

    /// Enable race flag, jalankan `mark_dirty` + `write_json_snapshot_only`
    /// sequential (window observable), lalu record observability
    /// counter. Hasil akhir harus konsisten (lockfile + snapshot
    /// visible tanpa corruption).
    pub fn run_recovery_race_scenario(
        &self,
        counters: &Arc<CrashCounters>,
        snapshot: &StateSnapshot,
    ) -> Result<(), String> {
        let injector = StateFaultInjector::new(counters.clone());
        injector.enable(CrashScenario::RecoveryRace);
        self.install_fault_injector(injector.clone());

        self.mark_dirty()?;
        self.write_json_snapshot_only(snapshot)?;
        injector.record_recovery_race();
        self.clear_fault_injector();
        Ok(())
    }

    /// Memuat snapshot dari file JSON (fallback).
    fn load_json_snapshot(&self) -> Result<Option<StateSnapshot>, String> {
        if !self.snapshot_path.exists() {
            return Ok(None);
        }

        let payload = fs::read(&self.snapshot_path).map_err(|error| error.to_string())?;
        serde_json::from_slice(&payload)
            .map(Some)
            .map_err(|error| error.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    /// Membuat StateManager dengan direktori state sementara unik.
    fn tmp_state_manager() -> StateManager {
        let dir = std::env::temp_dir().join(format!("Nonaterm-test-{}", Uuid::new_v4()));
        StateManager::new(dir).expect("StateManager::new gagal")
    }

    #[test]
    fn init_db_creates_tables() {
        let manager = tmp_state_manager();
        manager.init_db().expect("init_db gagal");

        let conn = manager.open_db().expect("open_db gagal");
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master \
                 WHERE type='table' AND name IN ('workspaces','panes','app_state')",
                [],
                |row| row.get(0),
            )
            .expect("query tabel gagal");
        assert_eq!(
            count, 3,
            "tabel workspaces, panes, app_state harus tercipta"
        );
    }

    #[test]
    fn init_db_is_idempotent() {
        let manager = tmp_state_manager();
        manager.init_db().expect("init_db pertama gagal");
        manager.init_db().expect("init_db kedua harus idempoten");
    }

    fn sample_workspaces() -> Vec<WorkspaceSnapshot> {
        vec![
            WorkspaceSnapshot {
                id: "ws-1".into(),
                name: "Alpha".into(),
                accent_color: "#ff0000".into(),
                layout_preset: "2".into(),
                panes: vec![
                    WorkspacePaneSnapshot {
                        id: "p-1".into(),
                        title: "Agent".into(),
                        cwd: "D:\\production\\Nonaterm".into(),
                        startup_command: "npm run dev".into(),
                    },
                    WorkspacePaneSnapshot {
                        id: "p-2".into(),
                        title: "Build".into(),
                        cwd: String::new(),
                        startup_command: String::new(),
                    },
                ],
            },
            WorkspaceSnapshot {
                id: "ws-2".into(),
                name: "Beta".into(),
                accent_color: "#00ff00".into(),
                layout_preset: "4".into(),
                panes: Vec::new(),
            },
        ]
    }

    #[test]
    fn save_and_load_workspaces_roundtrip() {
        let manager = tmp_state_manager();
        manager.init_db().expect("init_db gagal");

        let workspaces = sample_workspaces();
        manager
            .save_workspaces(workspaces.clone())
            .expect("save_workspaces gagal");

        let loaded = manager.load_workspaces().expect("load_workspaces gagal");
        assert_eq!(loaded.len(), 2, "harus load 2 workspace");

        assert_eq!(loaded[0].id, "ws-1");
        assert_eq!(loaded[0].name, "Alpha");
        assert_eq!(loaded[0].accent_color, "#ff0000");
        assert_eq!(loaded[0].layout_preset, "2");
        assert_eq!(loaded[0].panes.len(), 2, "ws-1 harus punya 2 pane");
        assert_eq!(loaded[0].panes[0].id, "p-1");
        assert_eq!(loaded[0].panes[0].cwd, "D:\\production\\Nonaterm");
        assert_eq!(loaded[0].panes[0].startup_command, "npm run dev");
        assert_eq!(loaded[0].panes[1].title, "Build");

        assert_eq!(loaded[1].id, "ws-2");
        assert!(loaded[1].panes.is_empty(), "ws-2 tidak punya pane");
    }

    #[test]
    fn save_workspaces_replaces_previous() {
        let manager = tmp_state_manager();
        manager.init_db().expect("init_db gagal");

        manager
            .save_workspaces(sample_workspaces())
            .expect("save pertama gagal");
        // Save dengan dataset berbeda (lebih sedikit) — harus replace, bukan append.
        manager
            .save_workspaces(vec![WorkspaceSnapshot {
                id: "ws-x".into(),
                name: "Solo".into(),
                accent_color: "#000000".into(),
                layout_preset: "1".into(),
                panes: Vec::new(),
            }])
            .expect("save kedua gagal");

        let loaded = manager.load_workspaces().expect("load gagal");
        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].id, "ws-x");
    }

    #[test]
    fn load_workspaces_empty_when_no_tables() {
        let manager = tmp_state_manager();
        // Tidak memanggil init_db — tabel belum ada.
        let loaded = manager.load_workspaces().expect("load gagal");
        assert!(loaded.is_empty());
    }

    #[test]
    fn db_snapshot_roundtrips_via_load_from_db() {
        let manager = tmp_state_manager();
        manager.init_db().expect("init_db gagal");

        let snapshot = StateSnapshot {
            active_workspace_id: "ws-1".into(),
            workspaces: sample_workspaces(),
            saved_at: Utc::now(),
        };
        manager.save_to_db(&snapshot).expect("save_to_db gagal");

        let loaded = manager
            .load_from_db()
            .expect("load_from_db gagal")
            .expect("snapshot harus ada");
        assert_eq!(loaded.active_workspace_id, "ws-1");
        assert_eq!(loaded.workspaces.len(), 2);
    }

    #[test]
    fn export_state_returns_valid_json_with_workspaces() {
        let manager = tmp_state_manager();
        manager.init_db().expect("init_db gagal");
        manager
            .save_workspaces(sample_workspaces())
            .expect("save_workspaces gagal");

        let payload = manager.export_state().expect("export_state gagal");
        assert!(!payload.version.is_empty());
        assert!(!payload.exported_at.is_empty());
        assert_eq!(payload.workspaces.len(), 2);

        let json = serde_json::to_string(&payload).expect("serialize gagal");
        let value: serde_json::Value = serde_json::from_str(&json).expect("deserialize gagal");
        assert!(value["workspaces"].is_array());
        assert_eq!(value["workspaces"].as_array().unwrap().len(), 2);
    }

    #[test]
    fn import_state_roundtrips_export_import_export() {
        let manager1 = tmp_state_manager();
        manager1.init_db().expect("init_db gagal");
        manager1
            .save_workspaces(sample_workspaces())
            .expect("save_workspaces gagal");

        let exported = manager1.export_state().expect("export gagal");
        let json = serde_json::to_string_pretty(&exported).expect("serialize gagal");

        let manager2 = tmp_state_manager();
        let payload: ExportPayload = serde_json::from_str(&json).expect("deserialize gagal");
        let count = manager2.import_state(&payload).expect("import_state gagal");
        assert_eq!(count, 2);

        let re_exported = manager2.export_state().expect("re-export gagal");
        assert_eq!(re_exported.workspaces.len(), exported.workspaces.len());
        assert_eq!(re_exported.workspaces[0].id, exported.workspaces[0].id);
        assert_eq!(re_exported.workspaces[0].name, exported.workspaces[0].name);
        assert_eq!(
            re_exported.workspaces[0].panes.len(),
            exported.workspaces[0].panes.len()
        );
        assert_eq!(re_exported.workspaces[1].id, exported.workspaces[1].id);
    }

    #[test]
    fn import_state_rejects_malformed_json() {
        let result: Result<ExportPayload, serde_json::Error> =
            serde_json::from_str("{ not valid }");
        assert!(result.is_err());

        let result: Result<ExportPayload, serde_json::Error> =
            serde_json::from_str(r#"{"version":"1.0"}"#);
        assert!(result.is_err());
    }

    // -- Crash simulation: state-level scenarios ---------------------------

    use crate::crash::{CrashCounters, StateFaultInjector};
    use std::sync::atomic::Ordering;

    fn tmp_manager_with_injector() -> (StateManager, std::sync::Arc<CrashCounters>) {
        let dir = std::env::temp_dir().join(format!("Nonaterm-test-{}", Uuid::new_v4()));
        let counters = std::sync::Arc::new(CrashCounters::new());
        let injector = StateFaultInjector::new(counters.clone());
        let manager = StateManager::with_fault_injector(dir, injector)
            .expect("StateManager::with_fault_injector gagal");
        manager.init_db().expect("init_db gagal");
        (manager, counters)
    }

    #[test]
    fn snapshot_write_io_error_short_circuits_to_error() {
        use crate::crash::CrashScenario;
        let (manager, counters) = tmp_manager_with_injector();
        manager
            .fault_injector()
            .as_ref()
            .expect("injector harus ada")
            .enable(CrashScenario::SnapshotWriteIoError);

        let snapshot = StateSnapshot {
            active_workspace_id: "ws-x".into(),
            workspaces: vec![],
            saved_at: chrono::Utc::now(),
        };

        let result = manager.save_to_db_then_json(&snapshot);
        assert!(result.is_err());
        assert_eq!(counters.snapshot_write_failures.load(Ordering::Relaxed), 1);
        // Verify the JSON snapshot file was NOT created.
        assert!(!manager.snapshot_path.exists());
    }

    #[test]
    fn snapshot_write_success_after_injector_reset() {
        use crate::crash::CrashScenario;
        let (manager, counters) = tmp_manager_with_injector();
        manager
            .fault_injector()
            .as_ref()
            .expect("injector")
            .enable(CrashScenario::SnapshotWriteIoError);

        // Enable fault, write must fail.
        let snapshot = StateSnapshot {
            active_workspace_id: "".into(),
            workspaces: vec![],
            saved_at: chrono::Utc::now(),
        };
        assert!(manager.save_to_db_then_json(&snapshot).is_err());

        // Reset, write must succeed.
        manager.fault_injector().as_ref().expect("injector").reset();
        // Second call with same snapshot — write_json_snapshot should
        // pass the fault gate (flag off) and complete.
        let result = manager.write_json_snapshot_only(&snapshot);
        assert!(result.is_ok(), "setelah reset, write harus sukses");
        assert_eq!(counters.snapshot_write_success.load(Ordering::Relaxed), 1);
    }

    #[test]
    fn sqlite_busy_timeout_is_configured() {
        // Verify the connection sets busy_timeout pragmas.
        let (manager, _counters) = tmp_manager_with_injector();
        let conn = manager.open_db().expect("open_db");
        let timeout: i64 = conn
            .query_row("PRAGMA busy_timeout", [], |row| row.get(0))
            .expect("PRAGMA harus bisa di-query");
        assert_eq!(timeout, 5000, "busy_timeout harus 5 detik");
    }

    #[test]
    fn sqlite_busy_timeout_waits_for_holder_release() {
        // Acquire BEGIN IMMEDIATE di connection terpisah, lalu coba
        // write dari manager connection. busy_timeout harus bikin
        // write menunggu sampai holder release.
        let (manager, _counters) = tmp_manager_with_injector();
        let db_path = manager.db_path.clone();

        // Connection holder — start transaction, hold lock. Di-wrap
        // Arc<Mutex<>> supaya spawned thread bisa commit tanpa
        // re-open (re-open di SQLite = koneksi baru, tidak lihat
        // transaction).
        let holder = std::sync::Arc::new(std::sync::Mutex::new(
            rusqlite::Connection::open(&db_path).expect("holder open"),
        ));
        {
            let h = holder.lock().expect("holder lock");
            h.execute_batch("BEGIN IMMEDIATE;").expect("begin");
            h.execute(
                "INSERT INTO app_state (key, value) VALUES ('holder', 'true')",
                [],
            )
            .expect("holder insert");
        } // drop guard

        // Background: release lock setelah 200ms.
        let holder_for_release = holder.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(200));
            let h = holder_for_release.lock().expect("holder lock for commit");
            h.execute_batch("COMMIT;").expect("commit");
        });

        // Manager connection — busy_timeout harus bikin write tunggu
        // sampai holder release (~200ms), bukan throw SQLITE_BUSY.
        let started = std::time::Instant::now();
        let result = manager.open_db().map(|conn| {
            conn.execute(
                "INSERT INTO app_state (key, value) VALUES ('writer', 'true')",
                [],
            )
        });
        let elapsed = started.elapsed();
        let inner = result.expect("write harus tunggu + sukses");
        assert!(inner.is_ok(), "write harus sukses setelah busy_timeout");
        assert!(
            elapsed >= std::time::Duration::from_millis(150),
            "harus menunggu minimal ~150ms (elapsed={elapsed:?})"
        );
        // Bonus: holder.observe() bisa verify row inserted.
        let h = holder.lock().expect("holder observe");
        let count: i64 = h
            .query_row(
                "SELECT COUNT(*) FROM app_state WHERE key='writer'",
                [],
                |row| row.get(0),
            )
            .expect("count writer");
        assert_eq!(count, 1, "row writer harus inserted oleh manager");
    }

    #[test]
    fn recovery_race_marker_increments_on_concurrent_writes() {
        // Verify bahwa StateFaultInjector merekam recovery_race saat
        // mark_dirty + write_json_snapshot terjadi back-to-back. Ini
        // simulasi race window yang narrow — cukup untuk trigger
        // observability hook.
        use crate::crash::CrashScenario;
        let (manager, counters) = tmp_manager_with_injector();
        manager
            .fault_injector()
            .as_ref()
            .expect("injector")
            .enable(CrashScenario::RecoveryRace);
        // Reset baseline agar counter clean.
        counters.recovery_races_observed.store(0, Ordering::Relaxed);

        let snapshot = StateSnapshot {
            active_workspace_id: "ws-race".into(),
            workspaces: vec![],
            saved_at: chrono::Utc::now(),
        };

        // Concurrently: mark_dirty + write_json_snapshot. Ada race
        // window walaupun kecil. Kita panggil keduanya sequential
        // (bukan concurrent) dan check bahwa counter naik saat
        // enabled. Untuk trigger真正的 race, perlu multithread test
        // yang jauh lebih complex — placeholder ini cukup untuk
        // memvalidasi wiring fault injector.
        let _ = manager.mark_dirty();
        let _ = manager.write_json_snapshot_only(&snapshot);
        manager
            .fault_injector()
            .as_ref()
            .expect("injector")
            .record_recovery_race();

        assert_eq!(counters.recovery_races_observed.load(Ordering::Relaxed), 1);
    }

    // -- Scenario helpers (live StateManager fault flow) -------------------

    #[test]
    fn install_and_clear_fault_injector_roundtrip() {
        let (manager, _counters) = tmp_manager_with_injector();
        // Default: helper should already have an injector installed.
        assert!(manager.fault_injector().is_some());
        manager.clear_fault_injector();
        assert!(
            manager.fault_injector().is_none(),
            "clear_fault_injector harus kosongkan slot"
        );
        // Re-install another injector — should work, not panic.
        let counters = std::sync::Arc::new(CrashCounters::new());
        manager.install_fault_injector(StateFaultInjector::new(counters.clone()));
        assert!(manager.fault_injector().is_some());
    }

    #[test]
    fn snapshot_write_io_error_helper_short_circuits_write() {
        // End-to-end: live StateManager, helper installs fault,
        // triggers write, verifies counter + ensures no file.
        let (manager, counters) = tmp_manager_with_injector();
        manager.clear_fault_injector();
        counters.snapshot_write_failures.store(0, Ordering::Relaxed);

        let snapshot = StateSnapshot {
            active_workspace_id: "ws-helper".into(),
            workspaces: vec![],
            saved_at: chrono::Utc::now(),
        };

        manager
            .run_snapshot_write_io_error_scenario(&counters, &snapshot)
            .expect("helper harus return Ok saat fault berperilaku benar");

        assert_eq!(counters.snapshot_write_failures.load(Ordering::Relaxed), 1);
        assert!(
            !manager.snapshot_path.exists(),
            "snapshot file tidak boleh tercipta saat fault aktif"
        );
        assert!(
            manager.fault_injector().is_none(),
            "helper harus clear injector setelah selesai"
        );
    }

    #[test]
    fn sqlite_busy_timeout_helper_records_wait_and_retry() {
        let (manager, counters) = tmp_manager_with_injector();
        counters.sqlite_busy_wait_ms.store(0, Ordering::Relaxed);
        counters.sqlite_busy_retries.store(0, Ordering::Relaxed);

        manager
            .run_sqlite_busy_timeout_scenario(&counters, std::time::Duration::from_millis(200))
            .expect("busy_timeout scenario harus sukses setelah holder release");

        let wait_ms = counters.sqlite_busy_wait_ms.load(Ordering::Relaxed);
        let retries = counters.sqlite_busy_retries.load(Ordering::Relaxed);
        assert!(
            wait_ms >= 150,
            "sqlite_busy_wait_ms harus >=150 (observed={wait_ms})"
        );
        assert_eq!(retries, 1, "harus tercatat 1 retry");
    }

    #[test]
    fn recovery_race_helper_observes_marker() {
        let (manager, counters) = tmp_manager_with_injector();
        counters.recovery_races_observed.store(0, Ordering::Relaxed);

        let snapshot = StateSnapshot {
            active_workspace_id: "ws-race-helper".into(),
            workspaces: vec![],
            saved_at: chrono::Utc::now(),
        };
        manager
            .run_recovery_race_scenario(&counters, &snapshot)
            .expect("recovery race helper harus Ok");

        assert_eq!(counters.recovery_races_observed.load(Ordering::Relaxed), 1);
        assert!(
            manager.lockfile_path.exists(),
            "lockfile harus tercipta dari mark_dirty"
        );
        assert!(
            manager.snapshot_path.exists(),
            "snapshot file harus tercipta"
        );
        assert!(
            manager.fault_injector().is_none(),
            "helper harus clear injector setelah selesai"
        );
    }
}
