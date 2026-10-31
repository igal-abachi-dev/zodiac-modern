#pragma once
#include <Windows.h>
#include <string_view>

namespace neutronstar::detail {
enum class RuntimeProblem { none, missing_evergreen, invalid_fixed, probe_failed };
constexpr RuntimeProblem runtime_problem(HRESULT result, bool fixed) noexcept {
    if (SUCCEEDED(result)) return RuntimeProblem::none;
    if (fixed) return RuntimeProblem::invalid_fixed;
    if (result == HRESULT_FROM_WIN32(ERROR_FILE_NOT_FOUND) ||
        result == HRESULT_FROM_WIN32(ERROR_PATH_NOT_FOUND)) return RuntimeProblem::missing_evergreen;
    return RuntimeProblem::probe_failed;
}
constexpr std::wstring_view runtime_tag(RuntimeProblem problem) noexcept {
    switch(problem) {
    case RuntimeProblem::none: return L"runtime.available";
    case RuntimeProblem::missing_evergreen: return L"runtime.evergreen-missing";
    case RuntimeProblem::invalid_fixed: return L"runtime.fixed-invalid";
    case RuntimeProblem::probe_failed: return L"runtime.probe-failed";
    }
    return L"runtime.probe-failed";
}
constexpr std::wstring_view runtime_message(RuntimeProblem problem) noexcept {
    switch(problem) {
    case RuntimeProblem::missing_evergreen:
        return L"Microsoft Edge WebView2 Runtime was not found. Install the supported Runtime explicitly, or select a valid Fixed Version runtime. This host never downloads it.";
    case RuntimeProblem::invalid_fixed:
        return L"The selected Fixed Version WebView2 runtime could not be used. Check its directory, architecture and complete runtime files. No Evergreen fallback was attempted.";
    default:
        return L"WebView2 runtime detection failed. Check the native HRESULT diagnostic; this is not necessarily a missing installation.";
    }
}
} // namespace neutronstar::detail
