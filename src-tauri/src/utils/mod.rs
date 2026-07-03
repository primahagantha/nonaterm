//! Utility bersama untuk backend Nonaterm.

pub mod diagnostics;

/// Menormalkan string path sederhana untuk logging internal.
pub fn normalize_label(label: &str) -> String {
    label.trim().to_lowercase().replace(' ', "-")
}

#[cfg(test)]
mod tests {
    use super::normalize_label;

    #[test]
    fn normalizes_whitespace_and_case() {
        assert_eq!(normalize_label("  Nonaterm Backend  "), "nonaterm-backend");
    }
}
