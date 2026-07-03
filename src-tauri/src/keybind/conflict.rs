//! Conflict detector untuk keybind customization (TDD 3.6 + PRD §17).
//!
//! Saat user customize keybind lewat UI, backend tunjukin list of
//! "combo ini umum dipakai oleh tool X — yakin mau pakai?". Implementasi
//! ini static list (bukan dynamic query ke running processes) karena
//! konflik terjadi across the entire ekosistem, bukan per-process.
//!
//! Data source: PRD Section 17 + pengalaman sehari-hari CLI. Update
//! jika ada tool baru yang signifikan (mis. opencode, Claude Code CLI).

use std::sync::OnceLock;

use serde::Serialize;

/// Representasi normalized combo untuk dibandingkan dengan database
/// konflik. Modifier disimpan sebagai bitfield-style bool triplet —
/// sama dengan keybind combo di frontend, tapi versi backend
/// (TDD-defined contract) di sini.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedCombo {
    pub key: String,
    pub ctrl: bool,
    pub shift: bool,
    pub alt: bool,
    pub meta: bool,
}

impl NormalizedCombo {
    /// Bangun dari komponen Combo longgar — normalize key (e.g.
    /// `"Period"` → `"."` untuk konsistensi dengan frontend
    /// `normalizeKey`).
    pub fn new(key: &str, ctrl: bool, shift: bool, alt: bool, meta: bool) -> Self {
        let normalized_key = normalize_key(key);
        Self {
            key: normalized_key,
            ctrl,
            shift,
            alt,
            meta,
        }
    }
}

fn normalize_key(key: &str) -> String {
    match key {
        " " => " ".to_string(),
        "Period" => ".".to_string(),
        "Comma" => ",".to_string(),
        "Slash" => "/".to_string(),
        "Backslash" => "\\".to_string(),
        "Minus" => "-".to_string(),
        "Equal" => "=".to_string(),
        other => other.to_string(),
    }
}

/// Satu hint konflik yang menjelaskan kenapa combo tertentu mungkin
/// bermasalah. Ditampilkan inline di UI sebelum user save override.
#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ConflictHint {
    pub combo: NormalizedCombo,
    /// Kombinasi yang sama, sudah di-canonicalize ke label pendek
    /// (mis. `"Ctrl+P"`).
    pub label: String,
    /// Daftar nama tool/program yang diketahui memakai combo ini.
    pub tools: Vec<String>,
    /// Kategori dampak: `"readline"` (bash/zsh), `"vim"`,
    /// `"terminal-flow"` (Ctrl+S/Q Ctrl+C), `"shell"`, dll.
    pub category: String,
    /// Pesan saran untuk user. Berisi saran seperti "Tetap pakai"
    /// atau "Ganti ke Ctrl+Shift+P" (kalau applicable).
    pub advice: String,
}

type ConflictEntry = (
    NormalizedCombo,
    &'static str, // category
    &'static str, // tool description
    &'static str, // advice
);

/// Static database konflik. Frontend `KeybindRegistry` hanya deteksi
/// double-claim internal; backend ini deteksi bentrok dengan
/// readline/vim/terminal standar yang ada di LUAR aplikasi.
///
/// Hanya combo yang umum dipakai dicatat. Single-letter tanpa
/// modifier (mis. `a`) sengaja tidak ada — konflik dengan satu huruf
/// hampir tidak bermakna (semua tool menerima plaintext).
///
/// Diakses via [`known_conflicts`] (OnceLock) supaya data yang
/// mengandung `String` bisa di-construct di runtime.
fn known_conflicts() -> &'static [ConflictEntry] {
    static CACHE: OnceLock<Vec<ConflictEntry>> = OnceLock::new();
    CACHE.get_or_init(|| {
        vec![
            // Readline (bash/zsh/python REPL/node REPL)
            (
                NormalizedCombo { key: "p".into(), ctrl: true, shift: false, alt: false, meta: false },
                "readline",
                "Previous history (bash/zsh/Python/Node REPL)",
                "Ganti ke Ctrl+Alt+P atau Alt+ArrowUp agar tidak bentrok.",
            ),
            (
                NormalizedCombo { key: "n".into(), ctrl: true, shift: false, alt: false, meta: false },
                "readline",
                "Next history (bash/zsh/Python/Node REPL)",
                "Ganti ke Ctrl+Alt+N atau Alt+ArrowDown.",
            ),
            (
                NormalizedCombo { key: "f".into(), ctrl: true, shift: false, alt: false, meta: false },
                "readline",
                "Forward one character",
                "Forward char di hampir semua REPL. Ganti ke Ctrl+Alt+F.",
            ),
            (
                NormalizedCombo { key: "b".into(), ctrl: true, shift: false, alt: false, meta: false },
                "readline",
                "Backward one character",
                "Backward char di hampir semua REPL. Ganti ke Ctrl+Alt+B.",
            ),
            (
                NormalizedCombo { key: "r".into(), ctrl: true, shift: false, alt: false, meta: false },
                "readline",
                "Reverse history search (Ctrl+R)",
                "Sangat umum — banyak user muscle memory.",
            ),
            (
                NormalizedCombo { key: "a".into(), ctrl: true, shift: false, alt: false, meta: false },
                "readline",
                "Beginning of line",
                "Sangat umum. Ganti ke Ctrl+Home atau Ctrl+Alt+A.",
            ),
            (
                NormalizedCombo { key: "e".into(), ctrl: true, shift: false, alt: false, meta: false },
                "readline",
                "End of line",
                "Sangat umum. Ganti ke Ctrl+End atau Ctrl+Alt+E.",
            ),
            (
                NormalizedCombo { key: "d".into(), ctrl: true, shift: false, alt: false, meta: false },
                "readline",
                "Delete char / EOF (Ctrl+D)",
                "Dipakai banyak REPL dan shell untuk logout.",
            ),
            (
                NormalizedCombo { key: "k".into(), ctrl: true, shift: false, alt: false, meta: false },
                "readline",
                "Kill to end of line",
                "Sangat umum. Ganti ke Ctrl+Alt+K.",
            ),
            (
                NormalizedCombo { key: "l".into(), ctrl: true, shift: false, alt: false, meta: false },
                "readline",
                "Clear screen",
                "Dipakai banyak CLI. Biasanya aman di-override, tapi user expecting it.",
            ),
            (
                NormalizedCombo { key: "t".into(), ctrl: true, shift: false, alt: false, meta: false },
                "readline",
                "Transpose characters",
                "Sangat umum di bash/zsh.",
            ),
            (
                NormalizedCombo { key: "w".into(), ctrl: true, shift: false, alt: false, meta: false },
                "readline",
                "Kill word backward",
                "Sangat umum. Ganti ke Ctrl+Alt+W.",
            ),
            (
                NormalizedCombo { key: "u".into(), ctrl: true, shift: false, alt: false, meta: false },
                "readline",
                "Kill line backward",
                "Sangat umum. Ganti ke Ctrl+Alt+U.",
            ),
            (
                NormalizedCombo { key: "y".into(), ctrl: true, shift: false, alt: false, meta: false },
                "readline",
                "Yank (paste killed text)",
                "Sangat umum. Ganti ke Ctrl+Alt+Y.",
            ),
            // Vim
            (
                NormalizedCombo { key: "g".into(), ctrl: true, shift: false, alt: false, meta: false },
                "vim",
                "Go to (status line / goto line in vim help)",
                "Umum di vim. Ganti ke Ctrl+Alt+G.",
            ),
            // Terminal / shell / flow control
            (
                NormalizedCombo { key: "s".into(), ctrl: true, shift: false, alt: false, meta: false },
                "terminal-flow",
                "XOFF (pause terminal output)",
                "Sangat umum. Bisa hilang flow control.",
            ),
            (
                NormalizedCombo { key: "q".into(), ctrl: true, shift: false, alt: false, meta: false },
                "terminal-flow",
                "XON (resume terminal output)",
                "Pasangan Ctrl+S. Jangan override tanpa pikir panjang.",
            ),
            (
                NormalizedCombo { key: "z".into(), ctrl: true, shift: false, alt: false, meta: false },
                "shell",
                "SIGTSTP (suspend process)",
                "Membuat foreground process ke background. Hampir selalu butuhkan.",
            ),
            (
                NormalizedCombo { key: "c".into(), ctrl: true, shift: false, alt: false, meta: false },
                "shell",
                "SIGINT (interrupt)",
                "Membunuh process foreground. Critical untuk interupsi.",
            ),
            // Slash
            (
                NormalizedCombo { key: "/".into(), ctrl: true, shift: false, alt: false, meta: false },
                "shell",
                "Search history backward (bash) / search (fzf, vim)",
                "Bentrok dengan banyak TUI app.",
            ),
        ]
    })
}

/// Cek apakah sebuah combo konflik dengan CLI/readline standar.
/// Return semua hint yang applicable. Kosong = tidak ada konflik
/// yang diketahui.
pub fn check_combo_conflict(combo: &NormalizedCombo) -> Vec<ConflictHint> {
    let mut hints = Vec::new();
    for (candidate, category, tool_desc, advice) in known_conflicts() {
        if candidate == combo {
            hints.push(ConflictHint {
                combo: combo.clone(),
                label: combo_label(combo),
                tools: vec![(*tool_desc).to_string()],
                category: (*category).to_string(),
                advice: (*advice).to_string(),
            });
        }
    }
    hints
}

/// Canonical label untuk combo — mirror frontend `comboLabel` di
/// `src/lib/keybind.ts` (Windows-style: Ctrl+Shift+P).
pub fn combo_label(combo: &NormalizedCombo) -> String {
    let mut parts: Vec<String> = Vec::new();
    if combo.ctrl {
        parts.push("Ctrl".to_string());
    }
    if combo.alt {
        parts.push("Alt".to_string());
    }
    if combo.shift {
        parts.push("Shift".to_string());
    }
    if combo.meta {
        parts.push("Meta".to_string());
    }
    parts.push(display_key(&combo.key));
    parts.join("+")
}

fn display_key(key: &str) -> String {
    match key {
        " " => "Space".to_string(),
        "Enter" => "Enter".to_string(),
        "Escape" => "Esc".to_string(),
        "ArrowUp" => "ArrowUp".to_string(),
        "ArrowDown" => "ArrowDown".to_string(),
        "ArrowLeft" => "ArrowLeft".to_string(),
        "ArrowRight" => "ArrowRight".to_string(),
        other => {
            // Single letter uppercase supaya match frontend display.
            if other.chars().count() == 1 {
                other.to_uppercase()
            } else {
                other.to_string()
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ctrl_p_detected_as_conflict() {
        let combo = NormalizedCombo::new("p", true, false, false, false);
        let hints = check_combo_conflict(&combo);
        assert_eq!(hints.len(), 1);
        assert_eq!(hints[0].category, "readline");
        assert!(hints[0].tools[0].contains("Previous history"));
    }

    #[test]
    fn ctrl_shift_p_not_in_conflict_list() {
        // Ctrl+Shift+P adalah combo yang dipakai app — tidak boleh
        // muncul di list konflik (command palette sudah industry
        // standard).
        let combo = NormalizedCombo::new("p", true, true, false, false);
        let hints = check_combo_conflict(&combo);
        assert!(hints.is_empty(), "Ctrl+Shift+P tidak boleh flagged");
    }

    #[test]
    fn ctrl_s_xoff_detected() {
        let combo = NormalizedCombo::new("s", true, false, false, false);
        let hints = check_combo_conflict(&combo);
        assert!(!hints.is_empty());
        assert!(hints.iter().any(|h| h.category == "terminal-flow"));
    }

    #[test]
    fn ctrl_c_sigint_detected() {
        let combo = NormalizedCombo::new("c", true, false, false, false);
        let hints = check_combo_conflict(&combo);
        assert!(!hints.is_empty());
        assert!(hints.iter().any(|h| h.tools[0].contains("SIGINT")));
    }

    #[test]
    fn unknown_combo_returns_empty() {
        let combo = NormalizedCombo::new("F12", false, false, false, false);
        let hints = check_combo_conflict(&combo);
        assert!(hints.is_empty());
    }

    #[test]
    fn combo_label_windows_format() {
        let combo = NormalizedCombo::new("p", true, true, false, false);
        assert_eq!(combo_label(&combo), "Ctrl+Shift+P");

        let combo = NormalizedCombo::new("Period", true, false, false, false);
        assert_eq!(combo_label(&combo), "Ctrl+.");
    }

    #[test]
    fn normalize_key_handles_punctuation() {
        assert_eq!(normalize_key("Period"), ".");
        assert_eq!(normalize_key("Comma"), ",");
        assert_eq!(normalize_key(" "), " ");
        assert_eq!(normalize_key("a"), "a");
    }

    #[test]
    fn normalized_combo_equality_normalizes_keys() {
        let a = NormalizedCombo::new("Period", true, false, false, false);
        let b = NormalizedCombo::new(".", true, false, false, false);
        assert_eq!(a, b);
    }

    #[test]
    fn ctrl_shift_n_not_in_conflict_list() {
        // Ctrl+Shift+N = "new workspace" default, harus aman.
        let combo = NormalizedCombo::new("n", true, true, false, false);
        let hints = check_combo_conflict(&combo);
        assert!(hints.is_empty());
    }
}
