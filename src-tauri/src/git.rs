//! Git integration: detect repos, list worktrees/branches, create worktrees.
//!
//! Used by the "Bind to Git Worktree" flow (PRD §11 #6): when the user
//! creates a new workspace, the app can detect the closest git repo,
//! list available branches, and spawn a worktree so all panes cd
//! into the freshly-isolated directory. This is opt-in — UI should
//! always fall back to a plain directory workspace.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoInfo {
    pub root: String,
    pub current_branch: Option<String>,
    pub head_sha: Option<String>,
    pub is_worktree: bool,
    pub worktrees: Vec<WorktreeInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorktreeInfo {
    pub path: String,
    pub branch: Option<String>,
    pub head_sha: Option<String>,
    pub is_main: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorktreeRequest {
    pub repo: String,
    pub branch: String,
    /// If true, create a new branch with the given name. If false,
    /// the worktree attaches to an existing branch.
    pub create_branch: bool,
    /// Base ref to fork from (defaults to HEAD).
    pub base: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorktreeResult {
    pub worktree_path: String,
    pub branch: String,
}

/// Run `git` in the given directory with the supplied arguments and
/// return its stdout as a trimmed `String`.
fn git_cwd(cwd: &Path, args: &[&str]) -> Result<String, String> {
    let output = std::process::Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("failed to spawn git: {e}"))?;
    if !output.status.success() {
        return Err(format!(
            "git {} failed with status {:?}",
            args.join(" "),
            output.status.code(),
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Walk up from `start` until we find a directory containing a `.git`
/// entry (folder or file — worktrees use a `.git` file that points to
/// the real gitdir).
fn find_repo_root(start: &Path) -> Option<PathBuf> {
    let mut current: PathBuf = start.to_path_buf();
    loop {
        let candidate = current.join(".git");
        if candidate.exists() {
            return Some(current);
        }
        if !current.pop() {
            return None;
        }
    }
}

pub fn detect_repo(folder: &str) -> Result<RepoInfo, String> {
    let folder_path = Path::new(folder);
    let root = find_repo_root(folder_path)
        .ok_or_else(|| format!("not a git repository: {folder}"))?;
    let root_str = root.to_string_lossy().to_string();

    let current_branch = git_cwd(&root, &["rev-parse", "--abbrev-ref", "HEAD"])
        .ok()
        .filter(|s| !s.is_empty());
    let head_sha = git_cwd(&root, &["rev-parse", "--short", "HEAD"]).ok();
    let is_worktree = git_cwd(&root, &["rev-parse", "--is-inside-work-tree"])
        .map(|s| s == "true")
        .unwrap_or(false);
    let worktrees = list_worktrees_internal(&root)?;

    Ok(RepoInfo {
        root: root_str,
        current_branch,
        head_sha,
        is_worktree,
        worktrees,
    })
}

fn list_worktrees_internal(repo: &Path) -> Result<Vec<WorktreeInfo>, String> {
    let raw = git_cwd(
        repo,
        &["worktree", "list", "--porcelain", "-z", "--format=%(refname:short)|%(objectname:short)|%(path)|%(isworktree)"],
    )?;
    let mut out: Vec<WorktreeInfo> = Vec::new();
    for line in raw.split('\u{0}').filter(|s| !s.is_empty()) {
        let mut parts = line.splitn(4, '|');
        let branch = parts.next().map(|s| s.to_string()).filter(|s| !s.is_empty());
        let head_sha = parts.next().map(|s| s.to_string()).filter(|s| !s.is_empty());
        let path = parts.next().map(|s| s.to_string()).unwrap_or_default();
        let is_main_str = parts.next().unwrap_or("false");
        let is_main = is_main_str == "true" || branch.as_deref() == Some("(bare)");
        if path.is_empty() {
            continue;
        }
        out.push(WorktreeInfo {
            path,
            branch,
            head_sha,
            is_main,
        });
    }
    Ok(out)
}

pub fn list_worktrees(repo: &str) -> Result<Vec<WorktreeInfo>, String> {
    let root = Path::new(repo);
    list_worktrees_internal(root)
}

pub fn list_branches(repo: &str) -> Result<Vec<String>, String> {
    let root = Path::new(repo);
    let raw = git_cwd(root, &["for-each-ref", "--format=%(refname:short)", "refs/heads/"])?;
    Ok(raw
        .split('\n')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect())
}

pub fn create_worktree(req: CreateWorktreeRequest) -> Result<CreateWorktreeResult, String> {
    let repo = Path::new(&req.repo);
    if !repo.join(".git").exists() {
        return Err(format!("not a git repository: {}", req.repo));
    }
    let branch = req.branch.trim();
    if branch.is_empty() {
        return Err("branch name cannot be empty".to_string());
    }

    // Worktree paths go under `<repo>/.worktrees/<branch>` unless an
    // explicit path was supplied via env (reserved for future).
    let worktree_path = repo.join(".worktrees").join(slugify(branch));
    std::fs::create_dir_all(worktree_path.parent().unwrap())
        .map_err(|e| format!("create worktree parent dir: {e}"))?;

    let mut args: Vec<String> = vec!["worktree".to_string(), "add".to_string()];
    if req.create_branch {
        if let Some(base) = req.base.as_ref().filter(|s| !s.is_empty()) {
            args.push("-b".to_string());
            args.push(branch.to_string());
            args.push(base.to_string());
        } else {
            args.push("-b".to_string());
            args.push(branch.to_string());
        }
    } else {
        args.push(branch.to_string());
    }
    args.push(worktree_path.to_string_lossy().to_string());

    let output = std::process::Command::new("git")
        .args(&args)
        .current_dir(repo)
        .output()
        .map_err(|e| format!("failed to spawn git: {e}"))?;
    if !output.status.success() {
        return Err(format!(
            "git worktree add failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    Ok(CreateWorktreeResult {
        worktree_path: worktree_path.to_string_lossy().to_string(),
        branch: branch.to_string(),
    })
}

fn slugify(branch: &str) -> String {
    branch
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.' {
                c
            } else {
                '-'
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slugify_replaces_path_chars() {
        assert_eq!(slugify("feat/login-flow"), "feat-login-flow");
        assert_eq!(slugify("hotfix/issue 99"), "hotfix-issue-99");
    }
}
