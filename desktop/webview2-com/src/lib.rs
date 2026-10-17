//! STA-owned minimal Win32/WebView2 host, modeled on NeutronStar's C++ baseline.
mod assets;
mod host;
pub mod policy;
pub use host::{HostOptions, HostWindow};
