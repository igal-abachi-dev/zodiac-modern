#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use neutronstar_rust_host::{HostOptions, HostWindow};
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut options = HostOptions::default();
    let mut args = std::env::args_os().skip(1);
    while let Some(key) = args.next() {
        let value = |args: &mut std::iter::Skip<std::env::ArgsOs>| {
            args.next().ok_or("Missing argument value")
        };
        match key.to_str().ok_or("Invalid option")? {
            "--assets" => options.assets = value(&mut args)?.into(),
            "--profile" => options.profile = value(&mut args)?.into(),
            "--runtime" => options.runtime = Some(value(&mut args)?.into()),
            "--entry" => {
                options.entry = value(&mut args)?
                    .into_string()
                    .map_err(|_| "Invalid entry")?
            }
            "--report" => options.report = Some(value(&mut args)?.into()),
            "--timeout-ms" => {
                options.timeout_ms = value(&mut args)?
                    .to_str()
                    .ok_or("Invalid timeout")?
                    .parse()?;
                if !(100..=120000).contains(&options.timeout_ms) {
                    return Err("Timeout 100..120000".into());
                }
            }
            "--smoke-test" => {
                options.smoke = true;
                options.timeout_ms = 30000;
            }
            "--close-before-ready" => options.close_early = true,
            "--close-at-environment" => options.close_environment = true,
            "--close-at-controller" => options.close_controller = true,
            "--hidden" => options.visible = false,
            _ => return Err("Unknown option".into()),
        }
    }
    unsafe {
        windows::Win32::UI::HiDpi::SetProcessDpiAwarenessContext(
            windows::Win32::UI::HiDpi::DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2,
        )?;
    }
    let host = HostWindow::create(options)?;
    let code = host.run()?;
    drop(host);
    std::process::exit(code);
}
