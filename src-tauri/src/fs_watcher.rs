//! File system watcher for detecting changes in workspace directories.
//!
//! Used by the Agent Edit Diff Strip (PRD Section 11.4) to detect when
//! AI agents modify files in the workspace.

use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileChangeEvent {
    pub path: String,
    pub kind: String, // "created" | "modified" | "deleted"
    pub workspace_id: String,
}

/// Start watching a directory for file changes.
/// Returns a watcher handle that keeps watching until dropped.
pub fn start_watching(
    workspace_id: String,
    path: &str,
    callback: impl Fn(FileChangeEvent) + Send + 'static,
) -> Result<RecommendedWatcher, String> {
    let watch_path = PathBuf::from(path);
    if !watch_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    let (tx, rx) = mpsc::channel();
    let mut watcher = RecommendedWatcher::new(
        tx,
        notify::Config::default().with_poll_interval(Duration::from_secs(1)),
    )
    .map_err(|e| format!("Failed to create watcher: {e}"))?;

    watcher
        .watch(&watch_path, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch path: {e}"))?;

    // Spawn a thread to handle events
    let ws_id = workspace_id.clone();
    std::thread::spawn(move || {
        while let Ok(res) = rx.recv() {
            match res {
                Ok(event) => {
                    let kind = match event.kind {
                        EventKind::Create(_) => "created",
                        EventKind::Modify(_) => "modified",
                        EventKind::Remove(_) => "deleted",
                        _ => continue,
                    };
                    for path in event.paths {
                        let change = FileChangeEvent {
                            path: path.to_string_lossy().to_string(),
                            kind: kind.to_string(),
                            workspace_id: ws_id.clone(),
                        };
                        callback(change);
                    }
                }
                Err(e) => {
                    eprintln!("File watch error: {e}");
                }
            }
        }
    });

    Ok(watcher)
}
