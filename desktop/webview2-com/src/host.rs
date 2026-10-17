use crate::{
    assets::{AssetRoot, local_directory, nested},
    policy,
};
use std::{
    cell::{Cell, RefCell},
    fs::File,
    io::Write,
    path::PathBuf,
    rc::{Rc, Weak},
    time::Instant,
};
use webview2_com::{
    CoTaskMemPWSTR, CoreWebView2EnvironmentOptions, Microsoft::Web::WebView2::Win32::*, *,
};
use windows::{
    Win32::{
        Foundation::*,
        Graphics::Gdi::*,
        System::{Com::*, LibraryLoader::GetModuleHandleW},
        UI::{HiDpi::*, Shell::SHCreateMemStream, WindowsAndMessaging::*},
    },
    core::{Error, HSTRING, Interface, PCWSTR, PWSTR, Result, w},
};

#[derive(Clone)]
pub struct HostOptions {
    pub assets: PathBuf,
    pub profile: PathBuf,
    pub runtime: Option<PathBuf>,
    pub entry: String,
    pub visible: bool,
    pub report: Option<PathBuf>,
    pub timeout_ms: u32,
    pub smoke: bool,
    pub close_early: bool,
    pub close_environment: bool,
    pub close_controller: bool,
}
impl Default for HostOptions {
    fn default() -> Self {
        Self {
            assets: PathBuf::new(),
            profile: PathBuf::new(),
            runtime: None,
            entry: "index.html".into(),
            visible: true,
            report: None,
            timeout_ms: 0,
            smoke: false,
            close_early: false,
            close_environment: false,
            close_controller: false,
        }
    }
}
struct Apartment;
impl Apartment {
    fn new() -> Result<Self> {
        unsafe {
            CoInitializeEx(None, COINIT_APARTMENTTHREADED).ok()?;
        }
        Ok(Self)
    }
}
impl Drop for Apartment {
    fn drop(&mut self) {
        unsafe {
            CoUninitialize();
        }
    }
}

struct State {
    options: HostOptions,
    assets: AssetRoot,
    hwnd: Cell<HWND>,
    window_reference_attached: Cell<bool>,
    closed: Cell<bool>,
    failed: Cell<bool>,
    environment: RefCell<Option<ICoreWebView2Environment>>,
    controller: RefCell<Option<ICoreWebView2Controller>>,
    view: RefCell<Option<ICoreWebView2>>,
    unsubscribe: RefCell<Vec<Box<dyn FnOnce()>>>,
    report: RefCell<Option<File>>,
    began: Instant,
    request_blocks: Cell<usize>,
    navigation_blocks: Cell<usize>,
    passed: Cell<bool>,
    timed_out: Cell<bool>,
}

fn string_out(get: impl FnOnce(*mut PWSTR) -> Result<()>) -> Result<String> {
    let mut pointer = PWSTR::null();
    let result = get(&mut pointer);
    // Even on a failed COM call, free a returned allocation if present.
    let guard = CoTaskMemPWSTR::from(pointer);
    result?;
    let value = guard.to_string();
    Ok(value)
}
fn dispatch(weak: &Weak<State>, action: impl FnOnce(&Rc<State>) -> Result<()>) -> Result<()> {
    if let Some(state) = weak.upgrade() {
        if !state.closed.get() && !state.failed.get() {
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| action(&state)));
            match result {
                Ok(Ok(())) => {}
                Ok(Err(error)) => state.fail(error.code().0),
                Err(_) => state.fail(E_FAIL.0),
            }
        }
    }
    Ok(())
}
macro_rules! subscribe {
    ($state:expr,$source:expr,$add:ident,$remove:ident,$handler:expr) => {{
        let source = $source.clone();
        let handler = $handler;
        let mut token = 0;
        source.$add(&handler, &mut token)?;
        $state.unsubscribe.borrow_mut().push(Box::new(move || {
            let _ = source.$remove(token);
        }));
    }};
}

impl State {
    fn write(&self, line: &str) {
        if let Some(file) = self.report.borrow_mut().as_mut() {
            let _ = writeln!(file, "{line}");
        }
    }
    fn emit(&self, event: u32, hr: i32) {
        self.write(&format!(
            "{{\"event\":{event},\"hr\":{hr},\"microseconds\":{}}}",
            self.began.elapsed().as_micros()
        ));
    }
    fn fail(&self, hr: i32) {
        if !self.closed.get() && !self.failed.replace(true) {
            self.emit(10, hr);
            self.stop_browser();
            unsafe {
                let _ = InvalidateRect(Some(self.hwnd.get()), None, true);
            }
        }
    }
    fn stop_browser(&self) {
        let callbacks = std::mem::take(&mut *self.unsubscribe.borrow_mut());
        for callback in callbacks.into_iter().rev() {
            callback();
        }
        let controller = self.controller.borrow_mut().take();
        if let Some(controller) = controller {
            unsafe {
                let _ = controller.Close();
            }
        }
        self.view.borrow_mut().take();
        self.environment.borrow_mut().take();
    }
    fn close(&self) {
        if !self.closed.replace(true) {
            self.stop_browser();
            if !self.hwnd.get().is_invalid() {
                unsafe {
                    let _ = DestroyWindow(self.hwnd.get());
                }
            }
        }
    }
    fn resize(&self) -> Result<()> {
        if let Some(controller) = self.controller.borrow().as_ref() {
            unsafe {
                let mut rect = RECT::default();
                GetClientRect(self.hwnd.get(), &mut rect)?;
                controller.SetBounds(rect)?;
            }
        }
        Ok(())
    }
    fn respond(
        &self,
        args: &ICoreWebView2WebResourceRequestedEventArgs,
        code: i32,
        mime: &str,
        body: &[u8],
    ) -> Result<()> {
        // The IStream and response own their data independently of this callback.
        unsafe {
            let stream =
                SHCreateMemStream(Some(body)).ok_or_else(|| Error::from_hresult(E_OUTOFMEMORY))?;
            let headers = HSTRING::from(format!(
                "Content-Type: {mime}\r\nX-Content-Type-Options: nosniff\r\nCache-Control: no-store\r\nReferrer-Policy: no-referrer\r\nContent-Security-Policy: {}\r\n",
                policy::CSP
            ));
            let env = self
                .environment
                .borrow()
                .clone()
                .ok_or_else(|| Error::from_hresult(E_POINTER))?;
            let response = env.CreateWebResourceResponse(&stream, code, w!("OK"), &headers)?;
            args.SetResponse(&response)
        }
    }
    fn resource(&self, args: &ICoreWebView2WebResourceRequestedEventArgs) -> Result<()> {
        unsafe {
            let request = args.Request()?;
            let uri = string_out(|p| request.Uri(p))?;
            let method = string_out(|p| request.Method(p))?;
            let path = policy::resource_path(&uri);
            let kind = path.as_deref().and_then(policy::mime);
            if method != "GET" || kind.is_none() {
                self.request_blocks.set(self.request_blocks.get() + 1);
                self.emit(4, 0);
                return self.respond(args, 403, "text/plain", &[]);
            }
            match self.assets.read(path.as_ref().unwrap()) {
                Ok(bytes) => self.respond(args, 200, kind.unwrap(), &bytes),
                Err(_) => {
                    self.request_blocks.set(self.request_blocks.get() + 1);
                    self.emit(4, 0);
                    self.respond(args, 404, "text/plain", &[])
                }
            }
        }
    }
    fn start_browser(self: &Rc<Self>) -> Result<()> {
        let weak = Rc::downgrade(self);
        let handler =
            CreateCoreWebView2EnvironmentCompletedHandler::create(Box::new(move |hr, env| {
                dispatch(&weak, |state| {
                    hr?;
                    let env = env.ok_or_else(|| Error::from_hresult(E_POINTER))?;
                    let version = unsafe { string_out(|p| env.BrowserVersionString(p))? };
                    if version.chars().all(|c| c.is_ascii_digit() || c == '.') {
                        state.write(&format!("{{\"runtime\":\"{version}\"}}"));
                    }
                    *state.environment.borrow_mut() = Some(env.clone());
                    state.emit(0, 0);
                    if state.options.close_environment {
                        state.close();
                        return Ok(());
                    }
                    let weak = Rc::downgrade(state);
                    let ready = CreateCoreWebView2ControllerCompletedHandler::create(Box::new(
                        move |hr, controller| {
                            if weak
                                .upgrade()
                                .is_none_or(|s| s.closed.get() || s.failed.get())
                            {
                                if let Some(controller) = controller {
                                    unsafe {
                                        let _ = controller.Close();
                                    }
                                }
                                return Ok(());
                            }
                            dispatch(&weak, |state| {
                                hr?;
                                *state.controller.borrow_mut() =
                                    Some(controller.ok_or_else(|| Error::from_hresult(E_POINTER))?);
                                if state.options.close_controller {
                                    state.close();
                                    return Ok(());
                                }
                                state.configure()
                            })
                        },
                    ));
                    unsafe {
                        let env10 = env.cast::<ICoreWebView2Environment10>()?;
                        let opts = env10.CreateCoreWebView2ControllerOptions()?;
                        opts.SetProfileName(w!("NeutronStar"))?;
                        opts.SetIsInPrivateModeEnabled(true)?;
                        env10.CreateCoreWebView2ControllerWithOptions(
                            state.hwnd.get(),
                            &opts,
                            &ready,
                        )?;
                    }
                    Ok(())
                })
            }));
        let options: ICoreWebView2EnvironmentOptions =
            CoreWebView2EnvironmentOptions::default().into();
        unsafe {
            options
                .cast::<ICoreWebView2EnvironmentOptions6>()?
                .SetAreBrowserExtensionsEnabled(false)?;
        }
        let runtime = self
            .options
            .runtime
            .as_ref()
            .map(|p| HSTRING::from(p.as_os_str()));
        let profile = HSTRING::from(self.options.profile.as_os_str());
        unsafe {
            CreateCoreWebView2EnvironmentWithOptions(
                runtime
                    .as_ref()
                    .map_or(PCWSTR::null(), |p| PCWSTR(p.as_ptr())),
                &profile,
                &options,
                &handler,
            )
        }
    }
    fn configure(self: &Rc<Self>) -> Result<()> {
        // All COM calls run on the owning STA; Clone/Drop manage interface refs.
        unsafe {
            let controller = self
                .controller
                .borrow()
                .clone()
                .ok_or_else(|| Error::from_hresult(E_POINTER))?;
            let view = controller.CoreWebView2()?;
            *self.view.borrow_mut() = Some(view.clone());
            let settings = view.Settings()?;
            settings.SetAreHostObjectsAllowed(false)?;
            settings.SetIsWebMessageEnabled(false)?;
            settings.SetAreDevToolsEnabled(false)?;
            settings.SetAreDefaultContextMenusEnabled(false)?;
            settings.SetAreDefaultScriptDialogsEnabled(false)?;
            settings.SetIsStatusBarEnabled(false)?;
            settings
                .cast::<ICoreWebView2Settings3>()?
                .SetAreBrowserAcceleratorKeysEnabled(false)?;
            let settings4 = settings.cast::<ICoreWebView2Settings4>()?;
            settings4.SetIsPasswordAutosaveEnabled(false)?;
            settings4.SetIsGeneralAutofillEnabled(false)?;
            controller
                .cast::<ICoreWebView2Controller4>()?
                .SetAllowExternalDrop(false)?;
            let weak = Rc::downgrade(self);
            subscribe!(
                self,
                view,
                add_WebResourceRequested,
                remove_WebResourceRequested,
                WebResourceRequestedEventHandler::create(Box::new(move |_, args| dispatch(
                    &weak,
                    |s| s.resource(
                        args.as_ref()
                            .ok_or_else(|| Error::from_hresult(E_POINTER))?
                    )
                )))
            );
            view.AddWebResourceRequestedFilter(w!("*"), COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL)?;
            let weak = Rc::downgrade(self);
            subscribe!(
                self,
                view,
                add_NavigationStarting,
                remove_NavigationStarting,
                NavigationStartingEventHandler::create(Box::new(move |_, args| dispatch(
                    &weak,
                    |s| {
                        if let Some(args) = args {
                            let uri = string_out(|p| args.Uri(p))?;
                            if policy::resource_path(&uri).is_none() {
                                args.SetCancel(true)?;
                                s.navigation_blocks.set(s.navigation_blocks.get() + 1);
                                s.emit(5, 0);
                            }
                        }
                        Ok(())
                    }
                )))
            );
            subscribe!(
                self,
                view,
                add_FrameNavigationStarting,
                remove_FrameNavigationStarting,
                NavigationStartingEventHandler::create(Box::new(|_, args| {
                    if let Some(args) = args {
                        args.SetCancel(true)?;
                    }
                    Ok(())
                }))
            );
            let weak = Rc::downgrade(self);
            subscribe!(
                self,
                view,
                add_NewWindowRequested,
                remove_NewWindowRequested,
                NewWindowRequestedEventHandler::create(Box::new(move |_, args| dispatch(
                    &weak,
                    |s| {
                        if let Some(args) = args {
                            args.SetHandled(true)?;
                        }
                        s.emit(6, 0);
                        Ok(())
                    }
                )))
            );
            let weak = Rc::downgrade(self);
            subscribe!(
                self,
                view,
                add_PermissionRequested,
                remove_PermissionRequested,
                PermissionRequestedEventHandler::create(Box::new(move |_, args| dispatch(
                    &weak,
                    |s| {
                        if let Some(args) = args {
                            args.SetState(COREWEBVIEW2_PERMISSION_STATE_DENY)?;
                        }
                        s.emit(7, 0);
                        Ok(())
                    }
                )))
            );
            let weak = Rc::downgrade(self);
            let view4 = view.cast::<ICoreWebView2_4>()?;
            subscribe!(
                self,
                view4,
                add_DownloadStarting,
                remove_DownloadStarting,
                DownloadStartingEventHandler::create(Box::new(move |_, args| dispatch(
                    &weak,
                    |s| {
                        if let Some(args) = args {
                            args.SetCancel(true)?;
                            args.SetHandled(true)?;
                        }
                        s.emit(8, 0);
                        Ok(())
                    }
                )))
            );
            let weak = Rc::downgrade(self);
            let view18 = view.cast::<ICoreWebView2_18>()?;
            subscribe!(
                self,
                view18,
                add_LaunchingExternalUriScheme,
                remove_LaunchingExternalUriScheme,
                LaunchingExternalUriSchemeEventHandler::create(Box::new(move |_, args| dispatch(
                    &weak,
                    |s| {
                        if let Some(args) = args {
                            args.SetCancel(true)?;
                        }
                        s.emit(5, 0);
                        Ok(())
                    }
                )))
            );
            let weak = Rc::downgrade(self);
            subscribe!(
                self,
                view,
                add_NavigationCompleted,
                remove_NavigationCompleted,
                NavigationCompletedEventHandler::create(Box::new(move |_, args| dispatch(
                    &weak,
                    |s| {
                        if let Some(args) = args {
                            let mut success = windows::core::BOOL(0);
                            args.IsSuccess(&mut success)?;
                            s.emit(2, if success.as_bool() { 0 } else { 1 });
                        }
                        Ok(())
                    }
                )))
            );
            let weak = Rc::downgrade(self);
            subscribe!(
                self,
                view,
                add_DocumentTitleChanged,
                remove_DocumentTitleChanged,
                DocumentTitleChangedEventHandler::create(Box::new(move |sender, _| dispatch(
                    &weak,
                    |s| {
                        s.emit(3, 0);
                        if s.options.smoke {
                            if let Some(sender) = sender {
                                let title = string_out(|p| sender.DocumentTitle(p))?;
                                if title == "NeutronStar smoke: PASS" {
                                    s.passed.set(true);
                                    s.close();
                                } else if title == "NeutronStar smoke: FAIL" {
                                    s.failed.set(true);
                                    s.close();
                                }
                            }
                        }
                        Ok(())
                    }
                )))
            );
            let weak = Rc::downgrade(self);
            subscribe!(
                self,
                view,
                add_ProcessFailed,
                remove_ProcessFailed,
                ProcessFailedEventHandler::create(Box::new(move |_, _| dispatch(&weak, |s| {
                    s.emit(9, E_FAIL.0);
                    s.fail(E_FAIL.0);
                    Ok(())
                })))
            );
            self.resize()?;
            controller.SetIsVisible(self.options.visible)?;
            self.emit(1, 0);
            view.Navigate(&HSTRING::from(format!(
                "{}{}",
                policy::ORIGIN,
                self.options.entry
            )))?;
        }
        Ok(())
    }
}

/// Non-Send/non-Sync RAII owner. Create/use/drop on the same STA.
pub struct HostWindow {
    state: Rc<State>,
    _apartment: Apartment,
}
impl HostWindow {
    pub fn create(
        mut options: HostOptions,
    ) -> std::result::Result<Self, Box<dyn std::error::Error>> {
        let apartment = Apartment::new()?;
        if std::env::vars_os().any(|(key, _)| {
            key.to_string_lossy()
                .to_ascii_uppercase()
                .starts_with("WEBVIEW2_")
        }) {
            return Err("Remove WEBVIEW2_* overrides".into());
        }
        local_directory(&options.assets)?;
        local_directory(&options.profile)?;
        let assets = AssetRoot::new(&options.assets)?;
        options.profile = crate::assets::prospective_directory(&options.profile)?;
        if nested(assets.path(), &options.profile) || nested(&options.profile, assets.path()) {
            return Err("Assets and profile must be separate trees".into());
        }
        std::fs::create_dir_all(&options.profile)?;
        options.profile = options.profile.canonicalize()?;
        let entry = policy::resource_path(&format!("{}{}", policy::ORIGIN, options.entry))
            .ok_or("Invalid entry")?;
        if entry != options.entry || policy::mime(&entry) != Some("text/html; charset=utf-8") {
            return Err("Entry must be a relative HTML asset".into());
        }
        assets.read(&entry)?;
        if let Some(runtime) = options.runtime.as_mut() {
            local_directory(runtime)?;
            *runtime = runtime.canonicalize()?;
        }
        let report = options.report.as_ref().map(File::create).transpose()?;
        let state = Rc::new(State {
            options,
            assets,
            hwnd: Cell::new(HWND::default()),
            window_reference_attached: Cell::new(false),
            closed: Cell::new(false),
            failed: Cell::new(false),
            environment: RefCell::new(None),
            controller: RefCell::new(None),
            view: RefCell::new(None),
            unsubscribe: RefCell::new(vec![]),
            report: RefCell::new(report),
            began: Instant::now(),
            request_blocks: Cell::new(0),
            navigation_blocks: Cell::new(0),
            passed: Cell::new(false),
            timed_out: Cell::new(false),
        });
        let host = Self {
            state,
            _apartment: apartment,
        };
        unsafe {
            let module = GetModuleHandleW(None)?;
            let class = WNDCLASSW {
                lpfnWndProc: Some(procedure),
                hInstance: module.into(),
                hCursor: LoadCursorW(None, IDC_ARROW)?,
                hIcon: LoadIconW(None, IDI_APPLICATION)?,
                hbrBackground: HBRUSH((COLOR_WINDOW.0 + 1) as *mut _),
                lpszClassName: w!("NeutronStar.Rust.Host.v1"),
                ..Default::default()
            };
            if RegisterClassW(&class) == 0 && GetLastError() != ERROR_CLASS_ALREADY_EXISTS {
                return Err(Error::from_thread().into());
            }
            let dpi = GetDpiForSystem() as i32;
            let mut bounds = RECT {
                left: 0,
                top: 0,
                right: 960 * dpi / 96,
                bottom: 640 * dpi / 96,
            };
            AdjustWindowRectExForDpi(
                &mut bounds,
                WS_OVERLAPPEDWINDOW,
                false,
                WINDOW_EX_STYLE(0),
                dpi as u32,
            )?;
            // Window userdata owns one Rc until WM_NCDESTROY; callbacks keep Weak refs.
            let pointer = Rc::into_raw(host.state.clone());
            let window = CreateWindowExW(
                WINDOW_EX_STYLE(0),
                class.lpszClassName,
                w!("NeutronStar Host — local frontend"),
                WS_OVERLAPPEDWINDOW | WS_CLIPCHILDREN,
                CW_USEDEFAULT,
                CW_USEDEFAULT,
                bounds.right - bounds.left,
                bounds.bottom - bounds.top,
                None,
                None,
                Some(module.into()),
                Some(pointer.cast()),
            );
            let hwnd = match window {
                Ok(hwnd) => hwnd,
                Err(error) => {
                    if !host.state.window_reference_attached.get() {
                        drop(Rc::from_raw(pointer));
                    }
                    return Err(error.into());
                }
            };
            host.state.hwnd.set(hwnd);
            if host.state.options.visible {
                let _ = ShowWindow(hwnd, SW_SHOW);
            }
            if host.state.options.timeout_ms > 0 {
                SetTimer(Some(hwnd), 1, host.state.options.timeout_ms, None);
            }
        }
        if let Err(error) = host.state.start_browser() {
            host.state.fail(error.code().0);
        }
        if host.state.options.close_early {
            unsafe {
                PostMessageW(Some(host.state.hwnd.get()), WM_CLOSE, WPARAM(0), LPARAM(0))?;
            }
        }
        Ok(host)
    }
    pub fn close(&self) {
        self.state.close();
    }
    pub fn run(&self) -> Result<i32> {
        unsafe {
            let mut msg = MSG::default();
            while !self.state.hwnd.get().is_invalid() {
                let next = GetMessageW(&mut msg, None, 0, 0);
                if next.0 == -1 {
                    return Err(Error::from_thread());
                }
                if next.0 == 0 {
                    self.close();
                    break;
                }
                let _ = TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
        }
        let s = &self.state;
        let passed = !s.failed.get()
            && !s.timed_out.get()
            && (!s.options.smoke
                || (s.passed.get() && s.request_blocks.get() > 0 && s.navigation_blocks.get() > 0));
        s.write(&format!(
            "{{\"passed\":{passed},\"requests_blocked\":{},\"navigation_blocked\":{}}}",
            s.request_blocks.get(),
            s.navigation_blocks.get()
        ));
        Ok(if s.timed_out.get() {
            3
        } else if !passed {
            2
        } else {
            0
        })
    }
}
impl Drop for HostWindow {
    fn drop(&mut self) {
        self.close();
    }
}

unsafe extern "system" fn procedure(hwnd: HWND, msg: u32, wp: WPARAM, lp: LPARAM) -> LRESULT {
    // All raw userdata access is restricted to this STA window callback.
    unsafe {
        if msg == WM_NCCREATE {
            let create = &*(lp.0 as *const CREATESTRUCTW);
            let pointer = create.lpCreateParams as *const State;
            SetWindowLongPtrW(hwnd, GWLP_USERDATA, pointer as isize);
            (*pointer).hwnd.set(hwnd);
            (*pointer).window_reference_attached.set(true);
        }
        let pointer = GetWindowLongPtrW(hwnd, GWLP_USERDATA) as *const State;
        if pointer.is_null() {
            return DefWindowProcW(hwnd, msg, wp, lp);
        }
        Rc::increment_strong_count(pointer);
        let state = Rc::from_raw(pointer);
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(
            || -> Result<Option<LRESULT>> {
                match msg {
                    WM_CLOSE => {
                        state.close();
                        return Ok(Some(LRESULT(0)));
                    }
                    WM_TIMER if wp.0 == 1 => {
                        let _ = KillTimer(Some(hwnd), 1);
                        state.timed_out.set(true);
                        state.close();
                        return Ok(Some(LRESULT(0)));
                    }
                    WM_SIZE => {
                        state.resize()?;
                        if let Some(c) = state.controller.borrow().as_ref() {
                            c.SetIsVisible(
                                wp.0 != SIZE_MINIMIZED as usize && IsWindowVisible(hwnd).as_bool(),
                            )?;
                        }
                        return Ok(Some(LRESULT(0)));
                    }
                    WM_SHOWWINDOW => {
                        if let Some(c) = state.controller.borrow().as_ref() {
                            c.SetIsVisible(wp.0 != 0)?;
                        }
                    }
                    WM_MOVE => {
                        if let Some(c) = state.controller.borrow().as_ref() {
                            c.NotifyParentWindowPositionChanged()?;
                        }
                    }
                    WM_SETFOCUS => {
                        if let Some(c) = state.controller.borrow().as_ref() {
                            c.MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC)?;
                        }
                        return Ok(Some(LRESULT(0)));
                    }
                    WM_DPICHANGED => {
                        let rect = &*(lp.0 as *const RECT);
                        SetWindowPos(
                            hwnd,
                            None,
                            rect.left,
                            rect.top,
                            rect.right - rect.left,
                            rect.bottom - rect.top,
                            SWP_NOZORDER | SWP_NOACTIVATE,
                        )?;
                        state.resize()?;
                        return Ok(Some(LRESULT(0)));
                    }
                    WM_GETMINMAXINFO => {
                        let dpi = GetDpiForWindow(hwnd);
                        let mut rect = RECT {
                            left: 0,
                            top: 0,
                            right: 720 * dpi as i32 / 96,
                            bottom: 480 * dpi as i32 / 96,
                        };
                        AdjustWindowRectExForDpi(
                            &mut rect,
                            WS_OVERLAPPEDWINDOW,
                            false,
                            WINDOW_EX_STYLE(0),
                            dpi,
                        )?;
                        let info = &mut *(lp.0 as *mut MINMAXINFO);
                        info.ptMinTrackSize = POINT {
                            x: rect.right - rect.left,
                            y: rect.bottom - rect.top,
                        };
                        return Ok(Some(LRESULT(0)));
                    }
                    WM_PAINT => {
                        let mut paint = PAINTSTRUCT::default();
                        let dc = BeginPaint(hwnd, &mut paint);
                        let mut rect = RECT::default();
                        GetClientRect(hwnd, &mut rect)?;
                        let text = if state.failed.get() {
                            "WebView2 could not load the local application. See the native diagnostic event."
                        } else {
                            "Starting WebView2..."
                        };
                        let mut wide: Vec<u16> = text.encode_utf16().collect();
                        DrawTextW(
                            dc,
                            &mut wide,
                            &mut rect,
                            DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX,
                        );
                        let _ = EndPaint(hwnd, &paint);
                        return Ok(Some(LRESULT(0)));
                    }
                    WM_NCDESTROY => {
                        state.closed.set(true);
                        state.stop_browser();
                        state.hwnd.set(HWND::default());
                        SetWindowLongPtrW(hwnd, GWLP_USERDATA, 0);
                        state.emit(11, 0);
                        drop(Rc::from_raw(pointer));
                    }
                    _ => {}
                }
                Ok(None)
            },
        ));
        match result {
            Ok(Ok(Some(value))) => return value,
            Ok(Err(error)) => state.fail(error.code().0),
            Err(_) => state.fail(E_FAIL.0),
            _ => {}
        }
        DefWindowProcW(hwnd, msg, wp, lp)
    }
}
