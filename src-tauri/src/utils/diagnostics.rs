//! Logging, panic reporting, dan ringkasan diagnostics runtime.

use std::backtrace::Backtrace;
use std::fs;
use std::path::{Path, PathBuf};

use chrono::Utc;
use serde::Serialize;
use tracing_appender::non_blocking::WorkerGuard;
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticsSummary {
    pub app_data_dir: String,
    pub log_dir: String,
    pub latest_log_file: Option<String>,
    pub recent_crash_reports: Vec<String>,
}

pub fn ensure_log_dir(log_dir: &Path) -> std::io::Result<()> {
    fs::create_dir_all(log_dir)
}

pub fn setup_logging(log_dir: &Path) -> std::io::Result<WorkerGuard> {
    ensure_log_dir(log_dir)?;

    let file_appender = RollingFileAppender::new(Rotation::DAILY, log_dir, "Nonaterm.log");
    let (file_writer, guard) = tracing_appender::non_blocking(file_appender);

    tracing_subscriber::registry()
        .with(
            fmt::layer()
                .with_target(true)
                .with_thread_ids(true)
                .with_file(true)
                .with_line_number(true),
        )
        .with(fmt::layer().with_writer(file_writer).json())
        .with(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("Nonaterm=info,tauri=warn,wry=warn")),
        )
        .try_init()
        .ok();

    Ok(guard)
}

pub fn setup_panic_handler(log_dir: &Path) -> std::io::Result<()> {
    ensure_log_dir(log_dir)?;
    let log_dir = log_dir.to_path_buf();

    std::panic::set_hook(Box::new(move |panic_info| {
        let backtrace = Backtrace::force_capture();
        let timestamp = Utc::now();
        let crash_report = format!(
            "=== Nonaterm CRASH REPORT ===\nTimestamp: {}\nVersion: {}\nOS: {}\n\nPanic: {}\n\nBacktrace:\n{}",
            timestamp,
            env!("CARGO_PKG_VERSION"),
            std::env::consts::OS,
            panic_info,
            backtrace,
        );

        let crash_file = log_dir.join(format!("crash-{}.log", timestamp.format("%Y%m%d-%H%M%S")));
        let _ = fs::write(&crash_file, &crash_report);
        tracing::error!(crash_file = %crash_file.display(), "{}", crash_report);
    }));

    Ok(())
}

pub fn collect_summary(app_data_dir: &Path, log_dir: &Path) -> DiagnosticsSummary {
    DiagnosticsSummary {
        app_data_dir: app_data_dir.display().to_string(),
        log_dir: log_dir.display().to_string(),
        latest_log_file: latest_file_with_prefix(log_dir, "Nonaterm.log"),
        recent_crash_reports: recent_files_with_prefix(log_dir, "crash-", 5),
    }
}

pub fn latest_log_file_path(log_dir: &Path) -> Option<PathBuf> {
    let mut candidates = recent_paths_with_prefix(log_dir, "Nonaterm.log");
    candidates.sort();
    candidates.pop()
}

fn latest_file_with_prefix(dir: &Path, prefix: &str) -> Option<String> {
    let mut candidates = recent_paths_with_prefix(dir, prefix);
    candidates.sort();
    candidates.pop().map(|path| path.display().to_string())
}

fn recent_files_with_prefix(dir: &Path, prefix: &str, limit: usize) -> Vec<String> {
    let mut paths = recent_paths_with_prefix(dir, prefix);
    paths.sort();
    paths.reverse();
    paths
        .into_iter()
        .take(limit)
        .map(|path| path.display().to_string())
        .collect()
}

fn recent_paths_with_prefix(dir: &Path, prefix: &str) -> Vec<PathBuf> {
    let Ok(entries) = fs::read_dir(dir) else {
        return Vec::new();
    };

    entries
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| name.starts_with(prefix))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{collect_summary, ensure_log_dir};

    #[test]
    fn collects_recent_crash_reports_from_log_dir() {
        let temp_dir =
            std::env::temp_dir().join(format!("Nonaterm-diagnostics-{}", std::process::id()));
        let log_dir = temp_dir.join("logs");
        ensure_log_dir(&log_dir).expect("log dir should be created");

        std::fs::write(log_dir.join("Nonaterm.log.2026-06-18"), "{}")
            .expect("log file should be written");
        std::fs::write(log_dir.join("crash-20260618-000001.log"), "crash")
            .expect("crash file should be written");

        let summary = collect_summary(&temp_dir, &log_dir);

        assert_eq!(summary.log_dir, log_dir.display().to_string());
        assert_eq!(summary.recent_crash_reports.len(), 1);

        let _ = std::fs::remove_dir_all(temp_dir);
    }
}
