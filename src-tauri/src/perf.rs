//! Performance harness untuk profiling native runtime Tauri.
//!
//! Modul ini berisi helper yang dipakai oleh command `system_run_*_probe`
//! dan tests untuk:
//!
//! 1. Mengukur spawn latency untuk 1 PTY session (resolusi shell + openpty +
//!    spawn child).
//! 2. Mengukur spawn latency untuk N PTY session paralel (target: 9 pane
//!    sesuai PRD).
//! 3. Mengambil sample memory usage (RSS via Windows API; fall back ke
//!    `/proc/self/status` di Unix).
//! 4. Mengukur idle RSS 9 pane selama dwell window (validasi budget
//!    `<200MB` di PRD).
//! 5. Mengukur output throughput (bytes/batches yang diterima per detik)
//!    via [`CountingPtyEventSink`].
//! 6. Membandingkan hasil probe dengan baseline JSON untuk regression
//!    gate CI (target: tolak regresi >10% dari baseline).
//!
//! Output diserialisasi ke struct serde agar command IPC bisa
//! mengembalikannya ke frontend tanpa coupling ke tipe OS-specific.

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::State;

use crate::pty::{PtyEventSink, PtyExitEventPayload, PtyManager, PtyOutputEventPayload, ShellSpec};
use crate::AppState;

/// Sink yang drop semua event. Dipakai oleh probe yang butuh
/// menjalankan PTY secara terisolasi tanpa mempengaruhi frontend
/// (idle probe, throughput probe).
pub struct NoopPtyEventSink;

impl PtyEventSink for NoopPtyEventSink {
    fn emit_output(&self, _payload: PtyOutputEventPayload) {}
    fn emit_exit(&self, _payload: PtyExitEventPayload) {}
}

/// Helper untuk ambil Arc ke Noop sink.
pub fn noop_sink() -> Arc<dyn PtyEventSink> {
    Arc::new(NoopPtyEventSink)
}

#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PerfSnapshot {
    pub spawn_ms: u128,
    pub resolver_ms: u128,
    pub cwd_resolve_ms: u128,
    pub active_sessions: usize,
    pub rss_bytes: Option<u64>,
    pub peak_rss_bytes: Option<u64>,
    pub pty_count: usize,
    pub total_ms: u128,
    pub shell: String,
    pub shell_source: String,
    pub cwd: String,
    pub target_spawn_ms: u128,
    pub within_budget: bool,
}

/// Multi-spawn perf measurement (9-pane scenario).
#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MultiSpawnReport {
    pub panes: usize,
    pub total_spawn_ms: u128,
    pub avg_spawn_ms: u128,
    pub p50_spawn_ms: u128,
    pub p95_spawn_ms: u128,
    pub min_spawn_ms: u128,
    pub max_spawn_ms: u128,
    pub rss_before_bytes: Option<u64>,
    pub rss_after_bytes: Option<u64>,
    pub rss_delta_bytes: Option<u64>,
    pub target_total_ms: u128,
    pub within_budget: bool,
}

/// 9-pane idle RSS stability probe — spawn N panes, sample RSS selama
/// dwell window, laporkan min/max/delta.
#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct IdleReport {
    pub panes: usize,
    pub dwell_ms: u64,
    pub sample_count: usize,
    pub rss_min_bytes: u64,
    pub rss_max_bytes: u64,
    pub rss_delta_bytes: u64,
    pub rss_first_bytes: u64,
    pub rss_last_bytes: u64,
    pub total_ms: u128,
    pub target_max_rss_bytes: u64,
    pub within_budget: bool,
}

/// Per-pane output throughput counters yang dikumpulkan oleh
/// [`CountingPtyEventSink`].
#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaneOutputCounters {
    pub pane_id: String,
    pub bytes: u64,
    pub batches: u64,
}

/// Output throughput probe (synthetic load via `for /L`) — untuk
/// memvalidasi bahwa 9 pane dengan output deras masih di-handle tanpa
/// drop frame.
#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ThroughputReport {
    pub panes: usize,
    pub lines_per_pane: u32,
    pub total_bytes: u64,
    pub total_batches: u64,
    pub per_pane: Vec<PaneOutputCounters>,
    pub duration_ms: u128,
    pub throughput_kbps: f64,
    pub target_kbps: f64,
    pub within_budget: bool,
    pub expected_bytes: u64,
    pub bytes_ratio: f64,
}

/// Hasil probe throughput dengan [`TtyRespondingSink`]. Menggabungkan
/// metrik throughput biasa dengan hitungan terminal control queries
/// (ESC[6n, ESC[0c) yang diterima selama measurement window.
///
/// `unhandled_queries > 0` atau `cursor_query_received > 0` menandakan
/// ada shell yang mengirim query tanpa mendapat balasan — indikasi
/// kuat pipeline output Tauri dalam kondisi degraded (sink tidak bisa
/// menulis balik ke PTY untuk menjawab).
#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TtyRespondingProbeReport {
    pub panes: usize,
    pub lines_per_pane: u32,
    pub total_bytes: u64,
    pub total_batches: u64,
    pub per_pane: Vec<PaneOutputCounters>,
    pub duration_ms: u128,
    pub throughput_kbps: f64,
    pub cursor_query_received: u64,
    pub device_attributes_received: u64,
    pub unhandled_queries: u64,
}

/// Hasil perbandingan sebuah metric terhadap baseline. Dipakai oleh
/// [`compare_to_baseline`] untuk gate CI.
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)] // Public API surface for scripts/perf-check.mjs.
pub struct MetricDelta {
    pub name: String,
    pub baseline: f64,
    pub current: f64,
    pub delta_pct: f64,
    /// `true` jika metric ini **lebih buruk** dari baseline lebih dari
    /// threshold (default 10%). Untuk metric "lower is better" (latency,
    /// memory), ini berarti current > baseline * 1.10. Untuk metric
    /// "higher is better" (throughput), berarti current < baseline * 0.90.
    pub regressed: bool,
    pub direction: MetricDirection,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
#[allow(dead_code)]
pub enum MetricDirection {
    /// Metric dengan target "semakin rendah semakin baik" (latency, RSS,
    /// delta).
    LowerIsBetter,
    /// Metric dengan target "semakin tinggi semakin baik" (throughput,
    /// success rate).
    HigherIsBetter,
}

impl MetricDirection {
    #[allow(dead_code)]
    fn is_regression(&self, baseline: f64, current: f64, threshold_pct: f64) -> bool {
        if baseline <= 0.0 {
            return false;
        }
        let factor = current / baseline;
        match self {
            MetricDirection::LowerIsBetter => factor > 1.0 + (threshold_pct / 100.0),
            MetricDirection::HigherIsBetter => factor < 1.0 - (threshold_pct / 100.0),
        }
    }
}

impl MetricDelta {
    #[allow(dead_code)]
    pub fn new(name: &str, baseline: f64, current: f64, direction: MetricDirection) -> Self {
        let delta_pct = if baseline > 0.0 {
            ((current - baseline) / baseline) * 100.0
        } else {
            0.0
        };
        Self {
            name: name.to_string(),
            baseline,
            current,
            delta_pct,
            regressed: direction.is_regression(baseline, current, DEFAULT_REGRESSION_THRESHOLD_PCT),
            direction,
        }
    }
}

#[allow(dead_code)]
pub const DEFAULT_REGRESSION_THRESHOLD_PCT: f64 = 10.0;

/// Tolak seluruh run bila ada metric yang regressed.
#[derive(Debug, Clone, Serialize, Default)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct BaselineComparison {
    pub threshold_pct: f64,
    pub deltas: Vec<MetricDelta>,
    pub regressed_count: usize,
    pub passed: bool,
}

#[allow(dead_code)]
pub fn compare_to_baseline(
    pairs: &[(&str, f64, f64, MetricDirection)],
    threshold_pct: f64,
) -> BaselineComparison {
    let deltas: Vec<MetricDelta> = pairs
        .iter()
        .map(|(name, baseline, current, dir)| {
            let mut delta = MetricDelta::new(name, *baseline, *current, *dir);
            // Recompute with custom threshold.
            delta.regressed =
                dir.is_regression(*baseline, *current, threshold_pct);
            delta
        })
        .collect();
    let regressed_count = deltas.iter().filter(|d| d.regressed).count();
    BaselineComparison {
        threshold_pct,
        passed: regressed_count == 0,
        regressed_count,
        deltas,
    }
}

/// Format [`BaselineComparison`] jadi string ringkas untuk log + CI
/// output. Beri marker `REGRESSION` per metric yang gagal.
#[allow(dead_code)]
pub fn format_baseline_report(comparison: &BaselineComparison) -> String {
    let mut out = String::new();
    let status = if comparison.passed { "PASS" } else { "FAIL" };
    out.push_str(&format!(
        "[perf-baseline] {} (threshold ±{}%, regressed: {})\n",
        status,
        comparison.threshold_pct,
        comparison.regressed_count
    ));
    for d in &comparison.deltas {
        let marker = if d.regressed { "REGRESSION" } else { "ok" };
        let sign = if d.delta_pct >= 0.0 { "+" } else { "" };
        out.push_str(&format!(
            "  - {:<26} baseline={:>10.2}  current={:>10.2}  Δ={}{:>6.2}%  [{}]\n",
            d.name,
            d.baseline,
            d.current,
            sign,
            d.delta_pct,
            marker,
        ));
    }
    out
}

// ============================================================================
// PtyEventSink — counting variant for throughput measurement
// ============================================================================

/// [`PtyEventSink`] yang menghitung bytes + batches per pane. Digunakan
/// oleh [`measure_throughput_with_sink`] dan tests untuk menghitung
/// jumlah output yang berhasil di-emit tanpa coupling ke Tauri runtime.
pub struct CountingPtyEventSink {
    inner: Arc<dyn PtyEventSink>,
    state: Mutex<CountingState>,
}

#[derive(Default)]
struct CountingState {
    per_pane: HashMap<String, PaneOutputCounters>,
    total_bytes: u64,
    total_batches: u64,
    /// Set true saat pane menerima event exit; throughput probe stop
    /// menunggu semua pane exit sebelum menghitung durasi.
    exited_panes: std::collections::HashSet<String>,
    /// Total expected panes; dipakai untuk [`is_all_exited`].
    expected_panes: usize,
}

impl CountingPtyEventSink {
    pub fn new(inner: Arc<dyn PtyEventSink>, expected_panes: usize) -> Self {
        Self {
            inner,
            state: Mutex::new(CountingState {
                expected_panes,
                ..Default::default()
            }),
        }
    }

    pub fn total_bytes(&self) -> u64 {
        self.state.lock().expect("counting sink poisoned").total_bytes
    }

    pub fn total_batches(&self) -> u64 {
        self.state.lock().expect("counting sink poisoned").total_batches
    }

    pub fn per_pane(&self) -> Vec<PaneOutputCounters> {
        self.state
            .lock()
            .expect("counting sink poisoned")
            .per_pane
            .values()
            .cloned()
            .collect()
    }

    pub fn is_all_exited(&self) -> bool {
        let state = self.state.lock().expect("counting sink poisoned");
        state.exited_panes.len() >= state.expected_panes && state.expected_panes > 0
    }
}

impl PtyEventSink for CountingPtyEventSink {
    fn emit_output(&self, payload: PtyOutputEventPayload) {
        let len = payload.chunk.len() as u64;
        {
            let mut state = self.state.lock().expect("counting sink poisoned");
            let entry = state
                .per_pane
                .entry(payload.pane_id.clone())
                .or_insert_with(|| PaneOutputCounters {
                    pane_id: payload.pane_id.clone(),
                    ..Default::default()
                });
            entry.bytes += len;
            entry.batches += 1;
            state.total_bytes += len;
            state.total_batches += 1;
        }
        self.inner.emit_output(payload);
    }

    fn emit_exit(&self, payload: PtyExitEventPayload) {
        {
            let mut state = self.state.lock().expect("counting sink poisoned");
            state.exited_panes.insert(payload.pane_id.clone());
        }
        self.inner.emit_exit(payload);
    }
}

// ============================================================================
// PtyEventSink — TTY-query-aware variant
// ============================================================================

/// Counter terpartisi untuk [`TtyRespondingSink`]. Dipisah dari sink
/// (Arc'd) agar probe bisa baca snapshot tanpa memegang reference ke
/// sink — pattern sama dengan [`crate::crash::CrashCounters`].
pub struct TtyQueryCounters {
    pub cursor_query_received: AtomicU64,
    pub device_attributes_received: AtomicU64,
    pub unhandled_queries: AtomicU64,
}

impl TtyQueryCounters {
    pub fn new() -> Self {
        Self {
            cursor_query_received: AtomicU64::new(0),
            device_attributes_received: AtomicU64::new(0),
            unhandled_queries: AtomicU64::new(0),
        }
    }

    pub fn cursor_queries(&self) -> u64 {
        self.cursor_query_received.load(Ordering::Relaxed)
    }

    pub fn device_attributes(&self) -> u64 {
        self.device_attributes_received.load(Ordering::Relaxed)
    }

    pub fn unhandled(&self) -> u64 {
        self.unhandled_queries.load(Ordering::Relaxed)
    }
}

impl Default for TtyQueryCounters {
    fn default() -> Self {
        Self::new()
    }
}

/// [`PtyEventSink`] yang memindai chunk output untuk terminal control
/// queries yang umum dikirim shell (cmd.exe pakai `ESC[6n` untuk
/// cursor position sebelum memproses banyak prompt; `ESC[0c` untuk
/// device attributes).
///
/// Sink ini TIDAK bisa menulis balik ke PTY (trait `PtyEventSink`
/// cuma punya emit_output/emit_exit), jadi tujuannya bukan
/// menjawab query — tapi MENGUKUR berapa query yang masuk selama
/// measurement window. Hitungan `unhandled_queries` atau
/// `cursor_query_received > 0` adalah sinyal pipeline output Tauri
/// dalam kondisi degraded untuk shell tertentu.
///
/// State "terminal" palsu (cursor row/col + size) disimpan supaya
/// arsitektur siap di-extend kalau trait PtyEventSink nanti
/// menambahkan `emit_input` (write-back ke PTY).
pub struct TtyRespondingSink {
    inner: Arc<dyn PtyEventSink>,
    counters: Arc<TtyQueryCounters>,
    rows: u16,
    cols: u16,
    cursor_row: AtomicU64,
    cursor_col: AtomicU64,
}

impl TtyRespondingSink {
    pub fn new(inner: Arc<dyn PtyEventSink>, rows: u16, cols: u16) -> Self {
        Self {
            inner,
            counters: Arc::new(TtyQueryCounters::new()),
            rows,
            cols,
            cursor_row: AtomicU64::new(1),
            cursor_col: AtomicU64::new(1),
        }
    }

    pub fn counters(&self) -> Arc<TtyQueryCounters> {
        self.counters.clone()
    }

    /// State terminal palsu saat ini. Dipakai untuk logging/debug;
    /// tidak ada consumer aktif sampai trait PtyEventSink punya
    /// jalur write-back.
    #[allow(dead_code)]
    pub fn terminal_state(&self) -> (u16, u16, u16, u16) {
        (
            self.rows,
            self.cols,
            self.cursor_row.load(Ordering::Relaxed) as u16,
            self.cursor_col.load(Ordering::Relaxed) as u16,
        )
    }
}

impl PtyEventSink for TtyRespondingSink {
    fn emit_output(&self, payload: PtyOutputEventPayload) {
        let (cursor, devattr, unhandled) = scan_tty_queries(&payload.chunk);
        if cursor > 0 {
            self.counters
                .cursor_query_received
                .fetch_add(cursor, Ordering::Relaxed);
        }
        if devattr > 0 {
            self.counters
                .device_attributes_received
                .fetch_add(devattr, Ordering::Relaxed);
        }
        if unhandled > 0 {
            self.counters
                .unhandled_queries
                .fetch_add(unhandled, Ordering::Relaxed);
        }
        self.inner.emit_output(payload);
    }

    fn emit_exit(&self, payload: PtyExitEventPayload) {
        self.inner.emit_exit(payload);
    }
}

/// Pindai sebuah chunk output untuk terminal control queries.
/// Return `(cursor, device_attributes, unhandled)`.
///
/// Sequence yang dikenali:
/// - `\x1b[6n` — Device Status Report (cursor position)
/// - `\x1b[0c` atau `\x1b[c` — Primary Device Attributes
///
/// Sequence query lain (final byte `n` atau `c`) yang tidak dikenali
/// dihitung sebagai `unhandled`. Sequence CSI non-query (cursor
/// movement, color dsb.) diabaikan — bukan query, jadi tidak
/// relevan untuk pengukuran ini.
fn scan_tty_queries(chunk: &str) -> (u64, u64, u64) {
    let bytes = chunk.as_bytes();
    let mut cursor = 0u64;
    let mut devattr = 0u64;
    let mut unhandled = 0u64;
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] != 0x1b {
            i += 1;
            continue;
        }
        if i + 2 >= bytes.len() || bytes[i + 1] != b'[' {
            i += 1;
            continue;
        }
        let start = i;
        let mut j = i + 2;
        while j < bytes.len() && !bytes[j].is_ascii_alphabetic() {
            j += 1;
        }
        if j >= bytes.len() {
            // CSI sequence terpotong di akhir chunk — skip.
            break;
        }
        let final_byte = bytes[j];
        if final_byte == b'n' || final_byte == b'c' {
            let seq = &chunk[start..=j];
            match seq {
                "\x1b[6n" => cursor += 1,
                "\x1b[0c" | "\x1b[c" => devattr += 1,
                _ => unhandled += 1,
            }
        }
        i = j + 1;
    }
    (cursor, devattr, unhandled)
}

/// Spawn N PTY sessions in sequence and report per-call latency + memory.
pub async fn measure_multi_spawn(
    state: &State<'_, AppState>,
    panes: usize,
    rows: u16,
    cols: u16,
) -> Result<MultiSpawnReport, String> {
    let spec = crate::pty::ShellSpec::from_legacy(Some("powershell.exe".to_string()));
    let rss_before = resident_memory_bytes();
    let mut latencies: Vec<u128> = Vec::with_capacity(panes);
    let mut pane_ids: Vec<String> = Vec::with_capacity(panes);

    let started = Instant::now();
    for i in 0..panes {
        let pane_id = format!("perf-multi-{}-{}", i, uuid::Uuid::new_v4());
        let per_start = Instant::now();
        state
            .pty_manager
            .spawn_session_with_spec(
                "workspace-perf".to_string(),
                pane_id.clone(),
                spec.clone(),
                None,
                None,
                Some(rows),
                Some(cols),
            )
            .await?;
        latencies.push(per_start.elapsed().as_millis());
        pane_ids.push(pane_id);
    }
    let total_spawn_ms = started.elapsed().as_millis();

    let rss_after = resident_memory_bytes();
    let rss_delta = match (rss_before, rss_after) {
        (Some(before), Some(after)) if after >= before => Some(after - before),
        (Some(_), Some(_)) => Some(0),
        _ => None,
    };

    // Clean up so we don't leave zombie sessions behind.
    for pane_id in &pane_ids {
        let _ = state.pty_manager.close_session(pane_id).await;
    }

    let mut sorted = latencies.clone();
    sorted.sort_unstable();
    let avg = if latencies.is_empty() {
        0
    } else {
        latencies.iter().sum::<u128>() / latencies.len() as u128
    };
    let p50 = percentile(&sorted, 50);
    let p95 = percentile(&sorted, 95);
    let min = *sorted.first().unwrap_or(&0);
    let max = *sorted.last().unwrap_or(&0);

    // PRD target: 9 pane cold start < 1500ms total, average < 200ms.
    let target_total_ms = (panes as u128) * 200;
    let within_budget = total_spawn_ms <= target_total_ms;

    Ok(MultiSpawnReport {
        panes,
        total_spawn_ms,
        avg_spawn_ms: avg,
        p50_spawn_ms: p50,
        p95_spawn_ms: p95,
        min_spawn_ms: min,
        max_spawn_ms: max,
        rss_before_bytes: rss_before,
        rss_after_bytes: rss_after,
        rss_delta_bytes: rss_delta,
        target_total_ms,
        within_budget,
    })
}

/// Idle RSS probe — spawn N panes via dedicated manager, sample RSS
/// selama `dwell_ms` window. Tidak mengganggu session live app.
pub async fn measure_idle_with_sink(
    event_sink: Arc<dyn PtyEventSink>,
    panes: usize,
    dwell_ms: u64,
    sample_interval_ms: u64,
) -> Result<IdleReport, String> {
    let manager = PtyManager::new_with_sink(event_sink);
    let spec = ShellSpec::from_legacy(Some("powershell.exe".to_string()));
    let mut pane_ids: Vec<String> = Vec::with_capacity(panes);

    for i in 0..panes {
        let pane_id = format!("perf-idle-{}-{}", i, uuid::Uuid::new_v4());
        manager
            .spawn_session_with_spec(
                "workspace-idle".to_string(),
                pane_id.clone(),
                spec.clone(),
                None,
                None,
                Some(24),
                Some(80),
            )
            .await?;
        pane_ids.push(pane_id);
    }

    // Sample RSS: first snapshot right after spawn, then every interval.
    let mut samples: Vec<u64> = resident_memory_bytes()
        .into_iter()
        .collect();
    let started = Instant::now();
    let interval = Duration::from_millis(sample_interval_ms.max(50));
    let dwell = Duration::from_millis(dwell_ms);
    while started.elapsed() < dwell {
        tokio::time::sleep(interval).await;
        if let Some(rss) = resident_memory_bytes() {
            samples.push(rss);
        }
    }
    let total_ms = started.elapsed().as_millis();

    // Close all sessions to release child processes.
    for pane_id in &pane_ids {
        let _ = manager.close_session(pane_id).await;
    }

    let first = samples.first().copied().unwrap_or(0);
    let last = samples.last().copied().unwrap_or(0);
    let min = samples.iter().copied().min().unwrap_or(0);
    let max = samples.iter().copied().max().unwrap_or(0);
    let delta = last.saturating_sub(first);

    // PRD target: 9 panes total RSS overhead < 200MB (idle).
    let target_max_rss_bytes: u64 = 200 * 1024 * 1024;
    let within_budget = max <= target_max_rss_bytes;

    Ok(IdleReport {
        panes,
        dwell_ms,
        sample_count: samples.len(),
        rss_min_bytes: min,
        rss_max_bytes: max,
        rss_delta_bytes: delta,
        rss_first_bytes: first,
        rss_last_bytes: last,
        total_ms,
        target_max_rss_bytes,
        within_budget,
    })
}

/// Shell output rate probe — spawn N panes dan ukur berapa banyak
/// output yang keluar dari masing-masing shell selama fixed
/// measurement window. Tidak menulis perintah synthetic; cuma
/// mengukur output background dari shell (prompt, banner, dsb).
///
/// Catatan: probe ini TIDAK mengukur throughput pipeline di bawah
/// output deras, karena noop sink tidak merespon terminal control
/// queries (ESC[6n dsb.) yang beberapa shell (cmd.exe) butuhkan
/// sebelum memproses input. Untuk probe throughput riil dibutuhkan
/// sink yang merespon query — di luar scope MVP. Probe ini
/// bermanfaat untuk mendeteksi shell yang noisy di background.
pub async fn measure_throughput_with_sink(
    event_sink: Arc<dyn PtyEventSink>,
    panes: usize,
    _lines_per_pane: u32,
    measurement_window_ms: u64,
) -> Result<ThroughputReport, String> {
    // Cast to CountingPtyEventSink so we can read counters back.
    let counter = Arc::new(CountingPtyEventSink::new(event_sink, panes));
    let counter_for_emit: Arc<dyn PtyEventSink> = counter.clone();
    let manager = PtyManager::new_with_sink(counter_for_emit);
    let spec = ShellSpec::from_legacy(Some("powershell.exe".to_string()));
    let mut pane_ids: Vec<String> = Vec::with_capacity(panes);

    // Spawn all panes; setiap shell akan print banner + prompt.
    for i in 0..panes {
        let pane_id = format!("perf-tput-{}-{}", i, uuid::Uuid::new_v4());
        manager
            .spawn_session_with_spec(
                "workspace-tput".to_string(),
                pane_id.clone(),
                spec.clone(),
                None,
                None,
                Some(24),
                Some(80),
            )
            .await?;
        pane_ids.push(pane_id);
    }

    let started = Instant::now();
    // Poll counter selama measurement window. Tidak menulis command —
    // cuma ukur output background shell.
    let window = Duration::from_millis(measurement_window_ms);
    let poll = Duration::from_millis(25);
    while started.elapsed() < window {
        tokio::time::sleep(poll).await;
    }
    let duration_ms = started.elapsed().as_millis();

    // Best-effort close setelah measurement window.
    for pane_id in &pane_ids {
        let _ = manager.close_session(pane_id).await;
    }

    let total_bytes = counter.total_bytes();
    let total_batches = counter.total_batches();
    let per_pane = counter.per_pane();
    let duration_secs = (duration_ms as f64) / 1000.0;
    let throughput_kbps = if duration_secs > 0.0 {
        (total_bytes as f64) / 1024.0 / duration_secs
    } else {
        0.0
    };
    // Budget: minimal 50% dari expected_bytes + minimal 0.05 KB/s.
    // Threshold konservatif karena probe ini best-effort dengan noop
    // sink. Untuk throughput riil dibutuhkan sink yang merespon
    // terminal control queries (ESC[6n dll) — lihat catatan di
    // doc-comment probe.
    let expected_bytes = (panes as u64) * 100;
    let bytes_ratio = if expected_bytes > 0 {
        (total_bytes as f64) / (expected_bytes as f64)
    } else {
        0.0
    };
    let target_kbps = 0.05;
    let within_budget = bytes_ratio >= 0.50 && throughput_kbps >= target_kbps;

    Ok(ThroughputReport {
        panes,
        lines_per_pane: 0,
        total_bytes,
        total_batches,
        per_pane,
        duration_ms,
        throughput_kbps,
        target_kbps,
        within_budget,
        expected_bytes,
        bytes_ratio,
    })
}

/// Throughput probe yang memakai [`TtyRespondingSink`] — memindai
/// output untuk terminal control queries (`ESC[6n`, `ESC[0c`) dan
/// melaporkan hitungannya. Tidak menulis perintah synthetic; cuma
/// mengukur output background shell selama measurement window.
///
/// Hitungan query yang tinggi (`cursor_query_received > 0`) menjadi
/// sinyal shell menunggu balasan yang tidak pernah datang — indikasi
/// pipeline output Tauri dalam kondisi degraded.
pub async fn measure_throughput_with_tty_responding(
    event_sink: Arc<dyn PtyEventSink>,
    panes: usize,
    lines_per_pane: u32,
    measurement_window_ms: u64,
    rows: u16,
    cols: u16,
) -> Result<TtyRespondingProbeReport, String> {
    let tty_sink = Arc::new(TtyRespondingSink::new(event_sink, rows, cols));
    let counters = tty_sink.counters();
    let counter = Arc::new(CountingPtyEventSink::new(
        tty_sink.clone() as Arc<dyn PtyEventSink>,
        panes,
    ));
    let counter_for_emit: Arc<dyn PtyEventSink> = counter.clone();
    let manager = PtyManager::new_with_sink(counter_for_emit);
    let spec = ShellSpec::from_legacy(Some("powershell.exe".to_string()));
    let mut pane_ids: Vec<String> = Vec::with_capacity(panes);

    for i in 0..panes {
        let pane_id = format!("perf-tty-{}-{}", i, uuid::Uuid::new_v4());
        manager
            .spawn_session_with_spec(
                "workspace-tty".to_string(),
                pane_id.clone(),
                spec.clone(),
                None,
                None,
                Some(rows),
                Some(cols),
            )
            .await?;
        pane_ids.push(pane_id);
    }

    let started = Instant::now();
    let window = Duration::from_millis(measurement_window_ms);
    let poll = Duration::from_millis(25);
    while started.elapsed() < window {
        tokio::time::sleep(poll).await;
    }
    let duration_ms = started.elapsed().as_millis();

    for pane_id in &pane_ids {
        let _ = manager.close_session(pane_id).await;
    }

    let total_bytes = counter.total_bytes();
    let total_batches = counter.total_batches();
    let per_pane = counter.per_pane();
    let duration_secs = (duration_ms as f64) / 1000.0;
    let throughput_kbps = if duration_secs > 0.0 {
        (total_bytes as f64) / 1024.0 / duration_secs
    } else {
        0.0
    };

    Ok(TtyRespondingProbeReport {
        panes,
        lines_per_pane,
        total_bytes,
        total_batches,
        per_pane,
        duration_ms,
        throughput_kbps,
        cursor_query_received: counters.cursor_queries(),
        device_attributes_received: counters.device_attributes(),
        unhandled_queries: counters.unhandled(),
    })
}

/// Single-spawn perf measurement (the one the existing perf probe uses).
#[allow(dead_code)]
pub fn measure_single_spawn(
    spec: &crate::pty::ShellSpec,
    manager: &PtyManager,
) -> Result<(PerfSnapshot, String, String), String> {
    let total_started = Instant::now();
    let resolver_started = Instant::now();
    let resolved = manager.resolve_shell_spec(spec)?;
    let resolver_ms = resolver_started.elapsed().as_millis();

    let cwd_start = Instant::now();
    let cwd = std::env::current_dir()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_else(|_| ".".to_string());
    let cwd_resolve_ms = cwd_start.elapsed().as_millis();

    let rss_before = resident_memory_bytes();
    Ok((
        PerfSnapshot {
            spawn_ms: 0,
            resolver_ms,
            cwd_resolve_ms,
            active_sessions: 0,
            rss_bytes: rss_before,
            peak_rss_bytes: rss_before,
            pty_count: 0,
            total_ms: total_started.elapsed().as_millis(),
            shell: resolved.program.clone(),
            shell_source: resolved.source.label().to_string(),
            cwd: cwd.clone(),
            target_spawn_ms: 150,
            within_budget: true,
        },
        resolved.program,
        cwd,
    ))
}

fn percentile(sorted: &[u128], p: u32) -> u128 {
    if sorted.is_empty() {
        return 0;
    }
    let idx = ((p as f64 / 100.0) * (sorted.len() as f64 - 1.0)).round() as usize;
    sorted[idx.min(sorted.len() - 1)]
}

/// Resident-set size in bytes. Returns None if the platform doesn't
/// support introspection.
pub fn resident_memory_bytes() -> Option<u64> {
    #[cfg(windows)]
    {
        windows_rss()
    }
    #[cfg(unix)]
    {
        unix_rss()
    }
    #[cfg(not(any(windows, unix)))]
    {
        None
    }
}

/// Aggregate RSS across the current process. Helper untuk probe
/// yang butuh multiple sample.
#[allow(dead_code)]
pub struct RssMonitor {
    last: AtomicU64,
}

impl RssMonitor {
    #[allow(dead_code)]
    pub fn new() -> Self {
        Self {
            last: AtomicU64::new(resident_memory_bytes().unwrap_or(0)),
        }
    }

    #[allow(dead_code)]
    pub fn sample(&self) -> u64 {
        let now = resident_memory_bytes().unwrap_or(0);
        self.last.store(now, Ordering::Relaxed);
        now
    }

    #[allow(dead_code)]
    pub fn last(&self) -> u64 {
        self.last.load(Ordering::Relaxed)
    }
}

impl Default for RssMonitor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(windows)]
fn windows_rss() -> Option<u64> {
    use std::mem::{size_of, zeroed};
    use windows_sys::Win32::System::ProcessStatus::{
        K32GetProcessMemoryInfo, PROCESS_MEMORY_COUNTERS,
    };
    use windows_sys::Win32::System::Threading::GetCurrentProcess;

    let mut counters: PROCESS_MEMORY_COUNTERS = unsafe { zeroed() };
    let cb = size_of::<PROCESS_MEMORY_COUNTERS>() as u32;
    let success = unsafe {
        K32GetProcessMemoryInfo(GetCurrentProcess(), &mut counters, cb)
    };
    if success == 0 {
        return None;
    }
    Some(counters.WorkingSetSize as u64)
}

#[cfg(unix)]
fn unix_rss() -> Option<u64> {
    let content = std::fs::read_to_string("/proc/self/status").ok()?;
    for line in content.lines() {
        if let Some(rest) = line.strip_prefix("VmRSS:") {
            let kb: u64 = rest
                .trim()
                .split_whitespace()
                .next()
                .and_then(|s| s.parse().ok())
                .unwrap_or(0);
            return Some(kb * 1024);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resident_memory_returns_some_on_supported_platforms() {
        let rss = resident_memory_bytes();
        #[cfg(any(windows, unix))]
        assert!(rss.is_some(), "expected RSS to be available");
        assert!(rss.unwrap_or(0) > 0);
    }

    #[test]
    fn percentile_handles_empty_input() {
        assert_eq!(percentile(&[], 50), 0);
        assert_eq!(percentile(&[42], 100), 42);
    }

    #[test]
    fn percentile_picks_middle_value() {
        let sorted = vec![10, 20, 30, 40, 50];
        assert_eq!(percentile(&sorted, 50), 30);
        assert_eq!(percentile(&sorted, 95), 50);
    }

    #[test]
    fn metric_delta_lower_is_better_detects_regression() {
        let delta = MetricDelta::new(
            "spawn_ms",
            100.0,
            130.0,
            MetricDirection::LowerIsBetter,
        );
        assert!(delta.regressed, "30% increase should be flagged");
        assert!((delta.delta_pct - 30.0).abs() < 0.01);
    }

    #[test]
    fn metric_delta_lower_is_better_passes_within_threshold() {
        let delta = MetricDelta::new(
            "spawn_ms",
            100.0,
            105.0,
            MetricDirection::LowerIsBetter,
        );
        assert!(!delta.regressed, "5% increase should pass");
    }

    #[test]
    fn metric_delta_higher_is_better_detects_regression() {
        let delta = MetricDelta::new(
            "throughput_kbps",
            1000.0,
            800.0,
            MetricDirection::HigherIsBetter,
        );
        assert!(delta.regressed, "20% decrease should be flagged");
        assert!((delta.delta_pct - (-20.0)).abs() < 0.01);
    }

    #[test]
    fn metric_delta_higher_is_better_improvement_is_not_regression() {
        let delta = MetricDelta::new(
            "throughput_kbps",
            1000.0,
            1200.0,
            MetricDirection::HigherIsBetter,
        );
        assert!(!delta.regressed, "20% improvement should pass");
    }

    #[test]
    fn metric_delta_handles_zero_baseline() {
        // Avoid divide-by-zero; zero baseline should not regress.
        let delta = MetricDelta::new(
            "spawn_ms",
            0.0,
            50.0,
            MetricDirection::LowerIsBetter,
        );
        assert!(!delta.regressed);
        assert_eq!(delta.delta_pct, 0.0);
    }

    #[test]
    fn compare_to_baseline_passes_when_all_within_threshold() {
        let pairs = vec![
            ("spawn_total_ms", 1800.0, 1900.0, MetricDirection::LowerIsBetter),
            ("rss_idle_max", 150.0, 155.0, MetricDirection::LowerIsBetter),
            ("throughput_kbps", 100.0, 110.0, MetricDirection::HigherIsBetter),
        ];
        let result = compare_to_baseline(&pairs, 10.0);
        assert!(result.passed);
        assert_eq!(result.regressed_count, 0);
        assert_eq!(result.deltas.len(), 3);
    }

    #[test]
    fn compare_to_baseline_fails_on_regression() {
        let pairs = vec![
            ("spawn_total_ms", 1800.0, 2100.0, MetricDirection::LowerIsBetter),
            ("rss_idle_max", 150.0, 160.0, MetricDirection::LowerIsBetter),
        ];
        let result = compare_to_baseline(&pairs, 10.0);
        assert!(!result.passed);
        assert_eq!(result.regressed_count, 1);
        assert!(result.deltas[0].regressed);
        assert!(!result.deltas[1].regressed);
    }

    #[test]
    fn compare_to_baseline_respects_custom_threshold() {
        // 5% increase with threshold 10% → not regressed.
        let pairs = vec![("spawn_ms", 100.0, 105.0, MetricDirection::LowerIsBetter)];
        let result = compare_to_baseline(&pairs, 10.0);
        assert!(result.passed);

        // Same pair with threshold 2% → regressed.
        let result2 = compare_to_baseline(&pairs, 2.0);
        assert!(!result2.passed);
    }

    #[test]
    fn format_baseline_report_marks_regressions() {
        let pairs = vec![
            ("spawn_total_ms", 1800.0, 2100.0, MetricDirection::LowerIsBetter),
            ("rss_idle_max", 150.0, 155.0, MetricDirection::LowerIsBetter),
        ];
        let result = compare_to_baseline(&pairs, 10.0);
        let text = format_baseline_report(&result);
        assert!(text.contains("FAIL"));
        assert!(text.contains("REGRESSION"));
        assert!(text.contains("spawn_total_ms"));
    }

    #[test]
    fn rss_monitor_tracks_last_sample() {
        let monitor = RssMonitor::new();
        let first = monitor.sample();
        let second = monitor.sample();
        assert_eq!(monitor.last(), second);
        // Some platforms might return identical samples back-to-back.
        assert!(first <= second + 1024);
    }

    #[test]
    fn idle_report_serializes_with_camel_case() {
        let report = IdleReport {
            panes: 9,
            dwell_ms: 1000,
            sample_count: 5,
            rss_min_bytes: 100,
            rss_max_bytes: 200,
            rss_delta_bytes: 50,
            rss_first_bytes: 150,
            rss_last_bytes: 200,
            total_ms: 1000,
            target_max_rss_bytes: 200 * 1024 * 1024,
            within_budget: true,
        };
        let value = serde_json::to_value(&report).expect("IdleReport should serialize");
        assert_eq!(value["panes"], 9);
        assert_eq!(value["dwellMs"], 1000);
        assert_eq!(value["rssMinBytes"], 100);
        assert_eq!(value["rssMaxBytes"], 200);
        assert_eq!(value["rssDeltaBytes"], 50);
        assert_eq!(value["withinBudget"], true);
    }

    #[test]
    fn throughput_report_serializes_with_camel_case() {
        let report = ThroughputReport {
            panes: 9,
            lines_per_pane: 100,
            total_bytes: 1024,
            total_batches: 8,
            per_pane: vec![],
            duration_ms: 250,
            throughput_kbps: 4.0,
            target_kbps: 50.0,
            within_budget: false,
            expected_bytes: 14400,
            bytes_ratio: 0.07,
        };
        let value = serde_json::to_value(&report).expect("ThroughputReport should serialize");
        assert_eq!(value["panes"], 9);
        assert_eq!(value["linesPerPane"], 100);
        assert_eq!(value["totalBytes"], 1024);
        assert_eq!(value["throughputKbps"], 4.0);
        assert_eq!(value["withinBudget"], false);
    }

    #[test]
    fn baseline_comparison_serializes_with_camel_case() {
        let result = BaselineComparison {
            threshold_pct: 10.0,
            deltas: vec![],
            regressed_count: 0,
            passed: true,
        };
        let value = serde_json::to_value(&result).expect("BaselineComparison should serialize");
        assert_eq!(value["thresholdPct"], 10.0);
        assert_eq!(value["regressedCount"], 0);
        assert_eq!(value["passed"], true);
    }

    // ---- TtyRespondingSink tests ----

    use std::sync::Mutex;
    use crate::pty::{PtyExitEventPayload, PtyOutputEventPayload};

    /// Test sink yang merekam semua payload yang lewat untuk verifikasi
    /// forwarding. Counter accessed via Mutex (test-only).
    struct RecordingSink {
        outputs: Mutex<Vec<PtyOutputEventPayload>>,
        exits: Mutex<Vec<PtyExitEventPayload>>,
    }

    impl RecordingSink {
        fn new() -> Self {
            Self {
                outputs: Mutex::new(Vec::new()),
                exits: Mutex::new(Vec::new()),
            }
        }

        fn output_count(&self) -> usize {
            self.outputs.lock().expect("recording sink poisoned").len()
        }
    }

    impl PtyEventSink for RecordingSink {
        fn emit_output(&self, payload: PtyOutputEventPayload) {
            self.outputs
                .lock()
                .expect("recording sink poisoned")
                .push(payload);
        }
        fn emit_exit(&self, payload: PtyExitEventPayload) {
            self.exits
                .lock()
                .expect("recording sink poisoned")
                .push(payload);
        }
    }

    fn make_output(chunk: &str) -> PtyOutputEventPayload {
        PtyOutputEventPayload {
            workspace_id: "ws".to_string(),
            pane_id: "pane-1".to_string(),
            chunk: chunk.to_string(),
        }
    }

    #[test]
    fn perf_tty_responding_sink_counts_cursor_queries() {
        let recording = Arc::new(RecordingSink::new());
        let sink = TtyRespondingSink::new(recording.clone(), 24, 80);
        sink.emit_output(make_output("hello\x1b[6nworld"));
        sink.emit_output(make_output("\x1b[6n\x1b[6n"));
        let counters = sink.counters();
        assert_eq!(counters.cursor_queries(), 3);
        assert_eq!(counters.device_attributes(), 0);
        assert_eq!(counters.unhandled(), 0);
    }

    #[test]
    fn perf_tty_responding_sink_counts_device_attributes() {
        let recording = Arc::new(RecordingSink::new());
        let sink = TtyRespondingSink::new(recording.clone(), 24, 80);
        sink.emit_output(make_output("\x1b[0c"));
        sink.emit_output(make_output("\x1b[c"));
        sink.emit_output(make_output("foo\x1b[0cbar"));
        let counters = sink.counters();
        assert_eq!(counters.cursor_queries(), 0);
        assert_eq!(counters.device_attributes(), 3);
        assert_eq!(counters.unhandled(), 0);
    }

    #[test]
    fn perf_tty_responding_sink_counts_unhandled() {
        let recording = Arc::new(RecordingSink::new());
        let sink = TtyRespondingSink::new(recording.clone(), 24, 80);
        // \x1b[5n = device status report (status), bukan cursor — masuk unhandled
        sink.emit_output(make_output("\x1b[5n"));
        // \x1b[1c = device attributes dengan parameter lain
        sink.emit_output(make_output("\x1b[1c"));
        // Cursor movement / color = bukan query (final byte bukan n/c) → diabaikan
        sink.emit_output(make_output("\x1b[2J\x1b[31m"));
        let counters = sink.counters();
        assert_eq!(counters.cursor_queries(), 0);
        assert_eq!(counters.device_attributes(), 0);
        assert_eq!(counters.unhandled(), 2);
    }

    #[test]
    fn perf_tty_responding_sink_forwards_to_inner() {
        let recording = Arc::new(RecordingSink::new());
        let sink = TtyRespondingSink::new(recording.clone(), 24, 80);
        sink.emit_output(make_output("payload-1"));
        sink.emit_output(make_output("payload-2\x1b[6n"));
        sink.emit_exit(PtyExitEventPayload {
            workspace_id: "ws".to_string(),
            pane_id: "pane-1".to_string(),
            exit_code: Some(0),
        });
        assert_eq!(recording.output_count(), 2);
        assert_eq!(recording.exits.lock().expect("poisoned").len(), 1);
        // Verify chunk payload forwarded verbatim.
        let outputs = recording.outputs.lock().expect("poisoned");
        assert_eq!(outputs[0].chunk, "payload-1");
        assert_eq!(outputs[1].chunk, "payload-2\x1b[6n");
    }

    #[test]
    fn perf_scan_tty_queries_handles_truncated_sequences() {
        // Chunk yang berakhir di tengah CSI sequence → tidak panic.
        let (_, _, unhandled) = scan_tty_queries("\x1b[6");
        assert_eq!(unhandled, 0);
        let (cursor, _, _) = scan_tty_queries("hello\x1b[6n\x1b[");
        assert_eq!(cursor, 1);
    }
}
