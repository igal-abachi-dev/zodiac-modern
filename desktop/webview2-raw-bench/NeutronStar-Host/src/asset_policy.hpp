#pragma once

#include <optional>
#include <string>
#include <string_view>
#include <neutronstar/host_window.hpp>

namespace neutronstar::detail {
inline constexpr std::wstring_view origin = L"https://neutronstar.invalid/";
inline constexpr std::string_view content_security_policy =
    "default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none'; "
    "img-src 'self'; font-src 'self'; connect-src 'self'; worker-src 'none'; "
    "frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

// Strict canonical origin + percent-decoded UTF-8 path. No filesystem I/O.
[[nodiscard]] std::optional<std::wstring> resource_path(std::wstring_view uri);
[[nodiscard]] std::optional<std::wstring> embedded_asset_key(std::wstring_view relative);
[[nodiscard]] bool valid_embedded_assets(const std::vector<EmbeddedAsset>& assets);
[[nodiscard]] std::optional<std::wstring_view> mime_type(std::wstring_view relative);
[[nodiscard]] bool is_within(std::wstring_view parent, std::wstring_view child) noexcept;
[[nodiscard]] std::optional<Action> parse_action(std::wstring_view token) noexcept;
[[nodiscard]] std::optional<Action> parse_action_json(std::wstring_view json) noexcept;
[[nodiscard]] const wchar_t* status_message(Status status) noexcept;
} // namespace neutronstar::detail
