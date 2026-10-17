#include <neutronstar/host_window.hpp>
#include "test_greet_protocol.hpp"
#include <shellapi.h>
#include <chrono>
#include <fstream>
#include <stdexcept>
#include <string_view>

namespace {
bool timed_out{};
std::optional<neutronstar::TestGreetRequest> pending_greeting;
neutronstar::HostWindow* acknowledgment_host{}; // Only this single-window synthetic runner uses a timer.
void CALLBACK timeout(HWND hwnd, UINT, UINT_PTR id, DWORD) {
    timed_out = true;
    KillTimer(hwnd, id);
    PostMessageW(hwnd, WM_CLOSE, 0, 0);
}
void CALLBACK acknowledge(HWND hwnd, UINT, UINT_PTR id, DWORD) {
    KillTimer(hwnd, id);
    try { if (acknowledgment_host) acknowledgment_host->post_status(neutronstar::Status::succeeded); }
    catch (...) { PostMessageW(hwnd, WM_CLOSE, 0, 0); }
}
void CALLBACK greet_reply(HWND hwnd, UINT, UINT_PTR id, DWORD) {
    KillTimer(hwnd, id);
    try {
        if (acknowledgment_host && pending_greeting) {
            acknowledgment_host->post_test_greeting(pending_greeting->id, neutronstar::detail::make_test_greeting(pending_greeting->name));
            pending_greeting.reset();
        }
    } catch (...) { PostMessageW(hwnd, WM_CLOSE, 0, 0); }
}
}

int WINAPI wWinMain(HINSTANCE, HINSTANCE, PWSTR, int) {
    try {
        // The embedding application owns process DPI policy; library owns per-window resize handling.
        if (!SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2) && GetLastError() != ERROR_ACCESS_DENIED) {
            throw std::runtime_error("Unable to select PerMonitorV2 DPI policy.");
        }
        int count{};
        auto argv = CommandLineToArgvW(GetCommandLineW(), &count);
        if (!argv) throw std::runtime_error("Unable to parse arguments.");
        struct Arguments { wchar_t** value; ~Arguments() { LocalFree(value); } } arguments{argv};
        neutronstar::HostOptions options;
        options.title = L"NeutronStar Host — local frontend";
        bool smoke{}, close_early{}, bridge{}, close_environment{}, close_controller{}, test_greet{}, greet_smoke{};
        bool window_smoke{}, memory_smoke{};
        UINT timeout_ms{};
        std::filesystem::path report;
        for (int i = 1; i < count; ++i) {
            const std::wstring_view arg{argv[i]};
            auto value = [&]() -> const wchar_t* {
                if (++i >= count) throw std::invalid_argument("Missing argument value.");
                return argv[i];
            };
            if (arg == L"--assets") options.asset_directory = value();
            else if (arg == L"--profile") options.user_data_directory = value();
            else if (arg == L"--runtime") options.fixed_runtime_directory = value();
            else if (arg == L"--entry") options.entry_path = value();
            else if (arg == L"--report") report = value();
            else if (arg == L"--hidden") options.visible = false;
            else if (arg == L"--custom-titlebar") { options.decorations = false; options.allow_window_controls = true; }
            else if (arg == L"--memory-target") {
                const std::wstring_view target{value()};
                if (target == L"low") options.memory_usage_target = neutronstar::MemoryUsageTarget::low;
                else if (target == L"normal") options.memory_usage_target = neutronstar::MemoryUsageTarget::normal;
                else throw std::invalid_argument("Memory target must be normal or low.");
            }
            else if (arg == L"--window-smoke-test") {
                smoke = true; window_smoke = true; options.decorations = false; options.allow_window_controls = true;
            }
            else if (arg == L"--memory-smoke-test") {
                smoke = true; memory_smoke = true; options.memory_usage_target = neutronstar::MemoryUsageTarget::low;
            }
            else if (arg == L"--smoke-test") smoke = true;
            else if (arg == L"--bridge-smoke-test") { smoke = true; bridge = true; }
            else if (arg == L"--test-greet") test_greet = true;
            else if (arg == L"--test-greet-smoke-test") { smoke = true; test_greet = true; greet_smoke = true; }
            else if (arg == L"--close-before-ready") close_early = true;
            else if (arg == L"--close-at-environment") close_environment = true;
            else if (arg == L"--close-at-controller") close_controller = true;
            else if (arg == L"--timeout-ms") {
                const std::wstring text{value()};
                size_t consumed{};
                const auto number = std::stoul(text, &consumed);
                if (consumed != text.size() || number < 100 || number > 120000) throw std::invalid_argument("Timeout must be 100..120000 ms.");
                timeout_ms = static_cast<UINT>(number);
            } else throw std::invalid_argument("Unknown argument.");
        }
        if (smoke && timeout_ms == 0) timeout_ms = 20000;
        std::ofstream output;
        if (!report.empty()) { output.open(report, std::ios::trunc); if (!output) throw std::runtime_error("Unable to create diagnostic report."); }
        if (output) output << "{\"decorations\":" << (options.decorations ? "true" : "false")
            << ",\"window_controls\":" << (options.allow_window_controls ? "true" : "false")
            << ",\"memory_target\":\"" << (options.memory_usage_target == neutronstar::MemoryUsageTarget::low ? "low" : "normal") << "\"}\n";
        std::unique_ptr<neutronstar::HostWindow> host;
        bool passed{}, failure{}, pending_close{};
        size_t navigation_blocks{}, request_blocks{}, popup_blocks{}, action_rejects{}, action_count{}, greet_count{};
        size_t window_commands{}, memory_changes{};
        bool saw_maximized{}, saw_restored{}, saw_minimized{};
        const auto start = std::chrono::steady_clock::now();
        options.on_event = [&](const neutronstar::Event& event) {
            if (output) {
                const auto elapsed = std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now() - start).count();
                // Numeric fixed-schema diagnostics only; no document title, URI or input serialization.
                output << "{\"event\":" << static_cast<int>(event.kind) << ",\"hr\":" << event.result << ",\"microseconds\":" << elapsed << "}\n";
                if (event.kind == neutronstar::EventKind::environment_ready) {
                    output << "{\"runtime\":\"";
                    for (wchar_t ch : event.detail) if ((ch >= L'0' && ch <= L'9') || ch == L'.') output << static_cast<char>(ch);
                    output << "\"}\n";
                }
                output.flush();
            }
            if (event.kind == neutronstar::EventKind::request_blocked) ++request_blocks;
            if (event.kind == neutronstar::EventKind::navigation_blocked) ++navigation_blocks;
            if (event.kind == neutronstar::EventKind::popup_blocked) ++popup_blocks;
            if (event.kind == neutronstar::EventKind::action_rejected) ++action_rejects;
            if (event.kind == neutronstar::EventKind::window_command) ++window_commands;
            if (event.kind == neutronstar::EventKind::memory_target_changed) ++memory_changes;
            if (window_smoke && window_commands && event.kind == neutronstar::EventKind::window_state_changed) {
                if (event.detail == L"maximized") saw_maximized = true;
                if (event.detail == L"normal" && saw_maximized) saw_restored = true;
                if (event.detail == L"minimized") saw_minimized = true;
            }
            if (event.kind == neutronstar::EventKind::controller_ready && window_smoke) {
                const auto style = static_cast<DWORD>(GetWindowLongPtrW(host->native_handle(), GWL_STYLE));
                if ((style & WS_CAPTION) || !(style & WS_THICKFRAME)) failure = true;
            }
            if (event.kind == neutronstar::EventKind::controller_ready && memory_smoke) {
                host->set_memory_usage_target(neutronstar::MemoryUsageTarget::normal);
                host->set_memory_usage_target(neutronstar::MemoryUsageTarget::low);
            }
            if ((close_environment && event.kind == neutronstar::EventKind::environment_ready) ||
                (close_controller && event.kind == neutronstar::EventKind::controller_ready)) {
                pending_close = true;
                if (host) host->close(); // Deliberate callback reentrancy/lifetime verification.
            }
            if (event.kind == neutronstar::EventKind::failed || event.kind == neutronstar::EventKind::process_failed ||
                (event.kind == neutronstar::EventKind::navigation_complete && FAILED(event.result))) failure = true;
            if (smoke && event.kind == neutronstar::EventKind::document_title_changed) {
                if (event.detail == L"NeutronStar smoke: PASS") passed = true;
                if (event.detail == L"NeutronStar smoke: FAIL") failure = true;
            }
            if (failure || (smoke && passed && !window_smoke)) {
                pending_close = true;
                if (host && host->native_handle()) PostMessageW(host->native_handle(), WM_CLOSE, 0, 0);
            }
        };
        if (bridge || window_smoke) options.on_action = [&](neutronstar::Action) {
            ++action_count;
            // Keep the gate busy long enough to test a duplicate command. No process is launched.
            if (!SetTimer(host->native_handle(), 2, 500, acknowledge)) throw std::runtime_error("Unable to schedule synthetic acknowledgment.");
        };
        if (test_greet) options.on_test_greet = [&](const neutronstar::TestGreetRequest& request) {
            ++greet_count;
            if (greet_smoke) {
                pending_greeting = request;
                if (!SetTimer(host->native_handle(), 3, 100, greet_reply)) throw std::runtime_error("Unable to schedule test greeting.");
            } else host->post_test_greeting(request.id, neutronstar::detail::make_test_greeting(request.name));
        };
        host = neutronstar::HostWindow::create(std::move(options));
        acknowledgment_host = host.get();
        if (close_early || pending_close) host->close();
        else if (timeout_ms && !SetTimer(host->native_handle(), 1, timeout_ms, timeout)) throw std::runtime_error("Unable to set test timeout.");
        const int code = host->run();
        acknowledgment_host = nullptr;
        pending_greeting.reset();
        if (output) output << "{\"passed\":" << (passed ? "true" : "false") << ",\"requests_blocked\":" << request_blocks
            << ",\"navigation_blocked\":" << navigation_blocks << ",\"popups_blocked\":" << popup_blocks
            << ",\"actions\":" << action_count << ",\"actions_rejected\":" << action_rejects << ",\"test_greetings\":" << greet_count
            << ",\"window_commands\":" << window_commands << ",\"memory_changes\":" << memory_changes
            << ",\"maximized\":" << (saw_maximized ? "true" : "false") << ",\"restored\":" << (saw_restored ? "true" : "false")
            << ",\"minimized\":" << (saw_minimized ? "true" : "false") << "}\n";
        if (timed_out) return 3;
        if (failure || code) return 1;
        if (smoke && !passed) return 2;
        if (smoke && !bridge && !window_smoke && (request_blocks == 0 || navigation_blocks == 0)) return 2;
        if (window_smoke && (window_commands != 4 || !saw_maximized || !saw_restored || !saw_minimized || action_rejects < 3 || action_count != 1)) return 2;
        if (memory_smoke && memory_changes != 3) return 2;
        if (bridge && (action_count != 2 || action_rejects < 5)) return 2;
        if (greet_smoke && (greet_count < 7 || action_rejects < 5)) return 2;
        return 0;
    } catch (const std::exception& ex) {
        OutputDebugStringA(ex.what());
        return 1;
    } catch (...) {
        OutputDebugStringW(L"NeutronStar host initialization failed.");
        return 1;
    }
}
