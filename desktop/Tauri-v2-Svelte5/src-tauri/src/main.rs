#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod policy;
include!(concat!(env!("OUT_DIR"), "/assets.rs"));

use std::path::PathBuf;
use tauri::{
    WebviewUrl, WebviewWindowBuilder,
    webview::{NewWindowResponse, PermissionResponse},
};
fn profile_path() -> Result<PathBuf, &'static str> {
    // Browser environment overrides would invalidate the matched configuration.
    if std::env::vars_os().any(|(key, _)| {
        key.to_string_lossy()
            .to_ascii_uppercase()
            .starts_with("WEBVIEW2_")
    }) {
        return Err("Remove WEBVIEW2_* overrides before starting this host");
    }
    let mut args = std::env::args_os().skip(1);
    let profile = match args.next() {
        None => PathBuf::from(std::env::var_os("LOCALAPPDATA").ok_or("LOCALAPPDATA is missing")?)
            .join("NeutronStar")
            .join("Tauri-v2-Svelte5")
            .join("Profile"),
        Some(flag) if flag == "--profile" => {
            PathBuf::from(args.next().ok_or("--profile needs an absolute directory")?)
        }
        _ => return Err("Only --profile <absolute directory> is supported"),
    };
    if args.next().is_some() || !profile.is_absolute() {
        return Err("Invalid profile arguments");
    }
    Ok(profile)
}

fn main() {
    let profile = profile_path().expect("Invalid host configuration");
    tauri::Builder::default()
        // No plugins, application commands, capabilities or global JS API.
        .setup(move |app| {
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("NeutronStar GUI Bench")
                .inner_size(960.0, 640.0)
                .decorations(true)
                .resizable(true)
                .theme(Some(tauri::Theme::Light))
                .incognito(true)
                .data_directory(profile.clone())
                .use_https_scheme(true)
                // WRY 0.57 otherwise disables msWebOOUI, msPdfOOUI and SmartScreen.
                .additional_browser_args("")
                .browser_extensions_enabled(false)
                .general_autofill_enabled(false)
                .disable_drag_drop_handler()
                .zoom_hotkeys_enabled(false)
                .devtools(cfg!(debug_assertions))
                .on_navigation(|url| {
                    (cfg!(debug_assertions)
                        && url.scheme() == "http"
                        && url.host_str() == Some("127.0.0.1")
                        && url.port() == Some(1420)
                        && url.username().is_empty()
                        && url.password().is_none())
                        || policy::allowed_navigation(url)
                })
                .on_new_window(|_, _| NewWindowResponse::Deny)
                .on_download(|_, _| false)
                .on_permission_request(|_, _| PermissionResponse::Deny)
                .on_web_resource_request(|request, response| {
                    if !cfg!(debug_assertions) {
                        policy::filter_response(request, response, EMBEDDED_PATHS);
                    }
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Unable to run NeutronStar Tauri host");
}
