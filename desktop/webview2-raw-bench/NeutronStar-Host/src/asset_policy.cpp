#include "asset_policy.hpp"

#include <Windows.h>
#include <algorithm>
#include <cwctype>
#include <set>

namespace neutronstar::detail {
std::optional<std::wstring> embedded_asset_key(std::wstring_view relative) {
    if (relative.empty() || relative.size() > 8192 || relative.find_first_of(L"%?#:\\") != std::wstring_view::npos) return std::nullopt;
    for (const auto ch : relative) if (ch < 0x20 || ch > 0x7e) return std::nullopt;
    auto key = resource_path(std::wstring{origin} + std::wstring{relative});
    if (!key || !mime_type(*key)) return std::nullopt;
    for (auto& ch : *key) if (ch >= L'A' && ch <= L'Z') ch = static_cast<wchar_t>(ch + (L'a' - L'A'));
    return key;
}
bool valid_embedded_assets(const std::vector<EmbeddedAsset>& assets) {
    if (assets.empty() || assets.size() > 4096) return false;
    size_t total{};
    std::set<std::wstring> keys;
    for (const auto& asset : assets) {
        const auto key = embedded_asset_key(asset.relative_path);
        if (!key || asset.content.size() > 32 * 1024 * 1024 || asset.content.size() > 128 * 1024 * 1024 - total || !keys.insert(*key).second) return false;
        total += asset.content.size();
    }
    return true;
}
namespace {
int hex(wchar_t ch) noexcept {
    if (ch >= L'0' && ch <= L'9') return ch - L'0';
    if (ch >= L'a' && ch <= L'f') return ch - L'a' + 10;
    if (ch >= L'A' && ch <= L'F') return ch - L'A' + 10;
    return -1;
}

bool safe_segment(std::wstring_view part) {
    if (part.empty() || part == L"." || part == L".." || part.back() == L'.' || part.back() == L' ') return false;
    for (wchar_t ch : part) {
        if (ch < 32 || ch == 127 || std::wstring_view{L"\\:%<>\"|?*"}.find(ch) != std::wstring_view::npos) return false;
    }
    auto stem = std::wstring{part.substr(0, part.find(L'.'))};
    std::transform(stem.begin(), stem.end(), stem.begin(), [](wchar_t c) { return static_cast<wchar_t>(towupper(c)); });
    if (stem == L"CON" || stem == L"PRN" || stem == L"AUX" || stem == L"NUL" || stem == L"CONIN$" || stem == L"CONOUT$") return false;
    if (stem.size() == 4 && (stem.starts_with(L"COM") || stem.starts_with(L"LPT")) &&
        ((stem[3] >= L'0' && stem[3] <= L'9') || stem[3] == L'\u00b9' || stem[3] == L'\u00b2' || stem[3] == L'\u00b3')) return false;
    return true;
}
} // namespace

std::optional<std::wstring> resource_path(std::wstring_view uri) {
    if (uri.size() > 8192 || !uri.starts_with(origin)) return std::nullopt;
    auto path = uri.substr(origin.size());
    path = path.substr(0, path.find_first_of(L"?#"));
    if (path.empty()) path = L"index.html";
    std::string bytes;
    bytes.reserve(path.size());
    for (size_t i = 0; i < path.size(); ++i) {
        wchar_t ch = path[i];
        if (ch == L'%') {
            if (i + 2 >= path.size()) return std::nullopt;
            const int high = hex(path[i + 1]);
            const int low = hex(path[i + 2]);
            if (high < 0 || low < 0) return std::nullopt;
            ch = static_cast<wchar_t>(high * 16 + low);
            if (ch == L'/' || ch == L'\\') return std::nullopt;
            i += 2;
        } else if (ch > 127) {
            return std::nullopt; // Browser URLs must percent-encode UTF-8, never lossy UTF-16.
        }
        bytes.push_back(static_cast<char>(ch));
    }
    const int count = MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, bytes.data(), static_cast<int>(bytes.size()), nullptr, 0);
    if (count <= 0) return std::nullopt;
    std::wstring result(static_cast<size_t>(count), L'\0');
    if (!MultiByteToWideChar(CP_UTF8, MB_ERR_INVALID_CHARS, bytes.data(), static_cast<int>(bytes.size()), result.data(), count)) return std::nullopt;
    size_t begin = 0;
    while (begin < result.size()) {
        const auto end = result.find(L'/', begin);
        const auto length = end == std::wstring::npos ? result.size() - begin : end - begin;
        if (!safe_segment(std::wstring_view{result}.substr(begin, length))) return std::nullopt;
        if (end == std::wstring::npos) break;
        begin = end + 1;
        if (begin == result.size()) return std::nullopt;
    }
    return result;
}

std::optional<std::wstring_view> mime_type(std::wstring_view relative) {
    const auto dot = relative.rfind(L'.');
    if (dot == std::wstring_view::npos) return std::nullopt;
    const auto ext = relative.substr(dot);
    if (ext == L".html") return L"text/html; charset=utf-8";
    if (ext == L".js" || ext == L".mjs") return L"text/javascript; charset=utf-8";
    if (ext == L".css") return L"text/css; charset=utf-8";
    if (ext == L".json") return L"application/json";
    if (ext == L".txt") return L"text/plain; charset=utf-8";
    if (ext == L".svg") return L"image/svg+xml";
    if (ext == L".png") return L"image/png";
    if (ext == L".jpg" || ext == L".jpeg") return L"image/jpeg";
    if (ext == L".webp") return L"image/webp";
    if (ext == L".ico") return L"image/x-icon";
    if (ext == L".woff2") return L"font/woff2";
    if (ext == L".woff") return L"font/woff";
    return std::nullopt;
}

bool is_within(std::wstring_view parent, std::wstring_view child) noexcept {
    return !parent.empty() && child.size() > parent.size() && _wcsnicmp(parent.data(), child.data(), parent.size()) == 0 &&
        (parent.back() == L'\\' || child[parent.size()] == L'\\' || child[parent.size()] == L'/');
}

std::optional<Action> parse_action(std::wstring_view token) noexcept {
    if (token == L"neutronstar.action.encrypt.v1") return Action::encrypt;
    if (token == L"neutronstar.action.decrypt.v1") return Action::decrypt;
    return std::nullopt;
}

std::optional<Action> parse_action_json(std::wstring_view json) noexcept {
    // Fixed wire grammar, not a general JSON parser. Checking serialized JSON also rejects
    // embedded NULs that TryGetWebMessageAsString's NUL-terminated result would truncate.
    if (json.size() < 2 || json.size() > 66 || json.front() != L'"' || json.back() != L'"') return std::nullopt;
    return parse_action(json.substr(1, json.size() - 2));
}

const wchar_t* status_message(Status status) noexcept {
    switch (status) {
    case Status::idle: return L"neutronstar.status.idle.v1";
    case Status::busy: return L"neutronstar.status.busy.v1";
    case Status::succeeded: return L"neutronstar.status.succeeded.v1";
    case Status::failed: return L"neutronstar.status.failed.v1";
    case Status::canceled: return L"neutronstar.status.canceled.v1";
    }
    return nullptr;
}
} // namespace neutronstar::detail
