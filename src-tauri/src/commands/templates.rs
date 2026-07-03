//! Workspace template IPC commands.

use std::path::Path;

use tauri::State;

use crate::templates::{self, MaterializedWorkspace, WorkspaceTemplate};
use crate::templates_io::{self, TemplateExport};
use crate::AppState;

/// List semua template workspace built-in. Frontend bisa render
/// sebagai grid card.
#[tauri::command]
pub fn templates_list() -> Vec<WorkspaceTemplate> {
    templates::builtin_templates()
}

/// Materialize satu template jadi `MaterializedWorkspace` (id, name,
/// accent, layout, pane count). Frontend akan pakai metadata ini
/// untuk create workspace di store lokal.
#[tauri::command]
pub fn templates_materialize(
    id: String,
    name: Option<String>,
) -> Result<MaterializedWorkspace, String> {
    let template_id =
        templates::TemplateId::parse(&id).ok_or_else(|| format!("unknown template id: `{id}`"))?;
    let template = templates::find_template(template_id)
        .ok_or_else(|| format!("template not found: `{id}`"))?;
    Ok(template.materialize(name.as_deref()))
}

/// Ekspor workspace aktif sebagai template file JSON.
///
/// Lookup workspace by `workspace_id` di `StateManager`, build
/// `TemplateExport` (label = `name` kalau non-empty, else workspace
/// name), tulis ke `path` secara atomic (temp + rename). Return
/// `Err` kalau workspace tidak ditemukan atau I/O gagal.
#[tauri::command]
pub fn templates_export(
    state: State<'_, AppState>,
    workspace_id: String,
    name: String,
    path: String,
) -> Result<(), String> {
    let workspaces = state.state_manager.load_workspaces()?;
    let workspace = workspaces
        .into_iter()
        .find(|ws| ws.id == workspace_id)
        .ok_or_else(|| format!("workspace not found: `{workspace_id}`"))?;
    let trimmed = name.trim();
    let template_name = if trimmed.is_empty() {
        None
    } else {
        Some(trimmed)
    };
    let template = TemplateExport::from_workspace(&workspace, template_name);
    templates_io::write_template_atomic(&template, Path::new(&path))
}

/// Import template dari file JSON. Parse + validasi (id, label,
/// layoutPreset non-empty; panes non-empty). Return
/// `TemplateExport` yang bisa dipakai FE untuk create workspace
/// (mirip flow builtin template).
#[tauri::command]
pub fn templates_import(path: String) -> Result<TemplateExport, String> {
    templates_io::read_template_from_file(Path::new(&path))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn templates_list_returns_builtins() {
        let templates = templates_list();
        assert!(templates.iter().any(|t| t.label == "Blank"));
    }

    #[test]
    fn templates_materialize_returns_metadata() {
        let result = templates_materialize("frontend-dev".to_string(), Some("My App".to_string()))
            .expect("frontend-dev should resolve");
        assert_eq!(result.name, "My App");
        assert_eq!(result.pane_count, 2);
    }
}
