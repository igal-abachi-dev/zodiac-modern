#pragma once

#include <Windows.h>
#include <filesystem>
#include <functional>
#include <memory>
#include <string>
#include <string_view>

namespace neutronstar {

enum class EventKind {
    environment_ready, controller_ready, navigation_complete, document_title_changed,
    request_blocked, navigation_blocked, popup_blocked, permission_denied,
    download_blocked, process_failed, failed, closed, action_rejected,
    memory_target_changed, window_command, window_state_changed
};

enum class Action { encrypt, decrypt };
enum class Status { idle, busy, succeeded, failed, canceled };
enum class MemoryUsageTarget { normal, low };

// Explicitly opt-in synthetic example RPC; not a production secret/data channel.
struct TestGreetRequest { std::wstring id; std::wstring name; };

struct Event {
    EventKind kind{};
    HRESULT result{S_OK};
    std::wstring detail; // Runtime version, title or fixed diagnostic; never input contents/URLs.
};

struct HostOptions {
    std::filesystem::path asset_directory;
    std::filesystem::path user_data_directory; // Required; outside the asset tree. Runtime may write here.
    std::filesystem::path fixed_runtime_directory; // Empty selects installed Evergreen. No installer/download.
    std::wstring entry_path{L"index.html"}; // Relative asset path; use hash routing for client-side routers.
    std::wstring title{L"NeutronStar Host"};
    int client_width_dip{960};
    int client_height_dip{640};
    int minimum_width_dip{720};
    int minimum_height_dip{480};
    bool visible{true};
    bool decorations{true}; // False removes native caption; native resize edges remain.
    bool allow_window_controls{false}; // Only minimize, toggle-maximize and close tokens.
    MemoryUsageTarget memory_usage_target{MemoryUsageTarget::normal};
    std::function<void(const Event&)> on_event;
    // Callbacks empty and allow_window_controls false by default: JS messaging disabled.
    // Never block the STA on process I/O.
    // Enabling this admits exactly the two versioned action tokens, never shell/path/secret payloads.
    std::function<void(Action)> on_action;
    // Separate capability: bounded greeting requests only. Disabled when empty.
    std::function<void(const TestGreetRequest&)> on_test_greet;
};

// UI-thread-affine, noncopyable owner. Create/use/destroy on the same STA thread.
// Owns COM initialization, HWND, async initialization state and event subscriptions.
// No public COM objects, script execution, host objects or subprocess API.
class HostWindow final {
public:
    static std::unique_ptr<HostWindow> create(HostOptions options);
    ~HostWindow();
    HostWindow(const HostWindow&) = delete;
    HostWindow& operator=(const HostWindow&) = delete;
    HostWindow(HostWindow&&) = delete;
    HostWindow& operator=(HostWindow&&) = delete;

    [[nodiscard]] HWND native_handle() const noexcept;
    void close();
    // UI thread only. Best effort, not suspension; LOW is intended for inactive views.
    // Throws if the runtime lacks the requested API. No working-set trimming.
    void set_memory_usage_target(MemoryUsageTarget target);
    // UI thread only. Fixed nonsecret status token; terminal states release the one-action gate.
    void post_status(Status status);
    // UI thread only; replies to the matching active test request, max 256 UTF-16 units.
    void post_test_greeting(std::wstring_view request_id, std::wstring_view greeting);
    // Convenience single-window message pump. Embedders may pump their own STA messages instead.
    int run();

private:
    struct State;
    explicit HostWindow(std::shared_ptr<State> state);
    std::shared_ptr<State> state_;
};

} // namespace neutronstar
