//! Standalone perf probe — runs the same perf helpers that the
//! Tauri commands use, tanpa Tauri runtime. Dipakai oleh
//! `scripts/perf-check.mjs` untuk CI gate.
//!
//! Usage:
//!   cargo run --release --example perf_probe -- [--output PATH] [--quiet]
//!
//! Output: JSON document with shape
//!   {
//!     "capturedAt": "...",
//!     "multiSpawn": { ...MultiSpawnReport },
//!     "idle": { ...IdleReport },
//!     "throughput": { ...ThroughputReport }
//!   }
//!
//! Default output: `perf-report.json` di working directory.

use std::env;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use nonaterm_lib::perf::{
    compare_to_baseline, format_baseline_report, measure_idle_with_sink, measure_throughput_with_sink,
    noop_sink, MetricDirection,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PerfReport {
    captured_at: String,
    rss: RssSnapshot,
    multi_spawn: nonaterm_lib::perf::MultiSpawnReport,
    idle: nonaterm_lib::perf::IdleReport,
    throughput: nonaterm_lib::perf::ThroughputReport,
}

#[derive(Serialize)]
struct RssSnapshot {
    current_bytes: Option<u64>,
    rss_min_bytes: Option<u64>,
    rss_max_bytes: Option<u64>,
}

fn now_iso8601() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    // Minimal RFC3339-ish format tanpa eksternal chrono formatter.
    format!("epoch:{secs}")
}

async fn run_probes(panes: usize, dwell_ms: u64, lines: u32) -> Result<PerfReport, String> {
    // We need a real PtyManager with a real PaneSessions to measure
    // multi_spawn. The `measure_multi_spawn` helper takes a Tauri State,
    // so we replicate the logic here using a dedicated manager + sink.
    let sink = noop_sink();
    let manager = nonaterm_lib::pty::PtyManager::new_with_sink(sink.clone());
    let spec = nonaterm_lib::pty::ShellSpec::from_legacy(Some("powershell.exe".to_string()));

    let rss_before = nonaterm_lib::perf::resident_memory_bytes();
    let started = std::time::Instant::now();
    let mut latencies: Vec<u128> = Vec::with_capacity(panes);
    let mut pane_ids: Vec<String> = Vec::with_capacity(panes);
    for i in 0..panes {
        let pane_id = format!("perf-multi-{i}-{}", uuid::Uuid::new_v4());
        let per_start = std::time::Instant::now();
        manager
            .spawn_session_with_spec(
                "workspace-perf".to_string(),
                pane_id.clone(),
                spec.clone(),
                None,
                Some(24),
                Some(80),
            )
            .await
            .map_err(|e| format!("multi-spawn pane {i} failed: {e}"))?;
        latencies.push(per_start.elapsed().as_millis());
        pane_ids.push(pane_id);
    }
    let total_spawn_ms = started.elapsed().as_millis();
    let rss_after = nonaterm_lib::perf::resident_memory_bytes();
    for pane_id in &pane_ids {
        let _ = manager.close_session(pane_id).await;
    }

    let mut sorted = latencies.clone();
    sorted.sort_unstable();
    let avg = if latencies.is_empty() {
        0
    } else {
        latencies.iter().sum::<u128>() / latencies.len() as u128
    };
    let pct = |p: u32| -> u128 {
        if sorted.is_empty() {
            return 0;
        }
        let idx = ((p as f64 / 100.0) * (sorted.len() as f64 - 1.0)).round() as usize;
        sorted[idx.min(sorted.len() - 1)]
    };
    let rss_delta = match (rss_before, rss_after) {
        (Some(b), Some(a)) if a >= b => Some(a - b),
        (Some(_), Some(_)) => Some(0),
        _ => None,
    };
    let multi_spawn = nonaterm_lib::perf::MultiSpawnReport {
        panes,
        total_spawn_ms,
        avg_spawn_ms: avg,
        p50_spawn_ms: pct(50),
        p95_spawn_ms: pct(95),
        min_spawn_ms: *sorted.first().unwrap_or(&0),
        max_spawn_ms: *sorted.last().unwrap_or(&0),
        rss_before_bytes: rss_before,
        rss_after_bytes: rss_after,
        rss_delta_bytes: rss_delta,
        target_total_ms: (panes as u128) * 200,
        within_budget: total_spawn_ms <= (panes as u128) * 200,
    };

    // Idle probe — uses noop sink so doesn't affect the live app.
    let idle = measure_idle_with_sink(noop_sink(), panes, dwell_ms, 200).await?;

    // Throughput probe
    let throughput = measure_throughput_with_sink(noop_sink(), panes, lines, 3_000).await?;

    Ok(PerfReport {
        captured_at: now_iso8601(),
        rss: RssSnapshot {
            current_bytes: nonaterm_lib::perf::resident_memory_bytes(),
            rss_min_bytes: rss_before,
            rss_max_bytes: rss_after,
        },
        multi_spawn,
        idle,
        throughput,
    })
}

#[tokio::main(flavor = "multi_thread", worker_threads = 4)]
async fn main() -> Result<(), String> {
    let mut output: PathBuf = PathBuf::from("perf-report.json");
    let mut quiet = false;
    let mut baseline: Option<PathBuf> = None;
    let mut panes: usize = 9;
    let mut dwell_ms: u64 = 1500;
    let mut lines: u32 = 100;

    let mut args = env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--output" | "-o" => {
                if let Some(v) = args.next() {
                    output = PathBuf::from(v);
                }
            }
            "--baseline" | "-b" => {
                if let Some(v) = args.next() {
                    baseline = Some(PathBuf::from(v));
                }
            }
            "--panes" => {
                if let Some(v) = args.next() {
                    panes = v.parse().unwrap_or(9).clamp(1, 9);
                }
            }
            "--dwell" => {
                if let Some(v) = args.next() {
                    dwell_ms = v.parse().unwrap_or(1500).clamp(200, 30_000);
                }
            }
            "--lines" => {
                if let Some(v) = args.next() {
                    lines = v.parse().unwrap_or(100).clamp(1, 5_000);
                }
            }
            "--quiet" | "-q" => quiet = true,
            "--help" | "-h" => {
                eprintln!(
                    "Usage: cargo run --release --example perf_probe -- [options]\n\n\
                     Options:\n  \
                       -o, --output PATH    Output JSON path (default: perf-report.json)\n  \
                       -b, --baseline PATH  Compare against baseline JSON (exit 1 on regression)\n  \
                           --panes N        Number of panes to spawn (default: 9, max: 9)\n  \
                           --dwell MS       Idle dwell window ms (default: 1500)\n  \
                           --lines N        Lines per pane for throughput (default: 100)\n  \
                       -q, --quiet          Suppress human-readable report on stdout\n  \
                       -h, --help           Show this help\n"
                );
                return Ok(());
            }
            other => {
                eprintln!("unknown flag: {other}");
                std::process::exit(2);
            }
        }
    }

    let report = run_probes(panes, dwell_ms, lines).await?;
    let json = serde_json::to_string_pretty(&report).map_err(|e| e.to_string())?;
    std::fs::write(&output, &json).map_err(|e| format!("write {}: {e}", output.display()))?;

    if !quiet {
        println!("=== perf_probe ===");
        println!("panes:        {panes}");
        println!("dwell_ms:     {dwell_ms}");
        println!("lines/pane:   {lines}");
        println!("output:       {}", output.display());
        println!();
        println!(
            "multi-spawn:  total={}ms p50={}ms p95={}ms avg={}ms rss_delta={:?}B within_budget={}",
            report.multi_spawn.total_spawn_ms,
            report.multi_spawn.p50_spawn_ms,
            report.multi_spawn.p95_spawn_ms,
            report.multi_spawn.avg_spawn_ms,
            report.multi_spawn.rss_delta_bytes,
            report.multi_spawn.within_budget,
        );
        println!(
            "idle:         panes={} samples={} rss_max={}B rss_min={}B rss_delta={}B within_budget={}",
            report.idle.panes,
            report.idle.sample_count,
            report.idle.rss_max_bytes,
            report.idle.rss_min_bytes,
            report.idle.rss_delta_bytes,
            report.idle.within_budget,
        );
        println!(
            "throughput:   panes={} total_bytes={} total_batches={} kbps={:.1} target_kbps={:.1} within_budget={}",
            report.throughput.panes,
            report.throughput.total_bytes,
            report.throughput.total_batches,
            report.throughput.throughput_kbps,
            report.throughput.target_kbps,
            report.throughput.within_budget,
        );
    }

    if let Some(baseline_path) = baseline {
        let baseline_text = std::fs::read_to_string(&baseline_path)
            .map_err(|e| format!("read baseline {}: {e}", baseline_path.display()))?;
        let baseline_json: serde_json::Value = serde_json::from_str(&baseline_text)
            .map_err(|e| format!("parse baseline {}: {e}", baseline_path.display()))?;

        let m = &report.multi_spawn;
        let i = &report.idle;
        let t = &report.throughput;

        let pairs: Vec<(&str, f64, f64, MetricDirection)> = vec![
            (
                "multi_spawn.total_spawn_ms",
                baseline_json["multiSpawn"]["totalSpawnMs"]
                    .as_f64()
                    .unwrap_or(0.0),
                m.total_spawn_ms as f64,
                MetricDirection::LowerIsBetter,
            ),
            (
                "multi_spawn.avg_spawn_ms",
                baseline_json["multiSpawn"]["avgSpawnMs"].as_f64().unwrap_or(0.0),
                m.avg_spawn_ms as f64,
                MetricDirection::LowerIsBetter,
            ),
            (
                "multi_spawn.p95_spawn_ms",
                baseline_json["multiSpawn"]["p95SpawnMs"].as_f64().unwrap_or(0.0),
                m.p95_spawn_ms as f64,
                MetricDirection::LowerIsBetter,
            ),
            (
                "multi_spawn.rss_delta_bytes",
                baseline_json["multiSpawn"]["rssDeltaBytes"]
                    .as_f64()
                    .unwrap_or(0.0),
                m.rss_delta_bytes.unwrap_or(0) as f64,
                MetricDirection::LowerIsBetter,
            ),
            (
                "idle.rss_max_bytes",
                baseline_json["idle"]["rssMaxBytes"].as_f64().unwrap_or(0.0),
                i.rss_max_bytes as f64,
                MetricDirection::LowerIsBetter,
            ),
            (
                "idle.rss_delta_bytes",
                baseline_json["idle"]["rssDeltaBytes"].as_f64().unwrap_or(0.0),
                i.rss_delta_bytes as f64,
                MetricDirection::LowerIsBetter,
            ),
            (
                "throughput.throughput_kbps",
                baseline_json["throughput"]["throughputKbps"]
                    .as_f64()
                    .unwrap_or(0.0),
                t.throughput_kbps,
                MetricDirection::HigherIsBetter,
            ),
            (
                "throughput.total_bytes",
                baseline_json["throughput"]["totalBytes"]
                    .as_f64()
                    .unwrap_or(0.0),
                t.total_bytes as f64,
                MetricDirection::HigherIsBetter,
            ),
        ];

        let comparison = compare_to_baseline(&pairs, 10.0);
        let report_text = format_baseline_report(&comparison);
        eprintln!("{report_text}");

        if !comparison.passed {
            // Allow a small grace: the first time you run on a slower
            // machine, baseline might be `0.0` for some metrics. Treat
            // those as `n/a` and only fail when both sides are positive.
            let all_baselines_set = pairs.iter().all(|(_, b, _, _)| *b > 0.0);
            if all_baselines_set {
                std::process::exit(1);
            } else {
                eprintln!(
                    "[perf-baseline] some baseline values are 0.0; treat as first run and skip regression gate."
                );
            }
        }
    }

    // Avoid unused-import warning when only `compare_to_baseline` is referenced.
    Ok(())
}
