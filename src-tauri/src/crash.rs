//! Native crash simulation harness.
//!
//! Provides:
//! - `CrashScenario` enum covering the realistic failure modes
//!   (broken pipe, process timeout, panic during output batch, etc).
//! - `install_crash_simulation` that wires a fault injector into the
//!   `PtyManager` for the current process. The injector is a trait
//!   object so tests can plug in their own counters.
//! - Unit + integration smoke tests that exercise the scenarios
//!   without leaving zombie sessions.
//!
//! Skenario dikelompokkan jadi dua keluarga:
//! - **PTY-level** (5): broken pipe, spawn eagain, panic, resize, dll.
//!   Skenario ini inject fault ke syscall PTY di [`crate::pty`].
//! - **State-level** (3): snapshot write I/O error, SQLite busy
//!   timeout, recovery race. Skenario ini inject fault ke
//!   [`crate::state::StateManager`] dan di-handle oleh
//!   [`StateFaultInjector`].
//!
//! The injector is intentionally *opt-in* (call `install_crash_simulation`)
//! so production behavior is unchanged. A panic captured here is logged
//! and counted but does not abort the host process — that's what the
//! `tracing-panic` crate hook in `utils::diagnostics` is for.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use portable_pty::PtySize;

/// Identifier for a fault we want to inject.
///
/// Varian dibagi jadi 2 keluarga:
/// - **PTY-level** (5 pertama): inject fault ke PTY syscall.
/// - **State-level** (3 terakhir): inject fault ke StateManager
///   untuk validasi recovery flow end-to-end.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CrashScenario {
    /// Process exits immediately after spawn (exit code 137).
    ProcessExitsImmediately,
    /// Read syscall returns `EPIPE` (broken pipe) on the next batch.
    BrokenPipeOnRead,
    /// Spawn returns `EAGAIN` (resource exhaustion) once.
    SpawnEagain,
    /// Output batch triggers a synthetic panic, caught by the runtime.
    PanicDuringOutput,
    /// Resize returns `EINVAL` (invalid argument) once.
    ResizeInvalid,
    // -- State-level scenarios (TDD §3.4) -------------------------------
    /// `StateManager.write_json_snapshot` mengembalikan simulated
    /// I/O error (disk full, permission denied, antivirus lock).
    SnapshotWriteIoError,
    /// Concurrent SQLite writer pegang BEGIN IMMEDIATE — main
    /// connection harus honor `busy_timeout` (5 detik) tanpa
    /// throw `SQLITE_BUSY`. Mengukur latency di scenario terburuk.
    SqliteBusyTimeout,
    /// Snapshot write concurrent dengan dirty-lockfile creation —
    /// memastikan [`crate::state::StateManager::recovery_status`]
    /// tetap return consistent state (lockfile + snapshot
    /// keduanya visible tanpa race).
    RecoveryRace,
}

impl CrashScenario {
    pub fn label(&self) -> &'static str {
        match self {
            CrashScenario::ProcessExitsImmediately => "process-exits-immediately",
            CrashScenario::BrokenPipeOnRead => "broken-pipe-on-read",
            CrashScenario::SpawnEagain => "spawn-eagain",
            CrashScenario::PanicDuringOutput => "panic-during-output",
            CrashScenario::ResizeInvalid => "resize-invalid",
            CrashScenario::SnapshotWriteIoError => "snapshot-write-io-error",
            CrashScenario::SqliteBusyTimeout => "sqlite-busy-timeout",
            CrashScenario::RecoveryRace => "recovery-race",
        }
    }

    /// True kalau skenario ini di-handle di level [`crate::state`],
    /// bukan di level PTY. State-level scenarios butuh akses ke
    /// [`StateFaultInjector`] sementara PTY-level pakai counter
    /// internal.
    pub fn is_state_level(&self) -> bool {
        matches!(
            self,
            CrashScenario::SnapshotWriteIoError
                | CrashScenario::SqliteBusyTimeout
                | CrashScenario::RecoveryRace
        )
    }
}

/// Counters tracked per skenario PTY-level untuk diagnostics.
#[derive(Default, Debug)]
pub struct CrashCounters {
    pub spawn_attempts: AtomicU64,
    pub spawn_succeeded: AtomicU64,
    pub spawn_failed: AtomicU64,
    pub read_attempts: AtomicU64,
    pub read_broken_pipe: AtomicU64,
    pub panics_caught: AtomicU64,
    pub resize_attempts: AtomicU64,
    pub resize_invalid: AtomicU64,
    // -- State-level counters --------------------------------------------
    /// Berapa kali write JSON snapshot gagal karena simulated I/O error.
    pub snapshot_write_failures: AtomicU64,
    /// Berapa kali write JSON snapshot sukses.
    pub snapshot_write_success: AtomicU64,
    /// Total milliseconds yang dihabiskan menunggu `SQLITE_BUSY`
    /// dilepas (semua call combined).
    pub sqlite_busy_wait_ms: AtomicU64,
    /// Berapa kali write SQLite yang sempat harus menunggu karena
    /// concurrent holder.
    pub sqlite_busy_retries: AtomicU64,
    /// Berapa kali recovery race terdeteksi (snapshot write +
    /// lockfile update overlap, tapi hasilnya konsisten).
    pub recovery_races_observed: AtomicU64,
}

impl CrashCounters {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn summary(&self) -> CrashSummary {
        CrashSummary {
            spawn_attempts: self.spawn_attempts.load(Ordering::Relaxed),
            spawn_succeeded: self.spawn_succeeded.load(Ordering::Relaxed),
            spawn_failed: self.spawn_failed.load(Ordering::Relaxed),
            read_attempts: self.read_attempts.load(Ordering::Relaxed),
            read_broken_pipe: self.read_broken_pipe.load(Ordering::Relaxed),
            panics_caught: self.panics_caught.load(Ordering::Relaxed),
            resize_attempts: self.resize_attempts.load(Ordering::Relaxed),
            resize_invalid: self.resize_invalid.load(Ordering::Relaxed),
            snapshot_write_failures: self.snapshot_write_failures.load(Ordering::Relaxed),
            snapshot_write_success: self.snapshot_write_success.load(Ordering::Relaxed),
            sqlite_busy_wait_ms: self.sqlite_busy_wait_ms.load(Ordering::Relaxed),
            sqlite_busy_retries: self.sqlite_busy_retries.load(Ordering::Relaxed),
            recovery_races_observed: self.recovery_races_observed.load(Ordering::Relaxed),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CrashSummary {
    pub spawn_attempts: u64,
    pub spawn_succeeded: u64,
    pub spawn_failed: u64,
    pub read_attempts: u64,
    pub read_broken_pipe: u64,
    pub panics_caught: u64,
    pub resize_attempts: u64,
    pub resize_invalid: u64,
    pub snapshot_write_failures: u64,
    pub snapshot_write_success: u64,
    pub sqlite_busy_wait_ms: u64,
    pub sqlite_busy_retries: u64,
    pub recovery_races_observed: u64,
}

use serde::Serialize;

/// Flag fault untuk skenario state-level. Tiap field on/off
/// tergantung skenario yang lagi di-enable. Default semua off.
#[derive(Default, Debug, Clone, Copy, PartialEq, Eq)]
pub struct StateFaultFlags {
    /// `true` → paksa `write_json_snapshot` return error (simulasi
    /// disk full / antivirus lock).
    pub fail_snapshot_write: bool,
    /// `true` → counter `sqlite_busy_wait_ms` di-update setelah
    /// menunggu (untuk verifikasi `busy_timeout` honored).
    pub measure_busy_wait: bool,
    /// `true` → concurrent mark_dirty + write_snapshot dipertahankan
    /// di observability (race window explicit, hasil akhir
    /// konsisten).
    pub measure_recovery_race: bool,
}

/// Injector untuk fault state-level. Dipakai `StateManager` via
/// `Arc<Mutex<StateFaultFlags>>`. Default: semua flag off (no-op
/// di production).
#[derive(Default, Debug, Clone)]
pub struct StateFaultInjector {
    flags: Arc<Mutex<StateFaultFlags>>,
    counters: Arc<CrashCounters>,
}

impl StateFaultInjector {
    pub fn new(counters: Arc<CrashCounters>) -> Self {
        Self {
            flags: Arc::new(Mutex::new(StateFaultFlags::default())),
            counters,
        }
    }

    /// Aktifkan fault tertentu. Dipakai oleh [`CrashInjector::pick`]
    /// untuk sinkronisasi dengan skenario state-level.
    pub fn enable(&self, scenario: CrashScenario) {
        let mut flags = self.flags.lock().expect("state fault lock poisoned");
        match scenario {
            CrashScenario::SnapshotWriteIoError => flags.fail_snapshot_write = true,
            CrashScenario::SqliteBusyTimeout => flags.measure_busy_wait = true,
            CrashScenario::RecoveryRace => flags.measure_recovery_race = true,
            // PTY-level — diabaikan di state injector.
            _ => {}
        }
    }

    /// Reset semua flag (dipakai antar run probe).
    pub fn reset(&self) {
        let mut flags = self.flags.lock().expect("state fault lock poisoned");
        *flags = StateFaultFlags::default();
    }

    pub fn flags(&self) -> StateFaultFlags {
        *self.flags.lock().expect("state fault lock poisoned")
    }

    pub fn counters(&self) -> Arc<CrashCounters> {
        Arc::clone(&self.counters)
    }

    /// Dipanggil StateManager sebelum `write_json_snapshot` —
    /// return `true` kalau fault aktif (caller harus short-circuit
    /// dengan error + increment counter).
    pub fn should_fail_snapshot_write(&self) -> bool {
        self.flags().fail_snapshot_write
    }

    pub fn record_snapshot_write(&self, success: bool) {
        if success {
            self.counters
                .snapshot_write_success
                .fetch_add(1, Ordering::Relaxed);
        } else {
            self.counters
                .snapshot_write_failures
                .fetch_add(1, Ordering::Relaxed);
        }
    }

    pub fn record_busy_wait(&self, wait_ms: u64, was_retry: bool) {
        self.counters
            .sqlite_busy_wait_ms
            .fetch_add(wait_ms, Ordering::Relaxed);
        if was_retry {
            self.counters
                .sqlite_busy_retries
                .fetch_add(1, Ordering::Relaxed);
        }
    }

    pub fn record_recovery_race(&self) {
        self.counters
            .recovery_races_observed
            .fetch_add(1, Ordering::Relaxed);
    }
}

/// A scenario + how many times to inject before the injector resets.
#[derive(Debug, Clone)]
pub struct InjectionPlan {
    pub scenario: CrashScenario,
    pub remaining: u32,
}

impl InjectionPlan {
    pub fn new(scenario: CrashScenario, count: u32) -> Self {
        Self {
            scenario,
            remaining: count,
        }
    }
}

impl Default for InjectionPlan {
    fn default() -> Self {
        Self::new(CrashScenario::BrokenPipeOnRead, 0)
    }
}

/// Injector that the manager consults before each syscall. State is
/// guarded by a Mutex so multiple threads can ask concurrently.
pub struct CrashInjector {
    pub counters: Arc<CrashCounters>,
    plan: Mutex<Vec<InjectionPlan>>,
    next: Mutex<Option<CrashScenario>>,
}

impl CrashInjector {
    pub fn new(counters: Arc<CrashCounters>) -> Self {
        Self {
            counters,
            plan: Mutex::new(Vec::new()),
            next: Mutex::new(None),
        }
    }

    pub fn enqueue(&self, plan: InjectionPlan) {
        // Plan bisa berisi state-level scenario — simpan aja, caller
        // yang akan consult `StateFaultInjector` langsung saat
        // exercise.
        self.plan.lock().expect("plan lock poisoned").push(plan);
    }

    /// Choose the next scenario to fire (if any). FIFO across all
    /// `enqueue`d plans until each runs out of `remaining`.
    pub fn pick(&self) -> Option<CrashScenario> {
        {
            let next = self.next.lock().expect("next lock poisoned");
            if let Some(s) = *next {
                return Some(s);
            }
        }
        let mut plan = self.plan.lock().expect("plan lock poisoned");
        while let Some(mut p) = plan.first().cloned() {
            if p.remaining == 0 {
                plan.remove(0);
                continue;
            }
            p.remaining -= 1;
            if p.remaining == 0 {
                plan.remove(0);
            } else {
                plan[0] = InjectionPlan {
                    scenario: p.scenario,
                    remaining: p.remaining,
                };
            }
            *self.next.lock().expect("next lock poisoned") = Some(p.scenario);
            return Some(p.scenario);
        }
        None
    }

    /// Mark the previously picked scenario as consumed.
    pub fn consume(&self) {
        *self.next.lock().expect("next lock poisoned") = None;
    }

    /// Run an async block with a panic guard that increments the
    /// `panics_caught` counter instead of aborting the process.
    pub fn run_with_panic_guard<F, R>(&self, block: F) -> Result<R, String>
    where
        F: FnOnce() -> R + std::panic::UnwindSafe,
    {
        match std::panic::catch_unwind(block) {
            Ok(value) => Ok(value),
            Err(payload) => {
                self.counters.panics_caught.fetch_add(1, Ordering::Relaxed);
                let message = panic_message(&payload);
                tracing::error!(panic = %message, "panic caught by crash injector");
                Err(message)
            }
        }
    }
}

fn panic_message(payload: &Box<dyn std::any::Any + Send>) -> String {
    if let Some(s) = payload.downcast_ref::<&'static str>() {
        return (*s).to_string();
    }
    if let Some(s) = payload.downcast_ref::<String>() {
        return s.clone();
    }
    "<non-string panic payload>".to_string()
}

/// Run a future that periodically times out. Returns `Ok(())` if the
/// future completes within `within`, otherwise `Err(timeout_reached)`.
#[allow(dead_code)]
pub async fn with_timeout<F, T>(within: Duration, fut: F) -> Result<T, String>
where
    F: std::future::Future<Output = T>,
{
    match tokio::time::timeout(within, fut).await {
        Ok(value) => Ok(value),
        Err(_) => Err(format!("operation exceeded {:?}", within)),
    }
}

/// Helper used in tests: spawn a `cmd.exe /c exit 137` PTY to simulate
/// immediate exit. Returns the elapsed milliseconds and exit code.
#[allow(dead_code)]
pub fn measure_spawn_then_exit(_pane_id: &str) -> (u128, i32) {
    use std::process::Command;
    use std::time::Instant;

    let started = Instant::now();
    let status = Command::new("cmd.exe")
        .args(["/C", "exit", "137"])
        .status()
        .expect("cmd.exe should be available on Windows for crash tests");
    let elapsed = started.elapsed().as_millis();
    (elapsed, status.code().unwrap_or(-1))
}

/// Stand-in pty size used in the smoke test below.
#[allow(dead_code)]
pub fn test_pty_size() -> PtySize {
    PtySize {
        rows: 24,
        cols: 80,
        pixel_width: 0,
        pixel_height: 0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn injector_picks_scenarios_in_fifo_order() {
        let counters = Arc::new(CrashCounters::new());
        let injector = CrashInjector::new(counters.clone());
        injector.enqueue(InjectionPlan::new(CrashScenario::SpawnEagain, 2));
        injector.enqueue(InjectionPlan::new(
            CrashScenario::BrokenPipeOnRead,
            1,
        ));

        assert_eq!(injector.pick(), Some(CrashScenario::SpawnEagain));
        injector.consume();
        assert_eq!(injector.pick(), Some(CrashScenario::SpawnEagain));
        injector.consume();
        assert_eq!(injector.pick(), Some(CrashScenario::BrokenPipeOnRead));
        injector.consume();
        assert_eq!(injector.pick(), None);
    }

    #[test]
    fn panic_guard_increments_counter_and_returns_error() {
        let counters = Arc::new(CrashCounters::new());
        let injector = CrashInjector::new(counters.clone());
        let result = injector.run_with_panic_guard(|| {
            panic!("simulated output panic");
        });
        assert!(result.is_err());
        assert_eq!(counters.panics_caught.load(Ordering::Relaxed), 1);
    }

    #[test]
    fn panic_guard_returns_value_for_normal_block() {
        let counters = Arc::new(CrashCounters::new());
        let injector = CrashInjector::new(counters.clone());
        let result = injector.run_with_panic_guard(|| 42);
        assert_eq!(result.unwrap(), 42);
        assert_eq!(counters.panics_caught.load(Ordering::Relaxed), 0);
    }

    #[test]
    fn counter_summary_aggregates_atomic_loads() {
        let counters = CrashCounters::new();
        counters.spawn_attempts.fetch_add(5, Ordering::Relaxed);
        counters.spawn_succeeded.fetch_add(4, Ordering::Relaxed);
        counters.spawn_failed.fetch_add(1, Ordering::Relaxed);
        counters.read_broken_pipe.fetch_add(2, Ordering::Relaxed);
        counters.panics_caught.fetch_add(1, Ordering::Relaxed);
        counters.snapshot_write_failures.fetch_add(1, Ordering::Relaxed);
        counters.sqlite_busy_wait_ms.fetch_add(250, Ordering::Relaxed);
        counters.recovery_races_observed.fetch_add(2, Ordering::Relaxed);
        let summary = counters.summary();
        assert_eq!(summary.spawn_attempts, 5);
        assert_eq!(summary.spawn_succeeded, 4);
        assert_eq!(summary.spawn_failed, 1);
        assert_eq!(summary.read_broken_pipe, 2);
        assert_eq!(summary.panics_caught, 1);
        assert_eq!(summary.snapshot_write_failures, 1);
        assert_eq!(summary.sqlite_busy_wait_ms, 250);
        assert_eq!(summary.recovery_races_observed, 2);
    }

    #[test]
    fn state_injector_enable_mirrors_flags() {
        let counters = Arc::new(CrashCounters::new());
        let state = StateFaultInjector::new(counters);
        assert!(!state.flags().fail_snapshot_write);
        state.enable(CrashScenario::SnapshotWriteIoError);
        assert!(state.flags().fail_snapshot_write);
        state.reset();
        assert!(!state.flags().fail_snapshot_write);
    }

    #[test]
    fn state_injector_ignores_pty_scenarios() {
        let counters = Arc::new(CrashCounters::new());
        let state = StateFaultInjector::new(counters);
        // PTY-level harus di-ignore — tidak mengaktifkan flag state.
        state.enable(CrashScenario::SpawnEagain);
        assert_eq!(state.flags(), StateFaultFlags::default());
    }

    #[test]
    fn state_injector_records_counters() {
        let counters = Arc::new(CrashCounters::new());
        let state = StateFaultInjector::new(counters.clone());
        state.record_snapshot_write(true);
        state.record_snapshot_write(false);
        state.record_busy_wait(150, true);
        state.record_recovery_race();
        let summary = counters.summary();
        assert_eq!(summary.snapshot_write_success, 1);
        assert_eq!(summary.snapshot_write_failures, 1);
        assert_eq!(summary.sqlite_busy_wait_ms, 150);
        assert_eq!(summary.sqlite_busy_retries, 1);
        assert_eq!(summary.recovery_races_observed, 1);
    }

    #[test]
    fn is_state_level_classifies_correctly() {
        assert!(!CrashScenario::ProcessExitsImmediately.is_state_level());
        assert!(!CrashScenario::BrokenPipeOnRead.is_state_level());
        assert!(!CrashScenario::SpawnEagain.is_state_level());
        assert!(!CrashScenario::PanicDuringOutput.is_state_level());
        assert!(!CrashScenario::ResizeInvalid.is_state_level());
        assert!(CrashScenario::SnapshotWriteIoError.is_state_level());
        assert!(CrashScenario::SqliteBusyTimeout.is_state_level());
        assert!(CrashScenario::RecoveryRace.is_state_level());
    }

    #[test]
    fn crash_scenario_label_covers_all_variants() {
        // Guard test: kalau ada variant baru tanpa label, ini fail.
        let labels = [
            CrashScenario::ProcessExitsImmediately,
            CrashScenario::BrokenPipeOnRead,
            CrashScenario::SpawnEagain,
            CrashScenario::PanicDuringOutput,
            CrashScenario::ResizeInvalid,
            CrashScenario::SnapshotWriteIoError,
            CrashScenario::SqliteBusyTimeout,
            CrashScenario::RecoveryRace,
        ];
        for s in labels {
            assert!(!s.label().is_empty(), "{s:?} harus punya label");
            assert!(!s.label().contains(' '), "label {s:?} harus kebab-case");
        }
    }
}
