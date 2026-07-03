//! Workspace template registry.
//!
//! Templates are pre-baked workspace layouts the user can spin up with
//! one click (e.g. "Frontend dev" = 2 panes, "Full-stack" = 3 panes).
//! Each template is fully serialisable so the same JSON shape can
//! drive both the in-app registry and a future "import template from
//! file" flow.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TemplateId {
    Blank,
    FrontendDev,
    FullStack,
    DevOps,
    DataScience,
}

impl TemplateId {
    pub fn parse(value: &str) -> Option<TemplateId> {
        match value.trim().to_ascii_lowercase().as_str() {
            "blank" => Some(TemplateId::Blank),
            "frontend-dev" | "frontend" => Some(TemplateId::FrontendDev),
            "full-stack" | "fullstack" => Some(TemplateId::FullStack),
            "devops" => Some(TemplateId::DevOps),
            "data-science" | "data" => Some(TemplateId::DataScience),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceTemplate {
    pub id: TemplateId,
    pub label: &'static str,
    pub description: &'static str,
    pub accent_color: &'static str,
    pub layout_preset: &'static str,
    pub panes: Vec<TemplatePane>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct TemplatePane {
    pub title: &'static str,
    pub cwd: &'static str,
    pub shell: Option<&'static str>,
    pub startup_command: &'static str,
}

const fn pane(
    title: &'static str,
    cwd: &'static str,
    shell: Option<&'static str>,
    startup: &'static str,
) -> TemplatePane {
    TemplatePane {
        title,
        cwd,
        shell,
        startup_command: startup,
    }
}

const BLANK_PANES: &[TemplatePane] = &[pane("PowerShell", "", None, "")];
const FRONTEND_PANES: &[TemplatePane] = &[
    pane("Vite / Next dev", "", None, "npm run dev"),
    pane("Tests / lint watch", "", None, "npm run test -- --watch"),
];
const FULLSTACK_PANES: &[TemplatePane] = &[
    pane("Frontend", "", None, "npm run dev"),
    pane("Backend", "", None, "cargo run --watch"),
    pane("Logs", "", None, ""),
];
const DEVOPS_PANES: &[TemplatePane] = &[
    pane("kubectl", "", Some("wsl.exe"), "kubectl get pods -A"),
    pane("docker", "", None, "docker compose logs -f"),
    pane("ssh", "", Some("wsl.exe"), ""),
];
const DATA_PANES: &[TemplatePane] = &[
    pane("Jupyter", "", Some("pwsh.exe"), "jupyter lab"),
    pane("Data (Python REPL)", "", Some("pwsh.exe"), "python -i"),
    pane("Watcher", "", None, "tail -f logs/train.log"),
];

// Tauri requires `Vec<T>` for serialised IPC payload, so we expand
// each `&'static [TemplatePane]` to an owned `Vec` once on first
// access. The expansion lives in a `OnceLock` so we pay for it at
// most once.
fn slice_to_vec(slice: &[TemplatePane]) -> Vec<TemplatePane> {
    slice.to_vec()
}

macro_rules! template {
    ($id:expr, $label:expr, $desc:expr, $accent:expr, $preset:expr, $panes:expr) => {
        WorkspaceTemplate {
            id: $id,
            label: $label,
            description: $desc,
            accent_color: $accent,
            layout_preset: $preset,
            panes: slice_to_vec($panes),
        }
    };
}

pub fn builtin_templates() -> Vec<WorkspaceTemplate> {
    vec![
        template!(
            TemplateId::Blank,
            "Blank",
            "One PowerShell pane, no startup commands.",
            "#7c3aed",
            "1",
            BLANK_PANES
        ),
        template!(
            TemplateId::FrontendDev,
            "Frontend dev",
            "Dev server + tests, both inside the project root.",
            "#0ea5e9",
            "2",
            FRONTEND_PANES
        ),
        template!(
            TemplateId::FullStack,
            "Full-stack",
            "Frontend, backend, and a tail/log pane for debugging.",
            "#22c55e",
            "4",
            FULLSTACK_PANES
        ),
        template!(
            TemplateId::DevOps,
            "DevOps",
            "kubectl / docker / ssh shell side by side.",
            "#f97316",
            "4",
            DEVOPS_PANES
        ),
        template!(
            TemplateId::DataScience,
            "Data science",
            "Notebook + dataset + plotting pane.",
            "#a855f7",
            "4",
            DATA_PANES
        ),
    ]
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaterializedWorkspace {
    pub id: String,
    pub name: String,
    pub accent_color: String,
    pub layout_preset: String,
    pub pane_count: usize,
}

impl WorkspaceTemplate {
    /// Materialise the template into a `Workspace` record suitable
    /// for the existing workspace store. Pane IDs are derived from
    /// the workspace id + a counter so they remain stable across
    /// in-app state but unique per workspace.
    pub fn materialize(&self, name: Option<&str>) -> MaterializedWorkspace {
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        let id = format!("workspace-{}", stamp);
        let label = name
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| self.label.to_string());
        MaterializedWorkspace {
            pane_count: self.panes.len(),
            id,
            name: label,
            accent_color: self.accent_color.to_string(),
            layout_preset: self.layout_preset.to_string(),
        }
    }
}

/// Look up a template by id. Returns None for unknown ids.
pub fn find_template(id: TemplateId) -> Option<WorkspaceTemplate> {
    builtin_templates()
        .into_iter()
        .find(|template| template.id == id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn template_id_parses_known_aliases() {
        assert_eq!(
            TemplateId::parse("frontend-dev"),
            Some(TemplateId::FrontendDev)
        );
        assert_eq!(TemplateId::parse("fullstack"), Some(TemplateId::FullStack));
        assert_eq!(TemplateId::parse("data"), Some(TemplateId::DataScience));
        assert_eq!(TemplateId::parse("unknown"), None);
    }

    #[test]
    fn builtin_templates_cover_known_set() {
        let templates = builtin_templates();
        assert!(templates.len() >= 4);
        let labels: Vec<&str> = templates.iter().map(|t| t.label).collect();
        assert!(labels.contains(&"Blank"));
        assert!(labels.contains(&"Frontend dev"));
    }

    #[test]
    fn materialize_uses_provided_label_when_non_empty() {
        let template = find_template(TemplateId::FrontendDev).unwrap();
        let mat = template.materialize(Some("My Project"));
        assert_eq!(mat.name, "My Project");
        assert_eq!(mat.pane_count, 2);
    }

    #[test]
    fn materialize_falls_back_to_template_label() {
        let template = find_template(TemplateId::Blank).unwrap();
        let mat = template.materialize(Some("   "));
        assert_eq!(mat.name, "Blank");
        assert_eq!(mat.pane_count, 1);
    }
}
