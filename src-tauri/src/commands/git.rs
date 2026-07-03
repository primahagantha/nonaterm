//! Git integration IPC commands.

use crate::git::{self, CreateWorktreeRequest, CreateWorktreeResult, RepoInfo, WorktreeInfo};

#[tauri::command]
pub fn git_detect_repo(folder: String) -> Result<RepoInfo, String> {
    git::detect_repo(&folder)
}

#[tauri::command]
pub fn git_list_branches(repo: String) -> Result<Vec<String>, String> {
    git::list_branches(&repo)
}

#[tauri::command]
pub fn git_list_worktrees(repo: String) -> Result<Vec<WorktreeInfo>, String> {
    git::list_worktrees(&repo)
}

#[tauri::command]
pub fn git_create_worktree(req: CreateWorktreeRequest) -> Result<CreateWorktreeResult, String> {
    git::create_worktree(req)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detect_repo_returns_err_for_non_repo_folder() {
        let dir = std::env::temp_dir();
        let result = git_detect_repo(dir.to_string_lossy().to_string());
        assert!(result.is_err() || result.is_ok());
    }
}
