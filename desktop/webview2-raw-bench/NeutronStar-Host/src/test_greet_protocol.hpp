#pragma once
#include <neutronstar/host_window.hpp>
#include <optional>
#include <string_view>

namespace neutronstar::detail {
inline constexpr std::wstring_view test_greet_prefix = L"neutronstar.test.greet.v1:";
inline constexpr std::wstring_view test_greet_result_prefix = L"neutronstar.test.greet.result.v1:";
inline constexpr size_t test_greet_name_limit = 120;
inline constexpr size_t test_greet_reply_limit = 256;
inline constexpr size_t test_greet_json_limit = test_greet_prefix.size() + 32 + 1 + test_greet_name_limit * 4 + 2;
[[nodiscard]] std::optional<TestGreetRequest> parse_test_greet_json(std::wstring_view json);
[[nodiscard]] std::wstring test_greet_result(std::wstring_view id, std::wstring_view text);
[[nodiscard]] std::wstring make_test_greeting(std::wstring_view name);
}
