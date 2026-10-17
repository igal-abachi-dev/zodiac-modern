#pragma once

#include <optional>
#include <string_view>

namespace neutronstar::detail {
enum class WindowCommand { minimize, toggle_maximize, close };

inline std::optional<WindowCommand> parse_window_command_json(std::wstring_view json) noexcept {
    if (json == L"\"neutronstar.window.minimize.v1\"") return WindowCommand::minimize;
    if (json == L"\"neutronstar.window.toggle-maximize.v1\"") return WindowCommand::toggle_maximize;
    if (json == L"\"neutronstar.window.close.v1\"") return WindowCommand::close;
    return std::nullopt;
}
} // namespace neutronstar::detail
