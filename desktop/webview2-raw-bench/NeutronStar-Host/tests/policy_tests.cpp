#include "asset_policy.hpp"
#include "test_greet_protocol.hpp"
#include "window_protocol.hpp"
#include <cstdlib>
#include <iostream>
#include <string>
#include <stdexcept>

int main() {
    using namespace neutronstar::detail;
    int failures{};
    auto check = [&](bool good, const char* name) { if (!good) { std::cerr << "FAIL " << name << '\n'; ++failures; } };
    check(parse_window_command_json(L"\"neutronstar.window.minimize.v1\"") == WindowCommand::minimize, "window minimize token");
    check(parse_window_command_json(L"\"neutronstar.window.toggle-maximize.v1\"") == WindowCommand::toggle_maximize, "window maximize token");
    check(parse_window_command_json(L"\"neutronstar.window.close.v1\"") == WindowCommand::close, "window close token");
    for (auto token : {L"neutronstar.window.close.v1", L"\"neutronstar.window.close.v2\"", L"\"neutronstar.window.close.v1 \"",
             L"{\"command\":\"close\"}", L"\"neutronstar.window.drag.v1\"", L"\"neutronstar.window.close.v1\" extra"}) {
        check(!parse_window_command_json(token), "strict window token grammar");
    }
    check(resource_path(L"https://neutronstar.invalid/") == L"index.html", "default document");
    check(resource_path(L"https://neutronstar.invalid/assets/index-A1.mjs?v=1#part") == L"assets/index-A1.mjs", "chunk/query/hash");
    check(resource_path(L"https://neutronstar.invalid/%D7%A9%D7%9C%D7%95%D7%9D.txt") == L"\u05e9\u05dc\u05d5\u05dd.txt", "UTF-8 asset name");
    for (auto suffix : {L"../secret.txt", L"%2e%2e/secret.txt", L"a/../../secret.txt", L"%252e%252e/secret.txt",
             L"%2Fsecret.txt", L"%5csecret.txt", L"file.txt:stream", L"a//b.js", L"a/", L"NUL.txt", L"COM1.css",
             L"LPT\u00b2.txt", L"file.", L"file%20", L"%00.txt", L"%c0%af.txt", L"%ed%a0%80.txt", L"%GG", L"%", L"a\\b.js"}) {
        check(!resource_path(std::wstring{origin} + suffix), "unsafe path rejected");
    }
    for (auto uri : {L"http://neutronstar.invalid/index.html", L"https://neutronstar.invalid.evil/index.html",
             L"https://neutronstar.invalid:443/index.html", L"file:///C:/a.html", L"data:text/html,hi", L"javascript:alert(1)",
             L"https://neutronstar.invalid@evil.invalid/a.js", L"https://evil.invalid/index.html"}) {
        check(!resource_path(uri), "foreign or noncanonical origin rejected");
    }
    check(!resource_path(std::wstring{origin} + std::wstring(8200, L'a')), "bounded URI");
    check(mime_type(L"assets/main.mjs") == L"text/javascript; charset=utf-8", "module MIME");
    check(!mime_type(L"private.pem") && !mime_type(L"app.exe") && !mime_type(L"bundle.js.map"), "unsupported asset types");
    check(is_within(L"C:\\assets", L"c:\\ASSETS\\a.js"), "case-insensitive confinement");
    check(!is_within(L"C:\\assets", L"C:\\assets-other\\a.js"), "prefix confusion");
    check(!is_within(L"C:\\assets", L"C:\\assets"), "directory not file");
    check(!is_within(L"", L"C:\\assets"), "empty root rejected");
    check(parse_action(L"neutronstar.action.encrypt.v1") == neutronstar::Action::encrypt, "encrypt token");
    check(parse_action(L"neutronstar.action.decrypt.v1") == neutronstar::Action::decrypt, "decrypt token");
    for (auto token : {L"encrypt", L"neutronstar.action.encrypt.v2", L"neutronstar.action.encrypt.v1 ", L"shell", L""}) {
        check(!parse_action(token), "unknown action rejected");
    }
    check(!status_message(static_cast<neutronstar::Status>(100)), "unknown status rejected");
    check(parse_action_json(L"\"neutronstar.action.encrypt.v1\"") == neutronstar::Action::encrypt, "serialized action");
    for (auto json : {L"{\"command\":\"encrypt\"}", L"null", L"[\"neutronstar.action.encrypt.v1\"]",
             L"\"neutronstar.action.encrypt.v1\\u0000tail\"", L"\"neutronstar.action.encrypt.v1\" extra"}) {
        check(!parse_action_json(json), "strict serialized action grammar");
    }
    // Exercise malformed percent/UTF-8 byte combinations without browser/KDF/network dependencies.
    const std::wstring id = L"0123456789abcdef0123456789abcdef";
    const auto json_request = [&](std::wstring_view hex_name) { return L"\"" + std::wstring{test_greet_prefix} + id + L":" + std::wstring{hex_name} + L"\""; };
    const auto empty = parse_test_greet_json(json_request(L""));
    check(empty && empty->id == id && empty->name.empty(), "empty native greeting name");
    const auto padded = parse_test_greet_json(json_request(L"002000410020"));
    check(padded && padded->name == L" A ", "name whitespace preserved");
    const auto unicode = parse_test_greet_json(json_request(L"05e9d83dde80"));
    check(unicode && unicode->name == L"\u05e9\U0001f680", "Unicode greeting name");
    const auto nul = parse_test_greet_json(json_request(L"004100000042"));
    check(nul && nul->name.size() == 3 && nul->name[1] == 0 && nul->name[2] == L'B', "embedded NUL does not truncate");
    check(make_test_greeting(L"") == L"Hello, ! You've been greeted from C++!", "no World fallback");
    check(make_test_greeting(L" A ") == L"Hello,  A ! You've been greeted from C++!", "no native trimming");
    check(parse_test_greet_json(json_request(std::wstring(480, L'0'))).has_value(), "name bound accepted");
    for (auto hex_name : {L"0", L"zzzz", L"00AF", L"d800", L"dc00", L"d8000041", L"d83dde80d800"}) {
        check(!parse_test_greet_json(json_request(hex_name)), "malformed UTF16 wire rejected");
    }
    check(!parse_test_greet_json(json_request(std::wstring(484, L'0'))), "oversized name rejected");
    check(!parse_test_greet_json(L"\"neutronstar.test.greet.v1:bad:0041\""), "malformed ID rejected");
    check(!parse_test_greet_json(json_request(L"0041") + L"extra"), "trailing data rejected");
    check(test_greet_result(id, std::wstring_view{L"A\0B", 3}).ends_with(L":004100000042"), "response NUL encoding");
    bool invalid_reply{};
    try { (void)test_greet_result(id, std::wstring(257, L'a')); } catch (const std::invalid_argument&) { invalid_reply = true; }
    check(invalid_reply, "oversized reply rejected");
    constexpr wchar_t digits[] = L"0123456789ABCDEF";
    for (unsigned int b = 0; b < 256; ++b) {
        std::wstring encoded = L"https://neutronstar.invalid/%";
        encoded += digits[b >> 4]; encoded += digits[b & 15]; encoded += L".txt";
        if (b < 32 || b >= 127 || b == '%' || b == '/' || b == '\\' || b == ':') check(!resource_path(encoded), "invalid encoded byte");
    }
    if (failures) return EXIT_FAILURE;
    std::cout << "asset policy checks passed\n";
    return EXIT_SUCCESS;
}
