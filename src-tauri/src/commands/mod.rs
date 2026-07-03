//! IPC command handlers yang diekspos ke frontend.

mod config;
mod git;
mod keybind;
mod pty;
mod state;
mod system;
mod templates;
mod vault;
mod window;
mod workspace;

pub use config::config_get_app_info;
pub use git::{git_create_worktree, git_detect_repo, git_list_branches, git_list_worktrees};
pub use keybind::{
    keybind_check_conflict, keybind_clear_all_overrides, keybind_clear_override,
    keybind_get_overrides, keybind_set_override, pane_get_passthrough_list, pane_set_passthrough,
};
pub use pty::{
    pty_ack, pty_close, pty_resize, pty_restart, pty_spawn, pty_write, pty_write_binary,
};
pub use state::{
    state_export_config, state_export_to_file, state_get_recovery_status, state_import_config,
    state_import_from_file, state_init_db, state_mark_clean_shutdown, state_save_snapshot,
};
pub use system::{
    system_check_updates, system_cli_list_panes, system_cli_send, system_cli_status,
    system_detect_project_rules, system_get_default_shell, system_get_diagnostics,
    system_get_log_lines, system_get_platform, system_health_check, system_install_update,
    system_read_text_file, system_register_global_hotkey, system_run_crash_simulation,
    system_run_idle_probe, system_run_multi_spawn_probe, system_run_perf_probe,
    system_run_throughput_probe, system_run_tty_responding_probe, system_start_file_watcher,
    system_unregister_global_hotkey,
};
pub use templates::{templates_export, templates_import, templates_list, templates_materialize};
pub use vault::{
    vault_create, vault_delete, vault_get, vault_list, vault_list_groups, vault_list_tags,
    vault_update,
};
pub use window::{
    window_restore_position, window_save_position, workspace_close_window, workspace_list_windows,
    workspace_open_in_new_window,
};
pub use workspace::workspace_list;
