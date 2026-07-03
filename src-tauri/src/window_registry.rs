//! Registry yang memetakan `workspace_id` ke `window_label`.
//!
//! Backend menggunakan [`WindowRegistry`] untuk routing event ke window
//! yang tepat dan mencegah satu workspace tampil di dua window
//! sekaligus (lihat PRD §7 / SDD §2.4).

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

/// Pemetaan `workspace_id -> window_label`.
///
/// Tipe ini disimpan di [`crate::AppState`] sehingga semua command
/// bisa lock dan membaca/mengubah mapping dengan aman. `Mutex`
/// dipakai di dalam `Arc` agar cloneable ke thread lain (misal
/// closure `on_window_event`).
#[derive(Clone, Default)]
pub struct WindowRegistry {
    workspace_to_label: Arc<Mutex<HashMap<String, String>>>,
}

impl WindowRegistry {
    /// Buat registry kosong.
    pub fn new() -> Self {
        Self::default()
    }

    /// Daftarkan pemetaan `workspace_id -> window_label`. Mengembalikan
    /// `true` jika `workspace_id` sebelumnya belum terdaftar, `false`
    /// jika menimpa entry lama.
    pub fn register(&self, workspace_id: &str, window_label: &str) -> bool {
        let mut map = self
            .workspace_to_label
            .lock()
            .expect("window registry poisoned");
        map.insert(workspace_id.to_string(), window_label.to_string())
            .is_none()
    }

    /// Lookup `window_label` untuk `workspace_id` tertentu.
    pub fn label_for(&self, workspace_id: &str) -> Option<String> {
        let map = self
            .workspace_to_label
            .lock()
            .expect("window registry poisoned");
        map.get(workspace_id).cloned()
    }

    /// Lookup `workspace_id` untuk `window_label` tertentu (reverse).
    pub fn workspace_for(&self, window_label: &str) -> Option<String> {
        let map = self
            .workspace_to_label
            .lock()
            .expect("window registry poisoned");
        map.iter()
            .find(|(_, label)| label.as_str() == window_label)
            .map(|(ws, _)| ws.clone())
    }

    /// Hapus entry berdasarkan `workspace_id`. Return `true` jika ada.
    pub fn remove_by_workspace(&self, workspace_id: &str) -> bool {
        let mut map = self
            .workspace_to_label
            .lock()
            .expect("window registry poisoned");
        map.remove(workspace_id).is_some()
    }

    /// Hapus entry berdasarkan `window_label`. Return workspace_id
    /// yang terhapus bila ada.
    pub fn remove_by_label(&self, window_label: &str) -> Option<String> {
        let mut map = self
            .workspace_to_label
            .lock()
            .expect("window registry poisoned");
        let key = map
            .iter()
            .find(|(_, label)| label.as_str() == window_label)
            .map(|(ws, _)| ws.clone());
        if let Some(ref k) = key {
            map.remove(k);
        }
        key
    }

    /// Ambil semua pasangan `workspace_id -> window_label`.
    pub fn snapshot(&self) -> Vec<(String, String)> {
        let map = self
            .workspace_to_label
            .lock()
            .expect("window registry poisoned");
        map.iter()
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect()
    }

    /// Hitung jumlah entry.
    pub fn len(&self) -> usize {
        let map = self
            .workspace_to_label
            .lock()
            .expect("window registry poisoned");
        map.len()
    }

    /// True jika registry kosong.
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

#[cfg(test)]
mod tests {
    use super::WindowRegistry;

    #[test]
    fn window_registry_starts_empty() {
        let registry = WindowRegistry::new();
        assert!(registry.is_empty());
        assert_eq!(registry.len(), 0);
        assert!(registry.label_for("ws-1").is_none());
    }

    #[test]
    fn window_registry_set_get() {
        let registry = WindowRegistry::new();
        assert!(registry.register("ws-Nonaterm", "Nonaterm-ws-ws-Nonaterm-abcd"));
        assert_eq!(registry.len(), 1);
        assert_eq!(
            registry.label_for("ws-Nonaterm"),
            Some("Nonaterm-ws-ws-Nonaterm-abcd".to_string())
        );
        // Register ulang dengan label sama → return false (overwrite)
        assert!(!registry.register("ws-Nonaterm", "Nonaterm-ws-ws-Nonaterm-efgh"));
        assert_eq!(
            registry.label_for("ws-Nonaterm"),
            Some("Nonaterm-ws-ws-Nonaterm-efgh".to_string())
        );
        // Reverse lookup
        assert_eq!(
            registry.workspace_for("Nonaterm-ws-ws-Nonaterm-efgh"),
            Some("ws-Nonaterm".to_string())
        );
    }

    #[test]
    fn window_registry_remove_clears_mapping() {
        let registry = WindowRegistry::new();
        registry.register("ws-a", "label-a");
        registry.register("ws-b", "label-b");
        assert_eq!(registry.len(), 2);

        assert!(registry.remove_by_workspace("ws-a"));
        assert_eq!(registry.len(), 1);
        assert!(registry.label_for("ws-a").is_none());
        assert_eq!(registry.label_for("ws-b"), Some("label-b".to_string()));

        // Remove by label
        let removed = registry.remove_by_label("label-b");
        assert_eq!(removed, Some("ws-b".to_string()));
        assert!(registry.is_empty());

        // Remove tidak ada → return false / None
        assert!(!registry.remove_by_workspace("ws-gone"));
        assert!(registry.remove_by_label("label-gone").is_none());
    }
}
