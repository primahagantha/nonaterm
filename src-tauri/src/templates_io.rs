//! Workspace template export/import (JSON file format).
//!
//! Memungkinkan user menyimpan workspace aktif sebagai template file
//! (untuk di-share antar mesin) dan mengimpor template dari file
//! JSON. Format on-disk independen dari `WorkspaceTemplate` builtin
//! karena `id` bisa berupa string arbitrary (bukan enum `TemplateId`)
//! dan field-nya owned `String` (bukan `&'static str`).
//!
//! Bentuk JSON ditulis dengan `#[serde(rename_all = "camelCase")]`
//! supaya match dengan `WorkspaceTemplate` TypeScript di
//! `src/types/ipc.ts`.

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::state::WorkspaceSnapshot;

/// On-disk template format. Bentuknya cocok dengan FE type
/// `WorkspaceTemplate` (camelCase) di `src/types/ipc.ts`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TemplateExport {
    pub id: String,
    pub label: String,
    pub description: String,
    pub accent_color: String,
    pub layout_preset: String,
    pub panes: Vec<TemplateExportPane>,
}

/// On-disk pane spec. Bentuknya cocok dengan FE type
/// `TemplatePaneSpec`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TemplateExportPane {
    pub title: String,
    pub cwd: String,
    pub shell: Option<String>,
    pub startup_command: String,
}

impl TemplateExport {
    /// Bangun template dari `WorkspaceSnapshot` (baca dari
    /// `StateManager::load_workspaces`). `name` override label;
    /// kalau kosong/whitespace, pakai `workspace.name`.
    pub fn from_workspace(workspace: &WorkspaceSnapshot, name: Option<&str>) -> Self {
        let label = name
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(str::to_string)
            .unwrap_or_else(|| workspace.name.clone());
        TemplateExport {
            id: workspace.id.clone(),
            label,
            description: String::new(),
            accent_color: workspace.accent_color.clone(),
            layout_preset: workspace.layout_preset.clone(),
            panes: workspace
                .panes
                .iter()
                .map(|pane| TemplateExportPane {
                    title: pane.title.clone(),
                    cwd: pane.cwd.clone(),
                    shell: None,
                    startup_command: pane.startup_command.clone(),
                })
                .collect(),
        }
    }

    /// Validasi field wajib. Return `Err` dengan pesan deskriptif
    /// kalau ada yang missing/empty.
    pub fn validate(&self) -> Result<(), String> {
        if self.id.trim().is_empty() {
            return Err("template `id` is required".to_string());
        }
        if self.label.trim().is_empty() {
            return Err("template `label` is required".to_string());
        }
        if self.layout_preset.trim().is_empty() {
            return Err("template `layoutPreset` is required".to_string());
        }
        if self.panes.is_empty() {
            return Err("template must have at least one pane (got empty `panes` array)".to_string());
        }
        for (index, pane) in self.panes.iter().enumerate() {
            if pane.title.trim().is_empty() {
                return Err(format!("pane[{index}] `title` is required"));
            }
        }
        Ok(())
    }

    /// Serialize ke pretty JSON string.
    pub fn to_pretty_json(&self) -> Result<String, String> {
        serde_json::to_string_pretty(self).map_err(|error| error.to_string())
    }

    /// Parse dari JSON string + validasi. Return `Err` kalau JSON
    /// invalid atau field wajib missing/empty.
    pub fn from_json(text: &str) -> Result<Self, String> {
        let template: TemplateExport = serde_json::from_str(text)
            .map_err(|error| format!("invalid template JSON: {error}"))?;
        template.validate()?;
        Ok(template)
    }
}

/// Tulis template ke `path` secara atomic: tulis ke `<path>.tmp`
/// dulu, lalu `rename` ke `path`. Pattern ini mirror
/// `StateManager::write_json_snapshot` supaya crash mid-write tidak
/// meninggalkan file setengah jadi.
pub fn write_template_atomic(template: &TemplateExport, path: &Path) -> Result<(), String> {
    let json = template.to_pretty_json()?;
    let temp_path = temp_sibling(path, ".tmp");
    fs::write(&temp_path, json).map_err(|error| format!("failed to write temp file: {error}"))?;
    fs::rename(&temp_path, path).map_err(|error| format!("failed to rename temp file: {error}"))?;
    Ok(())
}

/// Baca template dari `path` lalu parse + validasi.
pub fn read_template_from_file(path: &Path) -> Result<TemplateExport, String> {
    let text = fs::read_to_string(path).map_err(|error| format!("failed to read file: {error}"))?;
    TemplateExport::from_json(&text)
}

/// Build path sibling untuk file temporary: append suffix ke nama
/// file tanpa mengubah direktori. Mis. `/x/foo.json` → `/x/foo.json.tmp`.
fn temp_sibling(path: &Path, suffix: &str) -> PathBuf {
    let mut name = path
        .file_name()
        .map(|os| os.to_string_lossy().into_owned())
        .unwrap_or_else(|| "template".to_string());
    name.push_str(suffix);
    path.with_file_name(name)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_workspace() -> WorkspaceSnapshot {
        WorkspaceSnapshot {
            id: "workspace-alpha".to_string(),
            name: "Alpha".to_string(),
            accent_color: "#7c3aed".to_string(),
            layout_preset: "2".to_string(),
            panes: vec![
                crate::state::WorkspacePaneSnapshot {
                    id: "p-1".to_string(),
                    title: "Agent".to_string(),
                    cwd: "D:\\production\\Nonaterm".to_string(),
                    startup_command: "npm run dev".to_string(),
                },
                crate::state::WorkspacePaneSnapshot {
                    id: "p-2".to_string(),
                    title: "Build".to_string(),
                    cwd: String::new(),
                    startup_command: String::new(),
                },
            ],
        }
    }

    fn tmp_path(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "Nonaterm-templates-{}-{}.json",
            label,
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ))
    }

    #[test]
    fn from_workspace_uses_provided_label_when_non_empty() {
        let ws = sample_workspace();
        let tpl = TemplateExport::from_workspace(&ws, Some("My Template"));
        assert_eq!(tpl.label, "My Template");
        assert_eq!(tpl.id, "workspace-alpha");
        assert_eq!(tpl.accent_color, "#7c3aed");
        assert_eq!(tpl.layout_preset, "2");
        assert_eq!(tpl.panes.len(), 2);
        assert_eq!(tpl.panes[0].title, "Agent");
        assert_eq!(tpl.panes[0].cwd, "D:\\production\\Nonaterm");
        assert_eq!(tpl.panes[0].startup_command, "npm run dev");
        assert_eq!(tpl.panes[0].shell, None);
    }

    #[test]
    fn from_workspace_falls_back_to_workspace_name() {
        let ws = sample_workspace();
        let tpl = TemplateExport::from_workspace(&ws, Some("   "));
        assert_eq!(tpl.label, "Alpha");
    }

    #[test]
    fn export_writes_valid_json() {
        let ws = sample_workspace();
        let tpl = TemplateExport::from_workspace(&ws, Some("Exported"));
        let path = tmp_path("export-writes");

        write_template_atomic(&tpl, &path).expect("write harus sukses");

        let raw = fs::read_to_string(&path).expect("file harus ada");
        let value: serde_json::Value =
            serde_json::from_str(&raw).expect("file harus parse-able JSON");
        assert_eq!(value["id"], "workspace-alpha");
        assert_eq!(value["label"], "Exported");
        assert_eq!(value["accentColor"], "#7c3aed");
        assert_eq!(value["layoutPreset"], "2");
        assert!(value["panes"].is_array());
        assert_eq!(value["panes"].as_array().unwrap().len(), 2);
        assert_eq!(value["panes"][0]["title"], "Agent");
        assert_eq!(value["panes"][0]["startupCommand"], "npm run dev");

        let _ = fs::remove_file(&path);
    }

    #[test]
    fn import_roundtrips_exported_template() {
        let ws = sample_workspace();
        let original = TemplateExport::from_workspace(&ws, Some("Roundtrip"));
        let path = tmp_path("roundtrip");

        write_template_atomic(&original, &path).expect("write harus sukses");
        let restored = read_template_from_file(&path).expect("read harus sukses");

        assert_eq!(restored, original);
        assert_eq!(restored.label, "Roundtrip");
        assert_eq!(restored.panes.len(), 2);
        assert_eq!(restored.panes[1].title, "Build");

        let _ = fs::remove_file(&path);
    }

    #[test]
    fn import_rejects_malformed_json() {
        let result = TemplateExport::from_json("{ not valid }");
        assert!(result.is_err(), "JSON invalid harus return error");
        let msg = result.unwrap_err();
        assert!(
            msg.contains("invalid template JSON"),
            "error harus mention JSON: got `{msg}`"
        );
    }

    #[test]
    fn import_rejects_missing_required_fields() {
        // Missing `label` and `panes`.
        let raw = r##"{
            "id": "x",
            "description": "",
            "accentColor": "#000",
            "layoutPreset": "1"
        }"##;
        let result = TemplateExport::from_json(raw);
        assert!(result.is_err(), "missing fields harus return error");
    }

    #[test]
    fn import_rejects_empty_label() {
        let raw = r##"{
            "id": "x",
            "label": "   ",
            "description": "",
            "accentColor": "#000",
            "layoutPreset": "1",
            "panes": [{"title": "P", "cwd": "", "shell": null, "startupCommand": ""}]
        }"##;
        let result = TemplateExport::from_json(raw);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("label"));
    }

    #[test]
    fn import_rejects_empty_panes_array() {
        let raw = r##"{
            "id": "x",
            "label": "Blank",
            "description": "",
            "accentColor": "#000",
            "layoutPreset": "1",
            "panes": []
        }"##;
        let result = TemplateExport::from_json(raw);
        assert!(result.is_err(), "empty panes harus return error");
        let msg = result.unwrap_err();
        assert!(
            msg.contains("at least one pane"),
            "error harus mention panes: got `{msg}`"
        );
    }

    #[test]
    fn write_template_atomic_uses_tmp_then_rename() {
        // Negative case: write to directory yang tidak ada harus error
        // dan TIDAK membuat file orphan di parent.
        let bad_path = std::env::temp_dir().join("definitely-not-a-real-dir-xyz").join("template.json");
        let ws = sample_workspace();
        let tpl = TemplateExport::from_workspace(&ws, Some("Neg"));

        let result = write_template_atomic(&tpl, &bad_path);
        assert!(result.is_err());
        assert!(!bad_path.exists());
    }
}