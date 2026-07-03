//! Resolver shell lintas-platform dengan fallback chain.
//!
//! Mendukung preset (powershell, pwsh, cmd, git-bash, wsl, default, custom)
//! dan probe berurutan: explicit path → env → well-known dirs → PATH lookup.
//!
//! Env expansion + quoted args juga dilakukan di sini agar pemanggil bisa
//! terima string "C:\\Program Files\\Git\\bin\\bash.exe -l" atau
//! "pwsh -NoLogo -Command 'Write-Host hi'".

use std::path::{Path, PathBuf};

use crate::pty::ShellSpec;

/// Resolution result describing what was found and how.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ShellResolution {
    /// Absolute executable path (set whenever possible).
    pub program: String,
    /// Arguments to pass to the program.
    pub args: Vec<String>,
    /// Where this resolution came from (debug aid + UI badge).
    pub source: ShellSource,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ShellSource {
    /// Caller supplied an explicit absolute or relative program path.
    Explicit,
    /// Resolved from a known preset (PowerShell 7, Git Bash, etc).
    Preset(&'static str),
    /// Resolved from an environment variable (e.g. `COMSPEC`, `SHELL`).
    Environment(&'static str),
    /// Resolved from a well-known install location.
    WellKnown,
    /// Resolved from PATH lookup.
    PathLookup,
    /// Final fallback (e.g. `cmd.exe` / `/bin/sh`).
    Fallback,
}

impl ShellSource {
    pub fn label(&self) -> &'static str {
        match self {
            ShellSource::Explicit => "explicit",
            ShellSource::Preset(_) => "preset",
            ShellSource::Environment(_) => "env",
            ShellSource::WellKnown => "well-known",
            ShellSource::PathLookup => "PATH",
            ShellSource::Fallback => "fallback",
        }
    }
}

/// User-facing shell presets. Mirrors the frontend dropdown.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShellPreset {
    PowerShell,
    Pwsh,
    Cmd,
    GitBash,
    Wsl,
    Default,
    Custom,
}

impl ShellPreset {
    pub fn parse(value: &str) -> Option<ShellPreset> {
        match value.to_ascii_lowercase().as_str() {
            "powershell" | "powershell.exe" | "ps" => Some(ShellPreset::PowerShell),
            "pwsh" | "pwsh.exe" | "powershell 7" | "powershell7" => Some(ShellPreset::Pwsh),
            "cmd" | "cmd.exe" => Some(ShellPreset::Cmd),
            "gitbash" | "git-bash" | "bash" | "bash.exe" => Some(ShellPreset::GitBash),
            "wsl" | "wsl.exe" => Some(ShellPreset::Wsl),
            "default" => Some(ShellPreset::Default),
            "custom" => Some(ShellPreset::Custom),
            _ => None,
        }
    }
}

/// Resolver with configurable lookup dirs. `default()` covers the
/// well-known install paths on Windows + a sane Unix default.
#[derive(Debug, Clone)]
pub struct ShellResolver {
    well_known: Vec<PathBuf>,
    path_override: Option<String>,
}

impl Default for ShellResolver {
    fn default() -> Self {
        Self {
            #[cfg(windows)]
            well_known: windows_well_known(),
            #[cfg(not(windows))]
            well_known: vec![
                PathBuf::from("/bin"),
                PathBuf::from("/usr/bin"),
                PathBuf::from("/usr/local/bin"),
            ],
            path_override: std::env::var("PATH").ok(),
        }
    }
}

impl ShellResolver {
    /// Construct a resolver with an explicit PATH override (used in tests
    /// and by the perf probe so we don't mutate the process env).
    pub fn with_path(path: impl Into<String>) -> Self {
        Self {
            well_known: Self::default().well_known,
            path_override: Some(path.into()),
        }
    }

    /// Construct a resolver that ignores the process PATH entirely
    /// (used in tests to keep them hermetic).
    pub fn without_path() -> Self {
        Self {
            well_known: Self::default().well_known,
            path_override: None,
        }
    }

    /// Probe whether the supplied program path is executable. On Windows
    /// we treat any existing file as runnable; on Unix we also check the
    /// executable bit. Returns the canonicalized path when valid.
    pub fn probe(program: &str) -> Option<PathBuf> {
        let trimmed = program.trim();
        if trimmed.is_empty() {
            return None;
        }
        let path = Path::new(trimmed);
        if path.is_absolute() || has_explicit_separator(path) {
            if is_executable(path) {
                Some(normalize(path))
            } else {
                None
            }
        } else {
            // Caller is asking us to *find* a bare name; we only know how
            // to find absolute or directory-anchored paths here.
            None
        }
    }

    /// Resolve a `ShellSpec` into a concrete executable + args.
    pub fn resolve(&self, spec: &ShellSpec) -> Result<ShellResolution, String> {
        let spec_source = spec.source.trim();
        let custom = spec.custom.trim();

        // 1. Explicit value from caller (frontend-provided absolute path).
        if !custom.is_empty() {
            if let Some(found) = Self::probe(custom) {
                return Ok(ShellResolution {
                    program: found.to_string_lossy().into_owned(),
                    args: parse_args(&spec.args),
                    source: ShellSource::Explicit,
                });
            }
            // Fall through to preset resolution if a custom path was
            // provided but doesn't actually exist.
        }

        // 2. Resolve by preset name.
        let preset = ShellPreset::parse(spec_source);
        let args = parse_args(&spec.args);

        if let Some(preset) = preset {
            if matches!(preset, ShellPreset::Custom) {
                if !custom.is_empty() {
                    return Err(format!(
                        "custom shell path was not found on disk: `{custom}`"
                    ));
                }
                return Err("custom shell selected but no path provided".to_string());
            }
            return self.resolve_preset(preset, args);
        }

        // 3. Unknown preset name → treat the spec.source as an explicit
        //    path the caller wants us to use (still probe it).
        if !spec_source.is_empty() {
            if let Some(found) = Self::probe(spec_source) {
                return Ok(ShellResolution {
                    program: found.to_string_lossy().into_owned(),
                    args,
                    source: ShellSource::Explicit,
                });
            }
            // Try the PATH lookup as a final attempt.
            if let Some(found) = self.lookup_on_path(spec_source) {
                return Ok(ShellResolution {
                    program: found.to_string_lossy().into_owned(),
                    args,
                    source: ShellSource::PathLookup,
                });
            }
            return Err(format!("shell not found: `{}`", spec_source));
        }

        // 4. Total fallback.
        self.fallback(args)
    }

    fn resolve_preset(
        &self,
        preset: ShellPreset,
        args: Vec<String>,
    ) -> Result<ShellResolution, String> {
        match preset {
            ShellPreset::PowerShell => self.find_with_candidates(
                &[
                    &["powershell.exe", "powershell"][..],
                    &["pwsh.exe", "pwsh"][..],
                ],
                ShellSource::Preset("PowerShell"),
                args,
            ),
            ShellPreset::Pwsh => self.find_with_candidates(
                &[
                    &["pwsh.exe", "pwsh"][..],
                    &["powershell.exe", "powershell"][..],
                ],
                ShellSource::Preset("PowerShell 7"),
                args,
            ),
            ShellPreset::Cmd => {
                #[cfg(windows)]
                {
                    if let Some(found) = env_program("COMSPEC", &["cmd.exe", "cmd"]) {
                        return Ok(ShellResolution {
                            program: found,
                            args,
                            source: ShellSource::Environment("COMSPEC"),
                        });
                    }
                    self.find_with_candidates(&[&["cmd.exe"][..]], ShellSource::Preset("CMD"), args)
                }
                #[cfg(not(windows))]
                {
                    self.fallback(args)
                }
            }
            ShellPreset::GitBash => {
                #[cfg(windows)]
                {
                    self.find_with_candidates(
                        &[&[
                            "C:\\Program Files\\Git\\bin\\bash.exe",
                            "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
                            "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
                            "C:\\Program Files (x86)\\Git\\usr\\bin\\bash.exe",
                        ][..]],
                        ShellSource::Preset("Git Bash"),
                        args,
                    )
                }
                #[cfg(not(windows))]
                {
                    self.find_with_candidates(
                        &[&["/bin/bash", "/usr/bin/bash"][..]],
                        ShellSource::Preset("Bash"),
                        args,
                    )
                }
            }
            ShellPreset::Wsl => {
                #[cfg(windows)]
                {
                    self.find_with_candidates(
                        &[&["wsl.exe", "wsl"][..]],
                        ShellSource::Preset("WSL"),
                        args,
                    )
                }
                #[cfg(not(windows))]
                {
                    Err("WSL preset is only available on Windows".to_string())
                }
            }
            ShellPreset::Default => self.fallback(args),
            ShellPreset::Custom => {
                Err("custom preset should be handled before resolve_preset".to_string())
            }
        }
    }

    fn find_with_candidates(
        &self,
        candidate_groups: &[&[&str]],
        source: ShellSource,
        args: Vec<String>,
    ) -> Result<ShellResolution, String> {
        // Try each group; first hit wins.
        for group in candidate_groups {
            for candidate in *group {
                if let Some(found) = Self::probe(candidate) {
                    return Ok(ShellResolution {
                        program: found.to_string_lossy().into_owned(),
                        args: args.clone(),
                        source: source.clone(),
                    });
                }
            }
        }
        // Absolute paths already tried above; now check PATH for the
        // bare program name (e.g. "pwsh" on PATH).
        for group in candidate_groups {
            for candidate in *group {
                let bare = Path::new(candidate)
                    .file_name()
                    .and_then(|s| s.to_str())
                    .unwrap_or(candidate);
                if let Some(found) = self.lookup_on_path(bare) {
                    return Ok(ShellResolution {
                        program: found.to_string_lossy().into_owned(),
                        args: args.clone(),
                        source: ShellSource::PathLookup,
                    });
                }
            }
        }
        let label = source.label();
        Err(format!(
            "could not find shell `{label}` ({label}); tried {} candidate path(s)",
            candidate_groups.iter().map(|g| g.len()).sum::<usize>()
        ))
    }

    fn lookup_on_path(&self, program: &str) -> Option<PathBuf> {
        let path = self.path_override.as_deref()?;
        for dir in std::env::split_paths(path) {
            let candidate = dir.join(program);
            if is_executable(&candidate) {
                return Some(normalize(&candidate));
            }
            // On Windows also probe common PATHEXT suffixes.
            #[cfg(windows)]
            {
                for ext in ["exe", "cmd", "bat", ""] {
                    let mut with_ext = candidate.clone();
                    if !ext.is_empty() {
                        with_ext.set_extension(ext);
                    }
                    if is_executable(&with_ext) {
                        return Some(normalize(&with_ext));
                    }
                }
            }
        }
        None
    }

    fn fallback(&self, args: Vec<String>) -> Result<ShellResolution, String> {
        #[cfg(windows)]
        {
            if let Some(found) = env_program("COMSPEC", &["cmd.exe", "cmd"]) {
                return Ok(ShellResolution {
                    program: found,
                    args,
                    source: ShellSource::Fallback,
                });
            }
            Ok(ShellResolution {
                program: "cmd.exe".to_string(),
                args,
                source: ShellSource::Fallback,
            })
        }
        #[cfg(not(windows))]
        {
            if let Some(found) = env_program("SHELL", &["/bin/sh"]) {
                return Ok(ShellResolution {
                    program: found,
                    args,
                    source: ShellSource::Fallback,
                });
            }
            Ok(ShellResolution {
                program: "/bin/sh".to_string(),
                args,
                source: ShellSource::Fallback,
            })
        }
    }
}

fn env_program(env: &'static str, fallbacks: &[&str]) -> Option<String> {
    if let Ok(value) = std::env::var(env) {
        let trimmed = value.trim();
        if !trimmed.is_empty() && Path::new(trimmed).exists() {
            return Some(trimmed.to_string());
        }
    }
    for fallback in fallbacks {
        if Path::new(fallback).exists() {
            return Some((*fallback).to_string());
        }
    }
    None
}

#[cfg(windows)]
fn windows_well_known() -> Vec<PathBuf> {
    let mut dirs: Vec<PathBuf> = Vec::new();
    if let Ok(programfiles) = std::env::var("ProgramFiles") {
        let pf = PathBuf::from(programfiles);
        dirs.push(pf.join("Git").join("bin"));
        dirs.push(pf.join("PowerShell").join("7"));
    }
    if let Ok(programfiles_x86) = std::env::var("ProgramFiles(x86)") {
        dirs.push(PathBuf::from(programfiles_x86).join("Git").join("bin"));
    }
    if let Ok(localappdata) = std::env::var("LocalAppData") {
        dirs.push(
            PathBuf::from(localappdata)
                .join("Microsoft")
                .join("WindowsApps"),
        );
    }
    if let Ok(systemroot) = std::env::var("SystemRoot") {
        let root = PathBuf::from(systemroot);
        dirs.push(root.join("System32"));
        dirs.push(root.join("SysWOW64"));
    }
    dirs.push(PathBuf::from("C:\\Windows\\System32"));
    dirs.push(PathBuf::from("C:\\Program Files\\Git\\bin"));
    dirs.push(PathBuf::from("C:\\Program Files (x86)\\Git\\bin"));
    dirs
}

fn has_explicit_separator(path: &Path) -> bool {
    path.components().count() > 1
}

fn normalize(path: &Path) -> PathBuf {
    // We avoid std::fs::canonicalize so we don't need the file to exist
    // for normalization. portable_pty accepts both absolute and relative
    // paths; we just trim trailing separators.
    let mut out = path.to_path_buf();
    while let Some(stripped) = out.strip_prefix("\\\\?\\").ok().map(|p| p.to_path_buf()) {
        out = stripped;
    }
    out
}

fn is_executable(path: &Path) -> bool {
    if !path.exists() {
        return false;
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(meta) = std::fs::metadata(path) {
            return meta.permissions().mode() & 0o111 != 0;
        }
        false
    }
    #[cfg(not(unix))]
    {
        // On Windows, the file extension decides; if it ends with a
        // known executable extension we accept it. The OS will surface
        // a friendlier error than we can if it turns out unrunnable.
        path.extension()
            .and_then(|s| s.to_str())
            .map(|s| {
                let lower = s.to_ascii_lowercase();
                matches!(lower.as_str(), "exe" | "cmd" | "bat" | "com")
            })
            .unwrap_or(false)
            || path.is_file()
    }
}

/// Parse a CLI argument string into a vector, respecting single + double
/// quotes. Used so frontend can pass `"pwsh -NoLogo -Command \"Write-Host hi\""`
/// in a single field.
pub fn parse_args(input: &str) -> Vec<String> {
    let mut out: Vec<String> = Vec::new();
    let mut buf = String::new();
    let mut quote: Option<char> = None;
    let mut in_token = false;

    for ch in input.chars() {
        match (ch, quote) {
            ('"', None) | ('\'', None) => {
                quote = Some(ch);
                in_token = true;
            }
            (c, Some(q)) if c == q => {
                quote = None;
            }
            (' ', None) => {
                if in_token {
                    if !buf.is_empty() {
                        out.push(std::mem::take(&mut buf));
                    }
                    in_token = false;
                }
            }
            (c, _) => {
                buf.push(c);
                in_token = true;
            }
        }
    }
    if in_token && !buf.is_empty() {
        out.push(buf);
    }
    out
}

/// Expand a leading `~` or environment variables in a path-like string.
/// `~` expands to the user's home directory on Windows + Unix. Unknown
/// env vars are left untouched.
pub fn expand_path(input: &str) -> String {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return trimmed.to_string();
    }

    if trimmed == "~" || trimmed.starts_with("~/") || trimmed.starts_with("~\\") {
        if let Some(home) = home_dir() {
            return trimmed.replacen('~', &home.to_string_lossy(), 1);
        }
    }

    if trimmed.contains('%') {
        expand_windows_env(trimmed)
    } else if trimmed.contains('$') {
        expand_unix_env(trimmed)
    } else {
        trimmed.to_string()
    }
}

#[cfg(windows)]
fn home_dir() -> Option<PathBuf> {
    std::env::var_os("USERPROFILE")
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(PathBuf::from))
}

#[cfg(not(windows))]
fn home_dir() -> Option<PathBuf> {
    std::env::var_os("HOME").map(PathBuf::from)
}

#[cfg(windows)]
fn expand_windows_env(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = String::with_capacity(input.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            if let Some(end) = input[i + 1..].find('%') {
                let name = &input[i + 1..i + 1 + end];
                if let Ok(value) = std::env::var(name) {
                    out.push_str(&value);
                    i += 1 + end + 1;
                    continue;
                }
            }
        }
        out.push(bytes[i] as char);
        i += 1;
    }
    out
}

#[cfg(not(windows))]
fn expand_windows_env(input: &str) -> String {
    input.to_string()
}

fn expand_unix_env(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut chars = input.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch == '$' {
            // ${VAR}
            if let Some(&'{') = chars.peek() {
                chars.next();
                let mut name = String::new();
                for c in chars.by_ref() {
                    if c == '}' {
                        break;
                    }
                    name.push(c);
                }
                if let Ok(value) = std::env::var(&name) {
                    out.push_str(&value);
                } else {
                    out.push_str("${");
                    out.push_str(&name);
                    out.push('}');
                }
            } else {
                let mut name = String::new();
                while let Some(&c) = chars.peek() {
                    if c.is_ascii_alphanumeric() || c == '_' {
                        name.push(c);
                        chars.next();
                    } else {
                        break;
                    }
                }
                if name.is_empty() {
                    out.push('$');
                } else if let Ok(value) = std::env::var(&name) {
                    out.push_str(&value);
                } else {
                    out.push('$');
                    out.push_str(&name);
                }
            }
        } else {
            out.push(ch);
        }
    }
    out
}

/// Best-effort creation flags for a spawned child. Used to keep
/// console windows from flashing on Windows when spawning long-lived
/// shells. Returns 0 on non-Windows. Hook for callers that want to
/// pass a custom flag set.
#[allow(dead_code)]
pub fn creation_flags_for_hidden() -> u32 {
    0
}

#[cfg(test)]
mod tests {
    use super::*;

    fn spec(source: &str, custom: &str, args: &str) -> ShellSpec {
        ShellSpec {
            source: source.to_string(),
            custom: custom.to_string(),
            args: args.to_string(),
        }
    }

    #[test]
    fn parse_args_splits_quoted_segments() {
        let args = parse_args(r#"-NoLogo -Command "Write-Host hi" --foo 'bar baz'"#);
        assert_eq!(
            args,
            vec!["-NoLogo", "-Command", "Write-Host hi", "--foo", "bar baz"]
        );
    }

    #[test]
    fn parse_args_handles_empty_input() {
        assert!(parse_args("").is_empty());
        assert!(parse_args("   ").is_empty());
    }

    #[test]
    fn shell_preset_parse_recognises_aliases() {
        assert_eq!(ShellPreset::parse("PS"), Some(ShellPreset::PowerShell));
        assert_eq!(ShellPreset::parse("pwsh.exe"), Some(ShellPreset::Pwsh));
        assert_eq!(ShellPreset::parse("git-bash"), Some(ShellPreset::GitBash));
        assert_eq!(ShellPreset::parse("wsl"), Some(ShellPreset::Wsl));
        assert_eq!(ShellPreset::parse("unknown"), None);
    }

    #[test]
    fn expand_path_replaces_tilde_when_home_known() {
        let expanded = expand_path("~/projects");
        if home_dir().is_some() {
            assert!(
                !expanded.starts_with('~'),
                "tilde should expand: got {expanded}"
            );
        }
    }

    #[test]
    fn expand_path_leaves_unknown_env_vars_alone() {
        let out = expand_path("$Nonaterm_DOES_NOT_EXIST_XYZ/inner");
        assert!(out.contains("Nonaterm_DOES_NOT_EXIST_XYZ"));
    }

    #[test]
    fn resolver_falls_back_when_nothing_provided() {
        let resolver = ShellResolver::without_path();
        let result = resolver
            .resolve(&spec("default", "", ""))
            .expect("fallback should resolve");
        // On Windows the fallback is cmd.exe; on Unix /bin/sh. Both are
        // guaranteed by the resolver itself.
        assert!(matches!(result.source, ShellSource::Fallback));
    }

    #[test]
    fn resolver_rejects_missing_custom_path() {
        let resolver = ShellResolver::without_path();
        let err = resolver
            .resolve(&spec(
                "custom",
                "Z:\\definitely-not-a-real-shell-1234.exe",
                "",
            ))
            .expect_err("missing custom path should fail");
        assert!(err.contains("custom") || err.contains("not found"));
    }

    #[test]
    fn resolver_picks_cmd_preset_via_comspec() {
        if cfg!(windows) {
            let resolver = ShellResolver::without_path();
            let result = resolver
                .resolve(&spec("cmd", "", ""))
                .expect("cmd should resolve");
            assert!(
                matches!(result.source, ShellSource::Environment(_))
                    || matches!(result.source, ShellSource::Preset(_)),
                "unexpected source: {:?}",
                result.source
            );
        }
    }
}
