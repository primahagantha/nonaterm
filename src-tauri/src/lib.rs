//! Root library Nonaterm untuk setup builder Tauri dan registrasi command.

mod commands;
mod config;
mod crash;
pub mod fs_watcher;
mod git;
pub mod keybind;
pub mod perf;
pub mod pty;
mod state;
pub mod templates;
mod templates_io;
mod utils;
mod vault;
pub mod window_registry;
mod workspace;

use std::path::PathBuf;

use commands::{
    config_get_app_info, git_create_worktree, git_detect_repo, git_list_branches,
    git_list_worktrees, keybind_check_conflict, keybind_clear_all_overrides,
    keybind_clear_override, keybind_get_overrides, keybind_set_override, pane_get_passthrough_list,
    pane_set_passthrough, pty_ack, pty_close, pty_resize, pty_restart, pty_spawn, pty_write,
    pty_write_binary, state_export_config, state_export_to_file, state_get_recovery_status,
    state_import_config, state_import_from_file, state_init_db, state_mark_clean_shutdown,
    state_save_snapshot, system_check_updates, system_cli_list_panes, system_cli_send,
    system_cli_status, system_detect_project_rules, system_get_default_shell,
    system_get_diagnostics, system_get_log_lines, system_get_platform, system_health_check,
    system_install_update, system_read_text_file, system_register_global_hotkey,
    system_run_crash_simulation, system_run_idle_probe, system_run_multi_spawn_probe,
    system_run_perf_probe, system_run_throughput_probe, system_run_tty_responding_probe,
    system_start_file_watcher, system_unregister_global_hotkey, templates_export, templates_import,
    templates_list, templates_materialize, vault_create, vault_delete, vault_get, vault_list,
    vault_list_groups, vault_list_tags, vault_update, window_restore_position,
    window_save_position, workspace_close_window, workspace_list, workspace_list_windows,
    workspace_open_in_new_window,
};
use tauri::Manager;
pub use templates::{MaterializedWorkspace, WorkspaceTemplate};
use tracing_appender::non_blocking::WorkerGuard;

pub struct AppState {
    pub pty_manager: pty::PtyManager,
    pub state_manager: state::StateManager,
    pub keybind_store: keybind::KeybindStore,
    pub window_registry: window_registry::WindowRegistry,
    pub app_data_dir: PathBuf,
    pub log_dir: PathBuf,
    pub _log_guard: WorkerGuard,
}

/// Menjalankan aplikasi desktop Tauri Nonaterm.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;
            let log_dir = app_data_dir.join("logs");
            let log_guard = utils::diagnostics::setup_logging(&log_dir)?;
            utils::diagnostics::setup_panic_handler(&log_dir)?;

            tracing::info!(app_data_dir = %app_data_dir.display(), log_dir = %log_dir.display(), "Nonaterm backend initialized");

            let state_manager = state::StateManager::new(app_data_dir.clone())?;
            state_manager.init_db()?;

            // KeybindStore shares SQLite db_path dengan StateManager —
            // WAL mode + foreign keys sudah disetup di kedua sisi.
            let keybind_db_path = app_data_dir.join("state").join("Nonaterm.db");
            let keybind_store = keybind::KeybindStore::new(keybind_db_path)?;

            state_manager.mark_dirty()?;

            app.manage(AppState {
                pty_manager: pty::PtyManager::new(app.handle().clone()),
                state_manager,
                keybind_store,
                window_registry: window_registry::WindowRegistry::new(),
                app_data_dir,
                log_dir,
                _log_guard: log_guard,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            pty_spawn,
            pty_close,
            pty_write,
            pty_write_binary,
            pty_resize,
            pty_ack,
            pty_restart,
            state_init_db,
            state_get_recovery_status,
            state_save_snapshot,
            state_mark_clean_shutdown,
            state_export_config,
            state_import_config,
            state_export_to_file,
            state_import_from_file,
            workspace_list,
            workspace_open_in_new_window,
            workspace_list_windows,
            window_save_position,
            window_restore_position,
            workspace_close_window,
            config_get_app_info,
            system_get_diagnostics,
            system_get_log_lines,
            system_health_check,
            system_check_updates,
            system_install_update,
            system_run_perf_probe,
            system_run_multi_spawn_probe,
            system_run_idle_probe,
            system_run_throughput_probe,
            system_run_tty_responding_probe,
            system_run_crash_simulation,
            system_read_text_file,
            system_detect_project_rules,
            system_register_global_hotkey,
            system_start_file_watcher,
            system_unregister_global_hotkey,
            system_cli_status,
            system_cli_send,
            system_cli_list_panes,
            system_get_platform,
            system_get_default_shell,
            vault_list,
            vault_get,
            vault_create,
            vault_update,
            vault_delete,
            vault_list_groups,
            vault_list_tags,
            templates_list,
            templates_materialize,
            templates_export,
            templates_import,
            git_detect_repo,
            git_list_branches,
            git_list_worktrees,
            git_create_worktree,
            keybind_get_overrides,
            keybind_set_override,
            keybind_clear_override,
            keybind_clear_all_overrides,
            keybind_check_conflict,
            pane_get_passthrough_list,
            pane_set_passthrough
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Tauri application");
}
