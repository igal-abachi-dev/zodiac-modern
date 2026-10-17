#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod policy;
include!(concat!(env!("OUT_DIR"), "/assets.rs"));

use std::path::PathBuf;
use tauri::{
    WebviewUrl, WebviewWindowBuilder,
    webview::{NewWindowResponse, PermissionResponse},
};
use webview2_com::Microsoft::Web::WebView2::Win32::{
    ICoreWebView2Settings3, ICoreWebView2Settings4, ICoreWebView2Settings5,
};
use windows::core::Interface;

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
            .join("Tauri-v2-Test")
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
            let window =
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
                    .devtools(false)
                    .on_navigation(policy::allowed_navigation)
                    .on_new_window(|_, _| NewWindowResponse::Deny)
                    .on_download(|_, _| false)
                    .on_permission_request(|_, _| PermissionResponse::Deny)
                    .on_web_resource_request(|request, response| {
                        policy::filter_response(request, response, EMBEDDED_PATHS)
                    })
                    .build()?;
            let handle = app.handle().clone();
            window.with_webview(move |webview| {
                // STA callback supplied by Tauri. COM interfaces are reference-counted.
                // Failure closes the application rather than continuing with looser settings.
                let result: windows::core::Result<()> = unsafe {
                    (|| {
                        let core = webview.controller().CoreWebView2()?;
                        let settings = core.Settings()?;
                        settings.SetAreHostObjectsAllowed(false)?;
                        settings.SetAreDefaultContextMenusEnabled(false)?;
                        settings.SetIsBuiltInErrorPageEnabled(false)?;
                        settings
                            .cast::<ICoreWebView2Settings3>()?
                            .SetAreBrowserAcceleratorKeysEnabled(false)?;
                        let settings4 = settings.cast::<ICoreWebView2Settings4>()?;
                        settings4.SetIsPasswordAutosaveEnabled(false)?;
                        settings4.SetIsGeneralAutofillEnabled(false)?;
                        settings
                            .cast::<ICoreWebView2Settings5>()?
                            .SetIsPinchZoomEnabled(false)?;
                        Ok(())
                    })()
                };
                if result.is_err() {
                    handle.exit(1);
                }
            })?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Unable to run NeutronStar Tauri host");
}
