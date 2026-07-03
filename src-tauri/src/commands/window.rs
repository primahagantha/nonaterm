//! Commands untuk multi-window support (PRD §7 / SDD §2.4).
//!
//! - `workspace_open_in_new_window` — detach workspace jadi OS window terpisah
//! - `workspace_list_windows` — introspect semua window aktif
//! - `workspace_close_window` — tutup window (untuk merge balik)

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};
use uuid::Uuid;

use crate::window_registry::WindowRegistry;
use crate::AppState;

pub const WINDOW_OPENED_EVENT: &str = "workspace:window-opened";
pub const WINDOW_CLOSED_EVENT: &str = "workspace:window-closed";
const WINDOW_LABEL_PREFIX: &str = "Nonaterm-ws";

/// Ringkasan sebuah window OS yang sedang terbuka.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowInfo {
    pub label: String,
    pub title: String,
    pub workspace_id: Option<String>,
}

/// Bangkitkan label window baru yang unik. Format:
/// `Nonaterm-ws-{workspace_id}-{8 char uuid}`.
fn build_window_label(workspace_id: &str) -> String {
    let short = Uuid::new_v4().simple().to_string();
    let short = &short[..8];
    let safe_ws: String = workspace_id
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect();
    format!("{}-{}-{}", WINDOW_LABEL_PREFIX, safe_ws, short)
}

/// Pasang handler `CloseRequested` ke window sehingga registry dibersihkan
/// dan event `workspace:window-closed` di-emit ke semua frontend.
pub fn attach_close_handler(
    app: &AppHandle,
    registry: WindowRegistry,
    window_label: String,
) {
    if let Some(window) = app.get_webview_window(&window_label) {
        let app_handle = app.clone();
        window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if let Some(workspace_id) = registry.remove_by_label(&window_label) {
                    let _ = app_handle.emit(
                        WINDOW_CLOSED_EVENT,
                        WindowClosedPayload {
                            workspace_id,
                            window_label: window_label.clone(),
                        },
                    );
                }
            }
        });
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WindowOpenedPayload {
    workspace_id: String,
    window_label: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WindowClosedPayload {
    workspace_id: String,
    window_label: String,
}

/// Buka window OS baru yang menampilkan `workspace_id` tertentu.
#[tauri::command]
pub async fn workspace_open_in_new_window(
    app: AppHandle,
    state: State<'_, AppState>,
    workspace_id: String,
) -> Result<String, String> {
    if workspace_id.trim().is_empty() {
        return Err("workspace_id must not be empty".to_string());
    }

    // Cegah duplikasi: workspace yang sudah punya window di-registry
    // harus di-focus, bukan bikin window baru.
    if let Some(existing_label) = state.window_registry.label_for(&workspace_id) {
        if let Some(window) = app.get_webview_window(&existing_label) {
            let _ = window.set_focus();
            return Ok(existing_label);
        }
        // Window sudah tutup tapi registry belum bersih — bersihkan
        // dulu lalu lanjut bikin window baru.
        state.window_registry.remove_by_workspace(&workspace_id);
    }

    let label = build_window_label(&workspace_id);
    let url = WebviewUrl::App(PathBuf::from("index.html"));

    // Init script menyetel hash setelah DOM siap. Path `index.html`
    // tidak bisa bawa hash langsung (PathBuf), jadi kita inject
    // lewat initialization_script.
    let init_script = format!(
        "window.addEventListener('DOMContentLoaded', function() {{ \
            var target = 'workspace={ws}'; \
            if (window.location.hash !== '#' + target) {{ \
                window.location.hash = target; \
            }} \
        }});",
        ws = workspace_id
    );

    let window = WebviewWindowBuilder::new(&app, &label, url)
        .title(format!("Nonaterm — {}", workspace_id))
        .inner_size(1200.0, 800.0)
        .min_inner_size(900.0, 600.0)
        .initialization_script(&init_script)
        .build()
        .map_err(|error| format!("failed to create window: {error}"))?;

    state
        .window_registry
        .register(&workspace_id, &label);

    // Pasang close handler dengan snapshot registry (supaya handler
    // tidak memegang reference ke State<'_> yang borrow temporary).
    attach_close_handler(&app, state.window_registry.clone(), label.clone());

    let _ = app.emit(
        WINDOW_OPENED_EVENT,
        WindowOpenedPayload {
            workspace_id: workspace_id.clone(),
            window_label: label.clone(),
        },
    );

    tracing::info!(
        workspace_id = %workspace_id,
        window_label = %label,
        "opened detached workspace window"
    );

    let _ = window; // window di-manage oleh Tauri setelah build()
    Ok(label)
}

/// List semua window OS yang sedang terbuka.
#[tauri::command]
pub fn workspace_list_windows(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<WindowInfo>, String> {
    let mut infos: Vec<WindowInfo> = Vec::new();
    for (label, window) in app.webview_windows() {
        let title = window.title().unwrap_or_default();
        let workspace_id = state.window_registry.workspace_for(&label);
        infos.push(WindowInfo {
            label,
            title,
            workspace_id,
        });
    }
    // Sort by label untuk output yang deterministik di test.
    infos.sort_by(|a, b| a.label.cmp(&b.label));
    Ok(infos)
}

/// Tutup window dengan label tertentu dan bersihkan registry.
#[tauri::command]
pub fn workspace_close_window(
    app: AppHandle,
    state: State<'_, AppState>,
    label: String,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        window
            .close()
            .map_err(|error| format!("failed to close window: {error}"))?;
    }
    // Close event handler biasanya sudah bersihkan registry, tapi
    // panggil sekali lagi agar idempotent kalau window sudah tutup.
    state.window_registry.remove_by_label(&label);
    Ok(())
}

/// Window position and size for persistence.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowPosition {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub maximized: bool,
}

/// Save current window position to a JSON file.
#[tauri::command]
pub fn window_save_position(
    app: AppHandle,
    window_label: String,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_label) {
        let pos = window.outer_position().map_err(|e| e.to_string())?;
        let size = window.outer_size().map_err(|e| e.to_string())?;
        let maximized = window.is_maximized().unwrap_or(false);

        let position = WindowPosition {
            x: pos.x as f64,
            y: pos.y as f64,
            width: size.width as f64,
            height: size.height as f64,
            maximized,
        };

        let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let positions_file = app_data_dir.join("window-positions.json");

        let mut positions: std::collections::HashMap<String, WindowPosition> =
            if let Ok(content) = std::fs::read_to_string(&positions_file) {
                serde_json::from_str(&content).unwrap_or_default()
            } else {
                std::collections::HashMap::new()
            };

        positions.insert(window_label, position);
        let json = serde_json::to_string_pretty(&positions).map_err(|e| e.to_string())?;
        std::fs::write(&positions_file, json).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Restore window position from saved data.
#[tauri::command]
pub fn window_restore_position(
    app: AppHandle,
    window_label: String,
) -> Result<bool, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let positions_file = app_data_dir.join("window-positions.json");

    let positions: std::collections::HashMap<String, WindowPosition> =
        if let Ok(content) = std::fs::read_to_string(&positions_file) {
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            return Ok(false);
        };

    if let Some(position) = positions.get(&window_label) {
        if let Some(window) = app.get_webview_window(&window_label) {
            let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: position.x as i32,
                y: position.y as i32,
            }));
            let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                width: position.width as u32,
                height: position.height as u32,
            }));
            if position.maximized {
                let _ = window.maximize();
            }
            return Ok(true);
        }
    }
    Ok(false)
}

#[cfg(test)]
mod tests {
    use super::build_window_label;

    #[test]
    fn window_label_contains_workspace_and_uuid() {
        let label = build_window_label("workspace-Nonaterm");
        assert!(label.starts_with("Nonaterm-ws-workspace-Nonaterm-"));
        // suffix harus 8 char hex
        let suffix = label.rsplit('-').next().unwrap();
        assert_eq!(suffix.len(), 8);
        assert!(suffix.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn window_label_sanitizes_unsafe_workspace_id() {
        let label = build_window_label("ws/a:b c");
        // Karakter non-alphanumeric jadi '-'
        assert!(label.starts_with("Nonaterm-ws-ws-a-b-c-"));
    }

    #[test]
    fn window_label_is_unique_per_call() {
        let a = build_window_label("ws");
        let b = build_window_label("ws");
        assert_ne!(a, b);
    }
}

