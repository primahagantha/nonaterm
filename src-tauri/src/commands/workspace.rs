//! Commands domain workspace.

use serde::Serialize;

/// Ringkasan workspace yang aman dikirim saat bootstrapping UI.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSummary {
    id: String,
    name: String,
    accent_color: String,
    pane_count: usize,
}

/// Mengambil daftar workspace awal untuk sidebar frontend.
#[tauri::command]
pub fn workspace_list() -> Result<Vec<WorkspaceSummary>, String> {
    Ok(vec![
        WorkspaceSummary {
            id: "workspace-Nonaterm".to_string(),
            name: "Nonaterm Core".to_string(),
            accent_color: "#7c3aed".to_string(),
            pane_count: 4,
        },
        WorkspaceSummary {
            id: "workspace-playground".to_string(),
            name: "Playground".to_string(),
            accent_color: "#0ea5e9".to_string(),
            pane_count: 2,
        },
    ])
}

#[cfg(test)]
mod tests {
    use super::workspace_list;

    #[test]
    fn returns_bootstrap_workspace_summaries() {
        let workspaces = workspace_list().expect("workspace list should be available");
        let value = serde_json::to_value(workspaces).expect("workspace list should serialize");
        let entries = value.as_array().expect("workspace list should be an array");

        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0]["id"], "workspace-Nonaterm");
        assert_eq!(entries[0]["paneCount"], 4);
        assert_eq!(entries[1]["id"], "workspace-playground");
        assert_eq!(entries[1]["paneCount"], 2);
    }
}
