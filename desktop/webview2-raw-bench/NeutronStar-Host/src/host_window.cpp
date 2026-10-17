#include <neutronstar/host_window.hpp>
#include "asset_policy.hpp"
#include "test_greet_protocol.hpp"
#include "window_protocol.hpp"

#include <objbase.h>
#include <WebView2.h>
#include <WebView2EnvironmentOptions.h>
#include <wil/com.h>
#include <wil/resource.h>
#include <wrl.h>
#include <Shlwapi.h>
#include <algorithm>
#include <stdexcept>
#include <string_view>
#include <vector>

namespace neutronstar {
namespace {
using Microsoft::WRL::Callback;
constexpr wchar_t window_class[] = L"NeutronStar.Host.Window.v1";
constexpr DWORD max_asset_bytes = 32 * 1024 * 1024;
constexpr UINT action_message = WM_APP + 0x42;

std::wstring final_path(HANDLE file) {
    const DWORD size = GetFinalPathNameByHandleW(file, nullptr, 0, FILE_NAME_NORMALIZED);
    THROW_LAST_ERROR_IF(size == 0);
    std::wstring path(size, L'\0');
    const DWORD written = GetFinalPathNameByHandleW(file, path.data(), size, FILE_NAME_NORMALIZED);
    THROW_LAST_ERROR_IF(written == 0 || written >= size);
    path.resize(written);
    return path;
}

void reject_runtime_overrides() {
    const auto environment = GetEnvironmentStringsW();
    THROW_LAST_ERROR_IF_NULL(environment);
    const auto release = wil::scope_exit([environment] { FreeEnvironmentStringsW(environment); });
    for (auto entry = environment; *entry; entry += wcslen(entry) + 1) {
        if (_wcsnicmp(entry, L"WEBVIEW2_", 9) == 0) {
            throw std::invalid_argument("Remove WEBVIEW2_* overrides before a controlled benchmark run.");
        }
    }
}

void require_local_directory(const std::filesystem::path& path) {
    if (!path.is_absolute() || path.wstring().starts_with(L"\\\\")) throw std::invalid_argument("Expected an absolute local directory.");
    const auto drive = path.root_path().wstring();
    const UINT kind = GetDriveTypeW(drive.c_str());
    if (kind != DRIVE_FIXED && kind != DRIVE_REMOVABLE) throw std::invalid_argument("Network and non-disk directories are unsupported.");
}
} // namespace

struct HostWindow::State : std::enable_shared_from_this<HostWindow::State> {
    // Declared first: COM uninitializes after every COM member has been released.
    wil::unique_couninitialize_call apartment{wil::CoInitializeEx(COINIT_APARTMENTTHREADED)};
    const DWORD thread{GetCurrentThreadId()};
    HostOptions options;
    HWND hwnd{};
    bool closed{};
    bool failed{};
    bool action_in_flight{};
    std::optional<Action> queued_action;
    std::optional<TestGreetRequest> queued_test_greet;
    std::wstring active_test_greet_id;
    const wchar_t* status{L"Starting WebView2..."};
    wil::unique_hfile root_handle;
    std::wstring root_final;
    wil::com_ptr<ICoreWebView2Environment> environment;
    wil::com_ptr<ICoreWebView2Controller> controller;
    wil::com_ptr<ICoreWebView2> webview;
    std::vector<std::function<void()>> unsubscribe;

    explicit State(HostOptions value) : options(std::move(value)) {
        if (options.memory_usage_target != MemoryUsageTarget::normal && options.memory_usage_target != MemoryUsageTarget::low)
            throw std::invalid_argument("Invalid memory target.");
        reject_runtime_overrides();
        if (options.asset_directory.empty() || options.user_data_directory.empty()) throw std::invalid_argument("Asset and user-data directories are required.");
        options.asset_directory = std::filesystem::canonical(options.asset_directory);
        options.user_data_directory = std::filesystem::weakly_canonical(std::filesystem::absolute(options.user_data_directory));
        require_local_directory(options.asset_directory);
        require_local_directory(options.user_data_directory);
        const auto assets = options.asset_directory.wstring();
        const auto profile = options.user_data_directory.wstring();
        if (_wcsicmp(assets.c_str(), profile.c_str()) == 0 || detail::is_within(assets, profile) || detail::is_within(profile, assets)) {
            throw std::invalid_argument("Assets and runtime profile must be separate directory trees.");
        }
        if (!options.fixed_runtime_directory.empty()) {
            options.fixed_runtime_directory = std::filesystem::canonical(options.fixed_runtime_directory);
            require_local_directory(options.fixed_runtime_directory);
        }
        const auto entry = detail::resource_path(std::wstring{detail::origin} + options.entry_path);
        if (!entry || *entry != options.entry_path || detail::mime_type(*entry) != L"text/html; charset=utf-8") throw std::invalid_argument("Entry must be a relative HTML asset path.");
        if (options.minimum_width_dip < 320 || options.minimum_height_dip < 240 ||
            options.client_width_dip < options.minimum_width_dip || options.client_height_dip < options.minimum_height_dip ||
            options.client_width_dip > 8192 || options.client_height_dip > 8192) throw std::invalid_argument("Invalid window dimensions.");
        root_handle.reset(CreateFileW(assets.c_str(), FILE_READ_ATTRIBUTES, FILE_SHARE_READ | FILE_SHARE_WRITE,
            nullptr, OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT, nullptr));
        THROW_LAST_ERROR_IF(!root_handle);
        root_final = final_path(root_handle.get());
        std::filesystem::create_directories(options.user_data_directory);
        // Fail missing/unsupported entry before creating a window or browser process.
        (void)read_asset(*entry);
    }

    void assert_thread() const {
        if (thread != GetCurrentThreadId()) throw std::logic_error("HostWindow must be used on its creating STA thread.");
    }

    void emit(EventKind kind, HRESULT result = S_OK, std::wstring detail = {}) noexcept {
        if (!options.on_event) return;
        try { options.on_event(Event{kind, result, std::move(detail)}); }
        catch (...) {
            failed = true;
            if (hwnd) PostMessageW(hwnd, WM_CLOSE, 0, 0);
        } // Never unwind through a COM/Win32 callback.
    }

    void stop_browser() noexcept {
        queued_test_greet.reset();
        active_test_greet_id.clear();
        queued_action.reset();
        action_in_flight = false;
        for (auto it = unsubscribe.rbegin(); it != unsubscribe.rend(); ++it) { try { (*it)(); } catch (...) {} }
        unsubscribe.clear();
        if (controller) (void)controller->Close();
        webview.reset();
        controller.reset();
        environment.reset();
    }

    void fail(HRESULT hr) noexcept {
        if (closed || failed) return;
        failed = true;
        stop_browser();
        status = L"WebView2 could not load the local application. See the native diagnostic event.";
        if (hwnd) InvalidateRect(hwnd, nullptr, TRUE);
        emit(EventKind::failed, hr);
    }

    template<class F> static HRESULT dispatch(std::weak_ptr<State> weak, F&& action) noexcept {
        auto self = weak.lock();
        if (!self || self->closed || self->failed) return S_OK;
        try { action(*self); }
        catch (...) { self->fail(wil::ResultFromCaughtException()); }
        return S_OK;
    }

    std::vector<BYTE> read_asset(const std::wstring& relative) const {
        auto file_path = options.asset_directory;
        // Reject reparse components. Final handle confinement additionally catches redirection.
        for (const auto& component : std::filesystem::path{relative}) {
            file_path /= component;
            const DWORD attributes = GetFileAttributesW(file_path.c_str());
            THROW_LAST_ERROR_IF(attributes == INVALID_FILE_ATTRIBUTES);
            THROW_HR_IF(E_ACCESSDENIED, (attributes & FILE_ATTRIBUTE_REPARSE_POINT) != 0);
        }
        wil::unique_hfile file{CreateFileW(file_path.c_str(), GENERIC_READ, FILE_SHARE_READ, nullptr,
            OPEN_EXISTING, FILE_FLAG_OPEN_REPARSE_POINT | FILE_FLAG_SEQUENTIAL_SCAN, nullptr)};
        THROW_LAST_ERROR_IF(!file);
        BY_HANDLE_FILE_INFORMATION info{};
        THROW_IF_WIN32_BOOL_FALSE(GetFileInformationByHandle(file.get(), &info));
        THROW_HR_IF(E_ACCESSDENIED, (info.dwFileAttributes & (FILE_ATTRIBUTE_REPARSE_POINT | FILE_ATTRIBUTE_DIRECTORY)) != 0 ||
            GetFileType(file.get()) != FILE_TYPE_DISK || !detail::is_within(root_final, final_path(file.get())));
        LARGE_INTEGER size{};
        THROW_IF_WIN32_BOOL_FALSE(GetFileSizeEx(file.get(), &size));
        THROW_HR_IF(E_INVALIDARG, size.QuadPart < 0 || size.QuadPart > max_asset_bytes);
        std::vector<BYTE> data(static_cast<size_t>(size.QuadPart));
        DWORD read{};
        THROW_IF_WIN32_BOOL_FALSE(ReadFile(file.get(), data.data(), static_cast<DWORD>(data.size()), &read, nullptr));
        THROW_HR_IF(E_FAIL, read != data.size());
        return data;
    }

    void response(ICoreWebView2WebResourceRequestedEventArgs* args, int code,
                  std::wstring_view type, const std::vector<BYTE>& body) {
        wil::com_ptr<IStream> stream;
        stream.attach(SHCreateMemStream(body.data(), static_cast<UINT>(body.size())));
        THROW_HR_IF_NULL(E_OUTOFMEMORY, stream.get());
        const std::string csp{detail::content_security_policy};
        std::wstring headers = L"Content-Type: " + std::wstring{type} + L"\r\nX-Content-Type-Options: nosniff\r\nCache-Control: no-store\r\nReferrer-Policy: no-referrer\r\nContent-Security-Policy: ";
        headers.append(csp.begin(), csp.end());
        headers += L"\r\n";
        wil::com_ptr<ICoreWebView2WebResourceResponse> result;
        THROW_IF_FAILED(environment->CreateWebResourceResponse(stream.get(), code, code == 200 ? L"OK" : L"Blocked or unavailable", headers.c_str(), result.put()));
        THROW_IF_FAILED(args->put_Response(result.get()));
    }

    void resource_requested(ICoreWebView2WebResourceRequestedEventArgs* args) {
        wil::com_ptr<ICoreWebView2WebResourceRequest> request;
        THROW_IF_FAILED(args->get_Request(request.put()));
        wil::unique_cotaskmem_string uri, method;
        THROW_IF_FAILED(request->get_Uri(uri.put()));
        THROW_IF_FAILED(request->get_Method(method.put()));
        const auto relative = detail::resource_path(uri.get());
        const auto type = relative ? detail::mime_type(*relative) : std::nullopt;
        if (!relative || !type || wcscmp(method.get(), L"GET") != 0) {
            response(args, 403, L"text/plain", {});
            emit(EventKind::request_blocked);
            return;
        }
        std::vector<BYTE> bytes;
        try { bytes = read_asset(*relative); }
        catch (...) { response(args, 404, L"text/plain", {}); emit(EventKind::request_blocked); return; }
        response(args, 200, *type, bytes);
    }

    template<class Interface, class Handler, class Add, class Remove>
    void subscribe(wil::com_ptr<Interface> source, Handler handler, Add add, Remove remove) {
        EventRegistrationToken token{};
        THROW_IF_FAILED((source.get()->*add)(handler.Get(), &token));
        try { unsubscribe.emplace_back([source, token, remove] { (void)(source.get()->*remove)(token); }); }
        catch (...) { (void)(source.get()->*remove)(token); throw; }
    }

    void configure_browser() {
        THROW_IF_FAILED(controller->get_CoreWebView2(webview.put()));
        wil::com_ptr<ICoreWebView2Settings> settings;
        THROW_IF_FAILED(webview->get_Settings(settings.put()));
        THROW_IF_FAILED(settings->put_AreHostObjectsAllowed(FALSE));
        THROW_IF_FAILED(settings->put_IsWebMessageEnabled(options.on_action || options.on_test_greet || options.allow_window_controls ? TRUE : FALSE));
        if (!options.decorations) {
            auto settings9 = settings.query<ICoreWebView2Settings9>();
            THROW_IF_FAILED(settings9->put_IsNonClientRegionSupportEnabled(TRUE));
        }
        if (options.memory_usage_target == MemoryUsageTarget::low) set_memory_usage_target(MemoryUsageTarget::low);
        if (closed || failed) return;
        THROW_IF_FAILED(settings->put_AreDevToolsEnabled(FALSE));
        THROW_IF_FAILED(settings->put_AreDefaultContextMenusEnabled(FALSE));
        THROW_IF_FAILED(settings->put_AreDefaultScriptDialogsEnabled(FALSE));
        THROW_IF_FAILED(settings->put_IsStatusBarEnabled(FALSE));
        auto settings3 = settings.query<ICoreWebView2Settings3>();
        THROW_IF_FAILED(settings3->put_AreBrowserAcceleratorKeysEnabled(FALSE));
        auto settings4 = settings.query<ICoreWebView2Settings4>();
        THROW_IF_FAILED(settings4->put_IsPasswordAutosaveEnabled(FALSE));
        THROW_IF_FAILED(settings4->put_IsGeneralAutofillEnabled(FALSE));
        auto controller4 = controller.query<ICoreWebView2Controller4>();
        THROW_IF_FAILED(controller4->put_AllowExternalDrop(FALSE));
        const std::weak_ptr<State> weak = shared_from_this();
        if (options.on_action || options.on_test_greet || options.allow_window_controls) {
            subscribe(webview, Callback<ICoreWebView2WebMessageReceivedEventHandler>([weak](auto*, auto* args) -> HRESULT {
                return dispatch(weak, [args](State& s) {
                    wil::unique_cotaskmem_string source, message;
                    THROW_IF_FAILED(args->get_Source(source.put()));
                    const size_t limit = s.options.on_test_greet ? detail::test_greet_json_limit : 66;
                    if (!detail::resource_path(source.get()) || FAILED(args->get_WebMessageAsJson(message.put())) ||
                        !message || wcsnlen_s(message.get(), limit + 1) > limit) {
                        s.emit(EventKind::action_rejected, E_INVALIDARG); return;
                    }
                    if (const auto command = detail::parse_window_command_json(message.get()); command && s.options.allow_window_controls) {
                        const WPARAM system_command = *command == detail::WindowCommand::minimize ? SC_MINIMIZE :
                            (*command == detail::WindowCommand::close ? SC_CLOSE : (IsZoomed(s.hwnd) ? SC_RESTORE : SC_MAXIMIZE));
                        THROW_IF_WIN32_BOOL_FALSE(PostMessageW(s.hwnd, WM_SYSCOMMAND, system_command, 0));
                        s.emit(EventKind::window_command);
                        return;
                    }
                    const auto action = detail::parse_action_json(message.get());
                    auto greeting = s.options.on_test_greet ? detail::parse_test_greet_json(message.get()) : std::nullopt;
                    if (s.action_in_flight || (!greeting && (!action || !s.options.on_action))) {
                        s.emit(EventKind::action_rejected, E_INVALIDARG); return;
                    }
                    // Queue one enum or bounded opt-in test request. Avoid application work inside COM dispatch.
                    s.action_in_flight = true;
                    if (greeting) {
                        s.active_test_greet_id = greeting->id;
                        s.queued_test_greet = std::move(greeting);
                    } else s.queued_action = *action;
                    if (!PostMessageW(s.hwnd, action_message, 0, 0)) {
                        s.action_in_flight = false;
                        s.queued_action.reset();
                        s.queued_test_greet.reset();
                        s.active_test_greet_id.clear();
                        THROW_LAST_ERROR();
                    }
                });
            }), &ICoreWebView2::add_WebMessageReceived, &ICoreWebView2::remove_WebMessageReceived);
        }
        subscribe(webview, Callback<ICoreWebView2WebResourceRequestedEventHandler>([weak](auto*, auto* args) -> HRESULT {
            return dispatch(weak, [args](State& s) { s.resource_requested(args); });
        }), &ICoreWebView2::add_WebResourceRequested, &ICoreWebView2::remove_WebResourceRequested);
        THROW_IF_FAILED(webview->AddWebResourceRequestedFilter(L"*", COREWEBVIEW2_WEB_RESOURCE_CONTEXT_ALL));
        subscribe(webview, Callback<ICoreWebView2NavigationStartingEventHandler>([weak](auto*, auto* args) -> HRESULT {
            return dispatch(weak, [args](State& s) {
                wil::unique_cotaskmem_string uri;
                THROW_IF_FAILED(args->get_Uri(uri.put()));
                if (!detail::resource_path(uri.get())) { THROW_IF_FAILED(args->put_Cancel(TRUE)); s.emit(EventKind::navigation_blocked); }
            });
        }), &ICoreWebView2::add_NavigationStarting, &ICoreWebView2::remove_NavigationStarting);
        subscribe(webview, Callback<ICoreWebView2NavigationStartingEventHandler>([](auto*, auto* args) -> HRESULT {
            return args->put_Cancel(TRUE);
        }), &ICoreWebView2::add_FrameNavigationStarting, &ICoreWebView2::remove_FrameNavigationStarting);
        subscribe(webview, Callback<ICoreWebView2NewWindowRequestedEventHandler>([weak](auto*, auto* args) -> HRESULT {
            return dispatch(weak, [args](State& s) { THROW_IF_FAILED(args->put_Handled(TRUE)); s.emit(EventKind::popup_blocked); });
        }), &ICoreWebView2::add_NewWindowRequested, &ICoreWebView2::remove_NewWindowRequested);
        subscribe(webview, Callback<ICoreWebView2PermissionRequestedEventHandler>([weak](auto*, auto* args) -> HRESULT {
            return dispatch(weak, [args](State& s) { THROW_IF_FAILED(args->put_State(COREWEBVIEW2_PERMISSION_STATE_DENY)); s.emit(EventKind::permission_denied); });
        }), &ICoreWebView2::add_PermissionRequested, &ICoreWebView2::remove_PermissionRequested);
        auto view4 = webview.query<ICoreWebView2_4>();
        subscribe(view4, Callback<ICoreWebView2DownloadStartingEventHandler>([weak](auto*, auto* args) -> HRESULT {
            return dispatch(weak, [args](State& s) { THROW_IF_FAILED(args->put_Cancel(TRUE)); THROW_IF_FAILED(args->put_Handled(TRUE)); s.emit(EventKind::download_blocked); });
        }), &ICoreWebView2_4::add_DownloadStarting, &ICoreWebView2_4::remove_DownloadStarting);
        auto view18 = webview.query<ICoreWebView2_18>();
        subscribe(view18, Callback<ICoreWebView2LaunchingExternalUriSchemeEventHandler>([weak](auto*, auto* args) -> HRESULT {
            return dispatch(weak, [args](State& s) { THROW_IF_FAILED(args->put_Cancel(TRUE)); s.emit(EventKind::navigation_blocked); });
        }), &ICoreWebView2_18::add_LaunchingExternalUriScheme, &ICoreWebView2_18::remove_LaunchingExternalUriScheme);
        subscribe(webview, Callback<ICoreWebView2NavigationCompletedEventHandler>([weak](auto*, auto* args) -> HRESULT {
            return dispatch(weak, [args](State& s) {
                BOOL success{};
                THROW_IF_FAILED(args->get_IsSuccess(&success));
                COREWEBVIEW2_WEB_ERROR_STATUS error{};
                THROW_IF_FAILED(args->get_WebErrorStatus(&error));
                // A policy-canceled external navigation leaves the current document usable.
                s.emit(EventKind::navigation_complete, success ? S_OK :
                    (error == COREWEBVIEW2_WEB_ERROR_STATUS_OPERATION_CANCELED ? S_FALSE : E_FAIL));
            });
        }), &ICoreWebView2::add_NavigationCompleted, &ICoreWebView2::remove_NavigationCompleted);
        subscribe(webview, Callback<ICoreWebView2DocumentTitleChangedEventHandler>([weak](auto* sender, auto*) -> HRESULT {
            return dispatch(weak, [sender](State& s) {
                wil::unique_cotaskmem_string title;
                THROW_IF_FAILED(sender->get_DocumentTitle(title.put()));
                s.emit(EventKind::document_title_changed, S_OK, std::wstring{title.get()}.substr(0, 256));
            });
        }), &ICoreWebView2::add_DocumentTitleChanged, &ICoreWebView2::remove_DocumentTitleChanged);
        subscribe(webview, Callback<ICoreWebView2ProcessFailedEventHandler>([weak](auto*, auto*) -> HRESULT {
            return dispatch(weak, [](State& s) { s.emit(EventKind::process_failed, E_FAIL); s.fail(E_FAIL); });
        }), &ICoreWebView2::add_ProcessFailed, &ICoreWebView2::remove_ProcessFailed);
        resize();
        THROW_IF_FAILED(controller->put_IsVisible(IsWindowVisible(hwnd)));
        emit(EventKind::controller_ready);
        if (closed) return;
        const auto url = std::wstring{detail::origin} + options.entry_path;
        THROW_IF_FAILED(webview->Navigate(url.c_str()));
    }

    void start_browser() {
        auto env_options = Microsoft::WRL::Make<CoreWebView2EnvironmentOptions>();
        THROW_HR_IF_NULL(E_OUTOFMEMORY, env_options.Get());
        wil::com_ptr<ICoreWebView2EnvironmentOptions6> extensions;
        THROW_IF_FAILED(env_options->QueryInterface(__uuidof(ICoreWebView2EnvironmentOptions6), extensions.put_void()));
        THROW_IF_FAILED(extensions->put_AreBrowserExtensionsEnabled(FALSE));
        const std::weak_ptr<State> weak = shared_from_this();
        const auto handler = Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler>([weak](HRESULT hr, auto* env) -> HRESULT {
            return dispatch(weak, [hr, env, weak](State& s) {
                THROW_IF_FAILED(hr);
                THROW_HR_IF_NULL(E_POINTER, env);
                s.environment = env;
                wil::unique_cotaskmem_string version;
                THROW_IF_FAILED(env->get_BrowserVersionString(version.put()));
                s.emit(EventKind::environment_ready, S_OK, version.get());
                if (s.closed) return;
                auto env10 = s.environment.query<ICoreWebView2Environment10>();
                wil::com_ptr<ICoreWebView2ControllerOptions> settings;
                THROW_IF_FAILED(env10->CreateCoreWebView2ControllerOptions(settings.put()));
                THROW_IF_FAILED(settings->put_ProfileName(L"NeutronStar"));
                THROW_IF_FAILED(settings->put_IsInPrivateModeEnabled(TRUE));
                const auto ready = Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler>([weak](HRESULT result, auto* created) -> HRESULT {
                    const auto current = weak.lock();
                    if (!current || current->closed || current->failed) { if (created) (void)created->Close(); return S_OK; }
                    return dispatch(weak, [result, created](State& state) {
                        THROW_IF_FAILED(result);
                        THROW_HR_IF_NULL(E_POINTER, created);
                        state.controller = created;
                        state.configure_browser();
                    });
                });
                THROW_IF_FAILED(env10->CreateCoreWebView2ControllerWithOptions(s.hwnd, settings.get(), ready.Get()));
            });
        });
        const auto runtime = options.fixed_runtime_directory.wstring();
        THROW_IF_FAILED(CreateCoreWebView2EnvironmentWithOptions(runtime.empty() ? nullptr : runtime.c_str(),
            options.user_data_directory.c_str(), env_options.Get(), handler.Get()));
    }

    void resize() {
        if (!controller || !hwnd) return;
        RECT bounds{};
        THROW_IF_WIN32_BOOL_FALSE(GetClientRect(hwnd, &bounds));
        THROW_IF_FAILED(controller->put_Bounds(bounds));
    }

    void set_memory_usage_target(MemoryUsageTarget target) {
        assert_thread();
        if (target != MemoryUsageTarget::normal && target != MemoryUsageTarget::low) throw std::invalid_argument("Invalid memory target.");
        if (closed || failed || !webview) throw std::logic_error("WebView is not ready.");
        auto view19 = webview.query<ICoreWebView2_19>();
        const auto level = target == MemoryUsageTarget::low ? COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW : COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL;
        THROW_IF_FAILED(view19->put_MemoryUsageTargetLevel(level));
        COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL actual{};
        THROW_IF_FAILED(view19->get_MemoryUsageTargetLevel(&actual));
        THROW_HR_IF(E_FAIL, actual != level);
        options.memory_usage_target = target;
        emit(EventKind::memory_target_changed, S_OK, target == MemoryUsageTarget::low ? L"low" : L"normal");
    }

    [[nodiscard]] DWORD window_style() const noexcept {
        return options.decorations ? WS_OVERLAPPEDWINDOW : WS_POPUP | WS_THICKFRAME | WS_SYSMENU | WS_MINIMIZEBOX | WS_MAXIMIZEBOX;
    }

    void close() {
        assert_thread();
        if (closed) return;
        closed = true;
        stop_browser();
        if (hwnd) DestroyWindow(hwnd);
    }

    void post_status(Status value) {
        assert_thread();
        if (!active_test_greet_id.empty()) throw std::logic_error("A test greeting owns the busy gate.");
        const auto token = detail::status_message(value);
        if (!token) throw std::invalid_argument("Invalid status.");
        if (closed || failed || !webview || !options.on_action) throw std::logic_error("Action bridge is not ready/enabled.");
        wil::unique_cotaskmem_string source;
        THROW_IF_FAILED(webview->get_Source(source.put()));
        THROW_HR_IF(E_ACCESSDENIED, !detail::resource_path(source.get()));
        THROW_IF_FAILED(webview->PostWebMessageAsString(token));
        if (value != Status::busy) { action_in_flight = false; queued_action.reset(); }
    }

    void post_test_greeting(std::wstring_view id, std::wstring_view text) {
        assert_thread();
        if (closed || failed || !webview || !options.on_test_greet || active_test_greet_id.empty() || id != active_test_greet_id)
            throw std::logic_error("No matching active test greeting.");
        const auto response = detail::test_greet_result(id, text);
        wil::unique_cotaskmem_string source;
        THROW_IF_FAILED(webview->get_Source(source.put()));
        THROW_HR_IF(E_ACCESSDENIED, !detail::resource_path(source.get()));
        THROW_IF_FAILED(webview->PostWebMessageAsString(response.c_str()));
        active_test_greet_id.clear();
        queued_test_greet.reset();
        action_in_flight = false;
    }

    static LRESULT CALLBACK procedure(HWND window, UINT msg, WPARAM wp, LPARAM lp) noexcept {
        auto raw = reinterpret_cast<State*>(GetWindowLongPtrW(window, GWLP_USERDATA));
        if (msg == WM_NCCREATE) {
            raw = static_cast<State*>(reinterpret_cast<CREATESTRUCTW*>(lp)->lpCreateParams);
            raw->hwnd = window;
            SetWindowLongPtrW(window, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(raw));
        }
        if (!raw) return DefWindowProcW(window, msg, wp, lp);
        auto self = raw->shared_from_this();
        try {
            switch (msg) {
            case action_message:
                if (!self->closed && self->options.on_test_greet && self->queued_test_greet) {
                    const auto request = std::move(*self->queued_test_greet);
                    self->queued_test_greet.reset();
                    self->options.on_test_greet(request);
                    return 0;
                }
                if (!self->closed && self->options.on_action && self->action_in_flight && self->queued_action) {
                    const auto action = *self->queued_action;
                    self->queued_action.reset();
                    self->post_status(Status::busy);
                    self->options.on_action(action);
                }
                return 0;
            case WM_CLOSE: self->close(); return 0;
            case WM_SIZE:
                self->resize();
                if (self->controller) THROW_IF_FAILED(self->controller->put_IsVisible(wp != SIZE_MINIMIZED && IsWindowVisible(window)));
                if (self->options.allow_window_controls) self->emit(EventKind::window_state_changed, S_OK,
                    wp == SIZE_MINIMIZED ? L"minimized" : (wp == SIZE_MAXIMIZED ? L"maximized" : L"normal"));
                return 0;
            case WM_SHOWWINDOW:
                if (self->controller) THROW_IF_FAILED(self->controller->put_IsVisible(wp != 0));
                break;
            case WM_MOVE:
                if (self->controller) THROW_IF_FAILED(self->controller->NotifyParentWindowPositionChanged());
                break;
            case WM_SETFOCUS:
                if (self->controller) THROW_IF_FAILED(self->controller->MoveFocus(COREWEBVIEW2_MOVE_FOCUS_REASON_PROGRAMMATIC));
                return 0;
            case WM_DPICHANGED: {
                const auto rect = reinterpret_cast<RECT*>(lp);
                SetWindowPos(window, nullptr, rect->left, rect->top, rect->right - rect->left, rect->bottom - rect->top, SWP_NOZORDER | SWP_NOACTIVATE);
                self->resize();
                return 0;
            }
            case WM_GETMINMAXINFO: {
                const UINT dpi = GetDpiForWindow(window);
                RECT rect{0, 0, MulDiv(self->options.minimum_width_dip, static_cast<int>(dpi), 96), MulDiv(self->options.minimum_height_dip, static_cast<int>(dpi), 96)};
                AdjustWindowRectExForDpi(&rect, self->window_style(), FALSE, 0, dpi);
                auto info = reinterpret_cast<MINMAXINFO*>(lp);
                info->ptMinTrackSize = POINT{rect.right - rect.left, rect.bottom - rect.top};
                if (!self->options.decorations) {
                    MONITORINFO monitor{};
                    monitor.cbSize = sizeof(monitor);
                    THROW_IF_WIN32_BOOL_FALSE(GetMonitorInfoW(MonitorFromWindow(window, MONITOR_DEFAULTTONEAREST), &monitor));
                    info->ptMaxPosition = POINT{monitor.rcWork.left - monitor.rcMonitor.left, monitor.rcWork.top - monitor.rcMonitor.top};
                    info->ptMaxSize = POINT{monitor.rcWork.right - monitor.rcWork.left, monitor.rcWork.bottom - monitor.rcWork.top};
                }
                return 0;
            }
            case WM_PAINT: {
                PAINTSTRUCT paint{};
                HDC dc = BeginPaint(window, &paint);
                RECT rect{};
                GetClientRect(window, &rect);
                DrawTextW(dc, self->status, -1, &rect, DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
                EndPaint(window, &paint);
                return 0;
            }
            case WM_NCDESTROY:
                self->closed = true;
                self->stop_browser();
                self->hwnd = nullptr;
                SetWindowLongPtrW(window, GWLP_USERDATA, 0);
                self->emit(EventKind::closed);
                break;
            default: break;
            }
        } catch (...) { self->fail(wil::ResultFromCaughtException()); }
        return DefWindowProcW(window, msg, wp, lp);
    }

    void create_window() {
        WNDCLASSW cls{};
        cls.lpfnWndProc = procedure;
        cls.hInstance = GetModuleHandleW(nullptr);
        cls.hCursor = LoadCursorW(nullptr, IDC_ARROW);
        cls.hIcon = LoadIconW(nullptr, IDI_APPLICATION);
        cls.hbrBackground = reinterpret_cast<HBRUSH>(COLOR_WINDOW + 1);
        cls.lpszClassName = window_class;
        if (!RegisterClassW(&cls) && GetLastError() != ERROR_CLASS_ALREADY_EXISTS) THROW_LAST_ERROR();
        const UINT dpi = GetDpiForSystem();
        RECT rect{0, 0, MulDiv(options.client_width_dip, static_cast<int>(dpi), 96), MulDiv(options.client_height_dip, static_cast<int>(dpi), 96)};
        THROW_IF_WIN32_BOOL_FALSE(AdjustWindowRectExForDpi(&rect, window_style(), FALSE, 0, dpi));
        THROW_LAST_ERROR_IF_NULL(CreateWindowExW(0, window_class, options.title.c_str(), window_style() | WS_CLIPCHILDREN,
            CW_USEDEFAULT, CW_USEDEFAULT, rect.right - rect.left, rect.bottom - rect.top, nullptr, nullptr, cls.hInstance, this));
        if (options.visible) ShowWindow(hwnd, SW_SHOW);
        try { start_browser(); } catch (...) { fail(wil::ResultFromCaughtException()); }
    }
};

HostWindow::HostWindow(std::shared_ptr<State> state) : state_(std::move(state)) {}
HostWindow::~HostWindow() {
    if (state_->thread != GetCurrentThreadId()) std::terminate();
    state_->close();
}
std::unique_ptr<HostWindow> HostWindow::create(HostOptions options) {
    auto state = std::make_shared<State>(std::move(options));
    auto result = std::unique_ptr<HostWindow>{new HostWindow{state}};
    state->create_window();
    return result;
}
HWND HostWindow::native_handle() const noexcept { return state_->hwnd; }
void HostWindow::close() { state_->close(); }
void HostWindow::set_memory_usage_target(MemoryUsageTarget target) { state_->set_memory_usage_target(target); }
void HostWindow::post_status(Status status) { state_->post_status(status); }
void HostWindow::post_test_greeting(std::wstring_view id, std::wstring_view greeting) { state_->post_test_greeting(id, greeting); }
int HostWindow::run() {
    state_->assert_thread();
    MSG message{};
    while (state_->hwnd) {
        const BOOL next = GetMessageW(&message, nullptr, 0, 0);
        if (next == -1) THROW_LAST_ERROR();
        if (!next) { close(); return static_cast<int>(message.wParam); }
        TranslateMessage(&message);
        DispatchMessageW(&message);
    }
    return state_->failed ? 1 : 0;
}
} // namespace neutronstar
