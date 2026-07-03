//! Commands domain konfigurasi aplikasi.

use serde::Serialize;

/// Informasi aplikasi minimum untuk handshake frontend.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    name: String,
    version: String,
    platform: String,
}

/// Mengambil metadata aplikasi dasar untuk frontend.
#[tauri::command]
pub fn config_get_app_info() -> Result<AppInfo, String> {
    Ok(AppInfo {
        name: "Nonaterm".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        platform: std::env::consts::OS.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::config_get_app_info;

    #[test]
    fn returns_expected_app_info_payload() {
        let info = config_get_app_info().expect("app info payload should be available");
        let value = serde_json::to_value(info).expect("app info should serialize");

        assert_eq!(value["name"], "Nonaterm");
        assert_eq!(value["version"], env!("CARGO_PKG_VERSION"));
        assert!(value["platform"].as_str().is_some());
    }
}
