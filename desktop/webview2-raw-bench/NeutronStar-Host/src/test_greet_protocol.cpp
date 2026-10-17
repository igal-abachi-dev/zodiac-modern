#include "test_greet_protocol.hpp"
#include <stdexcept>

namespace neutronstar::detail {
namespace {
int hex(wchar_t value) noexcept {
    if (value >= L'0' && value <= L'9') return value - L'0';
    if (value >= L'a' && value <= L'f') return value - L'a' + 10;
    return -1;
}
bool valid_id(std::wstring_view id) noexcept {
    if (id.size() != 32) return false;
    for (const auto unit : id) if (hex(unit) < 0) return false;
    return true;
}
bool valid_utf16(std::wstring_view text) noexcept {
    for (size_t i = 0; i < text.size(); ++i) {
        const auto unit = static_cast<unsigned int>(text[i]);
        if (unit >= 0xd800 && unit <= 0xdbff) {
            if (++i == text.size() || text[i] < 0xdc00 || text[i] > 0xdfff) return false;
        } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
    }
    return true;
}
}

std::optional<TestGreetRequest> parse_test_greet_json(std::wstring_view json) {
    // One bounded printable-ASCII string grammar, not a general JSON parser.
    // Hex encodes UTF-16 so quotes, NUL and surrogate pairs cannot truncate COM strings.
    if (json.size() < 2 || json.size() > test_greet_json_limit || json.front() != L'"' || json.back() != L'"') return std::nullopt;
    auto token = json.substr(1, json.size() - 2);
    if (!token.starts_with(test_greet_prefix)) return std::nullopt;
    token.remove_prefix(test_greet_prefix.size());
    if (token.size() < 33 || !valid_id(token.substr(0, 32)) || token[32] != L':') return std::nullopt;
    TestGreetRequest request{std::wstring{token.substr(0, 32)}, {}};
    token.remove_prefix(33);
    if (token.size() % 4 != 0 || token.size() / 4 > test_greet_name_limit) return std::nullopt;
    request.name.reserve(token.size() / 4);
    for (size_t i = 0; i < token.size(); i += 4) {
        unsigned int unit{};
        for (size_t j = 0; j < 4; ++j) {
            const int digit = hex(token[i + j]);
            if (digit < 0) return std::nullopt;
            unit = unit * 16 + static_cast<unsigned int>(digit);
        }
        request.name.push_back(static_cast<wchar_t>(unit));
    }
    if (!valid_utf16(request.name)) return std::nullopt;
    return request;
}

std::wstring test_greet_result(std::wstring_view id, std::wstring_view text) {
    if (!valid_id(id) || text.size() > test_greet_reply_limit || !valid_utf16(text)) throw std::invalid_argument("Invalid test greeting response.");
    std::wstring result{test_greet_result_prefix};
    result += id;
    result += L':';
    constexpr wchar_t digits[] = L"0123456789abcdef";
    for (const auto unit : text) {
        const auto value = static_cast<unsigned int>(unit);
        for (int shift = 12; shift >= 0; shift -= 4) result += digits[(value >> shift) & 15];
    }
    return result;
}

std::wstring make_test_greeting(std::wstring_view name) {
    // Match the starter's formatting semantics: no trim and no empty-name fallback.
    return L"Hello, " + std::wstring{name} + L"! You've been greeted from C++!";
}
}
