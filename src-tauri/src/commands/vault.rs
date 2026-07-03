//! Vault commands for SSH credential management.

use tauri::State;

use crate::vault::{self, VaultEntry, VaultEntryInput};
use crate::AppState;

/// List all vault entries.
#[tauri::command]
pub fn vault_list(state: State<'_, AppState>) -> Result<Vec<VaultEntry>, String> {
    let db = state
        .state_manager
        .open_db()
        .map_err(|e| format!("Database not available: {}", e))?;
    vault::list_entries(&db)
}

/// Get a single vault entry by ID.
#[tauri::command]
pub fn vault_get(state: State<'_, AppState>, id: String) -> Result<Option<VaultEntry>, String> {
    let db = state
        .state_manager
        .open_db()
        .map_err(|e| format!("Database not available: {}", e))?;
    vault::get_entry(&db, &id)
}

/// Create a new vault entry.
#[tauri::command]
pub fn vault_create(
    state: State<'_, AppState>,
    input: VaultEntryInput,
) -> Result<VaultEntry, String> {
    let db = state
        .state_manager
        .open_db()
        .map_err(|e| format!("Database not available: {}", e))?;
    let entry = VaultEntry::from_input(input, None);
    vault::insert_entry(&db, &entry)?;
    Ok(entry)
}

/// Update an existing vault entry.
#[tauri::command]
pub fn vault_update(
    state: State<'_, AppState>,
    id: String,
    input: VaultEntryInput,
) -> Result<VaultEntry, String> {
    let db = state
        .state_manager
        .open_db()
        .map_err(|e| format!("Database not available: {}", e))?;
    let entry = VaultEntry::from_input(input, Some(id));
    vault::update_entry(&db, &entry)?;
    Ok(entry)
}

/// Delete a vault entry.
#[tauri::command]
pub fn vault_delete(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state
        .state_manager
        .open_db()
        .map_err(|e| format!("Database not available: {}", e))?;
    vault::delete_entry(&db, &id)
}

/// List all unique group names.
#[tauri::command]
pub fn vault_list_groups(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let db = state
        .state_manager
        .open_db()
        .map_err(|e| format!("Database not available: {}", e))?;
    vault::list_groups(&db)
}

/// List all unique tags.
#[tauri::command]
pub fn vault_list_tags(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let db = state
        .state_manager
        .open_db()
        .map_err(|e| format!("Database not available: {}", e))?;
    vault::list_tags(&db)
}
