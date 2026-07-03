//! Vault module for storing SSH credentials securely.
//!
//! Stores SSH keys, passwords, and connection settings in SQLite.
//! All sensitive data is stored locally only.

use serde::{Deserialize, Serialize};

/// A vault entry representing an SSH connection configuration.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultEntry {
    pub id: String,
    pub label: String,
    pub group_name: Option<String>,
    pub tags: Vec<String>,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: VaultAuthType,
    pub agent_forwarding: bool,
    pub startup_command: Option<String>,
    pub proxy: Option<String>,
    pub theme_color: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Authentication type for vault entries.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum VaultAuthType {
    /// SSH key file path
    Key { path: String },
    /// SSH password (stored as-is for now, should be encrypted in production)
    Password { password: String },
}

/// Input for creating/updating a vault entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultEntryInput {
    pub label: String,
    pub group_name: Option<String>,
    pub tags: Vec<String>,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: VaultAuthType,
    pub agent_forwarding: bool,
    pub startup_command: Option<String>,
    pub proxy: Option<String>,
    pub theme_color: Option<String>,
}

impl VaultEntry {
    pub fn from_input(input: VaultEntryInput, id: Option<String>) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Self {
            id: id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
            label: input.label,
            group_name: input.group_name,
            tags: input.tags,
            host: input.host,
            port: input.port,
            username: input.username,
            auth_type: input.auth_type,
            agent_forwarding: input.agent_forwarding,
            startup_command: input.startup_command,
            proxy: input.proxy,
            theme_color: input.theme_color,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

/// Initialize the vault table in SQLite.
pub fn init_vault_table(db: &rusqlite::Connection) -> Result<(), String> {
    db.execute(
        "CREATE TABLE IF NOT EXISTS vault (
            id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            group_name TEXT,
            tags TEXT,
            host TEXT NOT NULL,
            port INTEGER NOT NULL DEFAULT 22,
            username TEXT NOT NULL,
            auth_type TEXT NOT NULL,
            agent_forwarding INTEGER NOT NULL DEFAULT 0,
            startup_command TEXT,
            proxy TEXT,
            theme_color TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| format!("Failed to create vault table: {}", e))?;
    Ok(())
}

/// List all vault entries.
pub fn list_entries(db: &rusqlite::Connection) -> Result<Vec<VaultEntry>, String> {
    let mut stmt = db
        .prepare("SELECT * FROM vault ORDER BY group_name, label")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let entries = stmt
        .query_map([], |row| {
            let tags_json: String = row.get(3)?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
            let auth_json: String = row.get(7)?;
            let auth_type: VaultAuthType =
                serde_json::from_str(&auth_json).unwrap_or(VaultAuthType::Password {
                    password: String::new(),
                });

            Ok(VaultEntry {
                id: row.get(0)?,
                label: row.get(1)?,
                group_name: row.get(2)?,
                tags,
                host: row.get(4)?,
                port: row.get(5)?,
                username: row.get(6)?,
                auth_type,
                agent_forwarding: row.get::<_, i32>(8)? != 0,
                startup_command: row.get(9)?,
                proxy: row.get(10)?,
                theme_color: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        })
        .map_err(|e| format!("Failed to query vault: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect vault entries: {}", e))?;

    Ok(entries)
}

/// Get a single vault entry by ID.
pub fn get_entry(db: &rusqlite::Connection, id: &str) -> Result<Option<VaultEntry>, String> {
    let mut stmt = db
        .prepare("SELECT * FROM vault WHERE id = ?")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let mut entries = stmt
        .query_map([id], |row| {
            let tags_json: String = row.get(3)?;
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
            let auth_json: String = row.get(7)?;
            let auth_type: VaultAuthType =
                serde_json::from_str(&auth_json).unwrap_or(VaultAuthType::Password {
                    password: String::new(),
                });

            Ok(VaultEntry {
                id: row.get(0)?,
                label: row.get(1)?,
                group_name: row.get(2)?,
                tags,
                host: row.get(4)?,
                port: row.get(5)?,
                username: row.get(6)?,
                auth_type,
                agent_forwarding: row.get::<_, i32>(8)? != 0,
                startup_command: row.get(9)?,
                proxy: row.get(10)?,
                theme_color: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        })
        .map_err(|e| format!("Failed to query vault: {}", e))?;

    entries
        .next()
        .transpose()
        .map_err(|e| format!("Failed to read vault entry: {}", e))
}

/// Insert a new vault entry.
pub fn insert_entry(db: &rusqlite::Connection, entry: &VaultEntry) -> Result<(), String> {
    let tags_json = serde_json::to_string(&entry.tags).unwrap_or_else(|_| "[]".to_string());
    let auth_json = serde_json::to_string(&entry.auth_type)
        .unwrap_or_else(|_| r#"{"type":"Password","data":{"password":""}}"#.to_string());

    db.execute(
        "INSERT INTO vault (id, label, group_name, tags, host, port, username, auth_type, agent_forwarding, startup_command, proxy, theme_color, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        rusqlite::params![
            entry.id,
            entry.label,
            entry.group_name,
            tags_json,
            entry.host,
            entry.port,
            entry.username,
            auth_json,
            entry.agent_forwarding as i32,
            entry.startup_command,
            entry.proxy,
            entry.theme_color,
            entry.created_at,
            entry.updated_at,
        ],
    )
    .map_err(|e| format!("Failed to insert vault entry: {}", e))?;

    Ok(())
}

/// Update an existing vault entry.
pub fn update_entry(db: &rusqlite::Connection, entry: &VaultEntry) -> Result<(), String> {
    let tags_json = serde_json::to_string(&entry.tags).unwrap_or_else(|_| "[]".to_string());
    let auth_json = serde_json::to_string(&entry.auth_type)
        .unwrap_or_else(|_| r#"{"type":"Password","data":{"password":""}}"#.to_string());

    let rows = db
        .execute(
            "UPDATE vault SET label=?1, group_name=?2, tags=?3, host=?4, port=?5, username=?6, auth_type=?7, agent_forwarding=?8, startup_command=?9, proxy=?10, theme_color=?11, updated_at=?12 WHERE id=?13",
            rusqlite::params![
                entry.label,
                entry.group_name,
                tags_json,
                entry.host,
                entry.port,
                entry.username,
                auth_json,
                entry.agent_forwarding as i32,
                entry.startup_command,
                entry.proxy,
                entry.theme_color,
                entry.updated_at,
                entry.id,
            ],
        )
        .map_err(|e| format!("Failed to update vault entry: {}", e))?;

    if rows == 0 {
        return Err("Vault entry not found".to_string());
    }

    Ok(())
}

/// Delete a vault entry.
pub fn delete_entry(db: &rusqlite::Connection, id: &str) -> Result<(), String> {
    let rows = db
        .execute("DELETE FROM vault WHERE id = ?", [id])
        .map_err(|e| format!("Failed to delete vault entry: {}", e))?;

    if rows == 0 {
        return Err("Vault entry not found".to_string());
    }

    Ok(())
}

/// Get all unique group names.
pub fn list_groups(db: &rusqlite::Connection) -> Result<Vec<String>, String> {
    let mut stmt = db
        .prepare("SELECT DISTINCT group_name FROM vault WHERE group_name IS NOT NULL ORDER BY group_name")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let groups = stmt
        .query_map([], |row| Ok(row.get::<_, String>(0)?))
        .map_err(|e| format!("Failed to query groups: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to collect groups: {}", e))?;

    Ok(groups)
}

/// Get all unique tags.
pub fn list_tags(db: &rusqlite::Connection) -> Result<Vec<String>, String> {
    let entries = list_entries(db)?;
    let mut tags: Vec<String> = entries
        .iter()
        .flat_map(|e| e.tags.clone())
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();
    tags.sort();
    Ok(tags)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_db() -> rusqlite::Connection {
        let db = rusqlite::Connection::open_in_memory().unwrap();
        init_vault_table(&db).unwrap();
        db
    }

    fn sample_input() -> VaultEntryInput {
        VaultEntryInput {
            label: "My Server".to_string(),
            group_name: Some("Production".to_string()),
            tags: vec!["web".to_string(), "nginx".to_string()],
            host: "192.168.1.100".to_string(),
            port: 22,
            username: "root".to_string(),
            auth_type: VaultAuthType::Password {
                password: "secret123".to_string(),
            },
            agent_forwarding: false,
            startup_command: Some("htop".to_string()),
            proxy: None,
            theme_color: Some("#3b82f6".to_string()),
        }
    }

    #[test]
    fn test_insert_and_list() {
        let db = test_db();
        let entry = VaultEntry::from_input(sample_input(), None);
        insert_entry(&db, &entry).unwrap();

        let entries = list_entries(&db).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].label, "My Server");
        assert_eq!(entries[0].host, "192.168.1.100");
    }

    #[test]
    fn test_update() {
        let db = test_db();
        let mut entry = VaultEntry::from_input(sample_input(), None);
        insert_entry(&db, &entry).unwrap();

        entry.label = "Updated Server".to_string();
        update_entry(&db, &entry).unwrap();

        let loaded = get_entry(&db, &entry.id).unwrap().unwrap();
        assert_eq!(loaded.label, "Updated Server");
    }

    #[test]
    fn test_delete() {
        let db = test_db();
        let entry = VaultEntry::from_input(sample_input(), None);
        insert_entry(&db, &entry).unwrap();
        delete_entry(&db, &entry.id).unwrap();

        let entries = list_entries(&db).unwrap();
        assert_eq!(entries.len(), 0);
    }

    #[test]
    fn test_groups_and_tags() {
        let db = test_db();
        let entry = VaultEntry::from_input(sample_input(), None);
        insert_entry(&db, &entry).unwrap();

        let groups = list_groups(&db).unwrap();
        assert_eq!(groups, vec!["Production"]);

        let tags = list_tags(&db).unwrap();
        assert!(tags.contains(&"web".to_string()));
        assert!(tags.contains(&"nginx".to_string()));
    }
}
