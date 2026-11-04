#include "ui.hpp"
#include <algorithm>
#include <filesystem>
#include <fstream>
#include <imgui_impl_win32.h>
#include <shellapi.h>
#include <string>
#include <vector>
extern IMGUI_IMPL_API LRESULT ImGui_ImplWin32_WndProcHandler(HWND, UINT, WPARAM, LPARAM);
namespace {
struct WindowState {
    unsigned width = 0, height = 0;
    float dpi = 1;
    int redraw = 2;
    bool quit = false;
};
LRESULT CALLBACK windowProc(HWND window, UINT message, WPARAM wparam, LPARAM lparam) {
    auto *state = reinterpret_cast<WindowState *>(GetWindowLongPtrW(window, GWLP_USERDATA));
    if (message == WM_NCCREATE) {
        state =
            static_cast<WindowState *>(reinterpret_cast<CREATESTRUCTW *>(lparam)->lpCreateParams);
        SetWindowLongPtrW(window, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(state));
    }
    if (state) {
        state->redraw = 2;
        switch (message) {
        case WM_SIZE:
            if (wparam != SIZE_MINIMIZED) {
                state->width = LOWORD(lparam);
                state->height = HIWORD(lparam);
            }
            return 0;
        case WM_DPICHANGED: {
            state->dpi = static_cast<float>(HIWORD(wparam)) / 96;
            const auto *r = reinterpret_cast<RECT *>(lparam);
            SetWindowPos(window, nullptr, r->left, r->top, r->right - r->left, r->bottom - r->top,
                         SWP_NOZORDER | SWP_NOACTIVATE);
            return 0;
        }
        case WM_GETMINMAXINFO: {
            RECT rect{0, 0, MulDiv(360, static_cast<int>(GetDpiForWindow(window)), 96),
                      MulDiv(480, static_cast<int>(GetDpiForWindow(window)), 96)};
            AdjustWindowRectExForDpi(&rect, WS_OVERLAPPEDWINDOW, FALSE, 0, GetDpiForWindow(window));
            auto *info = reinterpret_cast<MINMAXINFO *>(lparam);
            info->ptMinTrackSize = {rect.right - rect.left, rect.bottom - rect.top};
            return 0;
        }
        case WM_SYSCOMMAND:
            if ((wparam & 0xfff0) == SC_KEYMENU)
                return 0;
            break;
        case WM_CLOSE:
            state->quit = true;
            return 0;
        case WM_DESTROY:
            PostQuitMessage(0);
            return 0;
        }
    }
    if (ImGui::GetCurrentContext() &&
        ImGui_ImplWin32_WndProcHandler(window, message, wparam, lparam))
        return 1;
    return DefWindowProcW(window, message, wparam, lparam);
}
struct NativeWindow {
    HINSTANCE instance = GetModuleHandleW(nullptr);
    HWND hwnd = nullptr;
    explicit NativeWindow(WindowState &state) {
        WNDCLASSEXW type{};
        type.cbSize = sizeof(type);
        type.lpfnWndProc = windowProc;
        type.hInstance = instance;
        type.hCursor = LoadCursorW(nullptr, IDC_ARROW);
        type.lpszClassName = L"NeutronStarImGui";
        if (!RegisterClassExW(&type))
            throw std::runtime_error("Window class");
        const auto dpi = GetDpiForSystem();
        state.dpi = static_cast<float>(dpi) / 96;
        RECT rect{0, 0, MulDiv(960, static_cast<int>(dpi), 96),
                  MulDiv(640, static_cast<int>(dpi), 96)};
        AdjustWindowRectExForDpi(&rect, WS_OVERLAPPEDWINDOW, FALSE, 0, dpi);
        hwnd = CreateWindowExW(0, type.lpszClassName, L"NeutronStar GUI Bench", WS_OVERLAPPEDWINDOW,
                               40, 40, rect.right - rect.left, rect.bottom - rect.top, nullptr,
                               nullptr, instance, &state);
        if (!hwnd)
            throw std::runtime_error("Window creation");
        state.dpi = static_cast<float>(GetDpiForWindow(hwnd)) / 96;
    }
    ~NativeWindow() {
        if (hwnd)
            DestroyWindow(hwnd);
        UnregisterClassW(L"NeutronStarImGui", instance);
    }
};
struct Context {
    bool platform = false;
    Context() {
        IMGUI_CHECKVERSION();
        ImGui::CreateContext();
        auto &io = ImGui::GetIO();
        io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;
        io.IniFilename = nullptr;
        io.LogFilename = nullptr;
    }
    ~Context() {
        if (platform)
            ImGui_ImplWin32_Shutdown();
        ImGui::DestroyContext();
    }
};
struct Arguments {
    std::string renderer = "auto";
    bool software = false, inject = false;
    std::filesystem::path probe;
};
Arguments arguments() {
    int count = 0;
    auto **values = CommandLineToArgvW(GetCommandLineW(), &count);
    if (!values)
        throw std::runtime_error("Arguments");
    struct Free {
        void *p;
        ~Free() { LocalFree(p); }
    } free{values};
    Arguments result;
    for (int i = 1; i < count; ++i) {
        const std::wstring arg = values[i];
        if (arg == L"--renderer" && i + 1 < count) {
            const std::wstring value = values[++i];
            if (value == L"auto")
                result.renderer = "auto";
            else if (value == L"dx11")
                result.renderer = "dx11";
            else if (value == L"dx12")
                result.renderer = "dx12";
            else
                throw std::runtime_error("Renderer argument");
        } else if (arg == L"--allow-software")
            result.software = true;
#ifdef NEUTRONSTAR_PROBE
        else if (arg == L"--probe" && i + 1 < count)
            result.probe = std::filesystem::absolute(values[++i]);
        else if (arg == L"--inject-dx12-unavailable")
            result.inject = true;
#endif
        else
            throw std::runtime_error("Unknown argument");
    }
    return result;
}
int run(const Arguments &args) {
    std::vector<wchar_t> path(32768);
    const auto length = GetModuleFileNameW(nullptr, path.data(), static_cast<DWORD>(path.size()));
    if (!length || length >= path.size())
        throw std::runtime_error("Application path");
    const auto root = std::filesystem::path(path.data()).parent_path();
    WindowState state;
    NativeWindow window(state);
    Context context;
    Ui ui;
    ui.loadFonts(root);
    ui.scale(state.dpi);
    if (!ImGui_ImplWin32_Init(window.hwnd))
        throw std::runtime_error("Win32 backend");
    context.platform = true;
    auto graphics = createGraphics(window.hwnd, args.renderer, args.software, args.inject);
    ShowWindow(window.hwnd, SW_SHOW);
    UpdateWindow(window.hwnd);
    std::uint64_t frames = 0;
    while (!state.quit) {
        MSG message{};
        while (PeekMessageW(&message, nullptr, 0, 0, PM_REMOVE)) {
            if (message.message == WM_QUIT)
                state.quit = true;
            TranslateMessage(&message);
            DispatchMessageW(&message);
        }
        if (state.quit)
            break;
        const bool previouslyActive = ui.active();
        ui.state.advance(bench::Clock::now());
        if (previouslyActive && !ui.active())
            state.redraw = 2;
        if (state.width && state.height) {
            graphics->resize(state.width, state.height);
            state.width = state.height = 0;
        }
        if (ui.dpi != state.dpi)
            ui.scale(state.dpi);
        const bool active = ui.active();
        const bool minimized = IsIconic(window.hwnd) != FALSE;
        const bool visible = !minimized && graphics->visible();
        if (visible && (state.redraw > 0 || active)) {
            graphics->newFrame();
            ImGui_ImplWin32_NewFrame();
            ImGui::NewFrame();
            ui.draw(graphics->info);
            ImGui::Render();
            graphics->render();
            ++frames;
            if (!ui.ready) {
                ui.ready = true;
                state.redraw = 2;
            } else if (state.redraw > 0)
                --state.redraw;
            writeProbe(args.probe, ui, graphics->info, frames);
            if (ImGui::IsAnyItemActive() || ImGui::IsMouseDown(ImGuiMouseButton_Left))
                state.redraw = 2;
        }
        // On-demand idle rendering; active simulations/inputs request bounded wakes.
        DWORD timeout = state.redraw > 0 ? 0 : active ? 100 : INFINITE;
        if (active && ui.state.hz && state.redraw == 0) {
            const auto remaining =
                std::chrono::duration<double, std::milli>(ui.state.nextTick - bench::Clock::now())
                    .count();
            timeout = static_cast<DWORD>(std::max(0., std::ceil(remaining)));
        }
        if (!visible)
            timeout = minimized ? (active ? 100 : INFINITE) : 100;
        MsgWaitForMultipleObjectsEx(0, nullptr, timeout, QS_ALLINPUT, MWMO_INPUTAVAILABLE);
    }
    ui.state.stop();
    graphics.reset();
    return 0;
}
} // namespace
int WINAPI wWinMain(HINSTANCE, HINSTANCE, PWSTR, int) {
    Arguments args;
    try {
        args = arguments();
        return run(args);
    } catch (const DxError &error) {
#ifdef NEUTRONSTAR_PROBE
        if (!args.probe.empty()) {
            std::ofstream out(std::filesystem::path(args.probe.wstring() + L".error"));
            out << error.what() << " HRESULT=" << static_cast<unsigned long>(error.code);
        }
        return 2;
#else
        wchar_t message[256]{};
        swprintf_s(message,
                   L"Graphics initialization or rendering failed (0x%08lX). Try Run.ps1 -Renderer "
                   L"dx11 if DX12 is unavailable.",
                   static_cast<unsigned long>(error.code));
        MessageBoxW(nullptr, message, L"NeutronStar graphics error", MB_OK | MB_ICONERROR);
        return 2;
#endif
    } catch (const std::exception &error) {
#ifdef NEUTRONSTAR_PROBE
        if (!args.probe.empty()) {
            std::ofstream out(std::filesystem::path(args.probe.wstring() + L".error"));
            out << error.what();
        }
#else
        (void)error;
#endif
#ifndef NEUTRONSTAR_PROBE
        MessageBoxW(nullptr,
                    L"Cannot initialize the local NeutronStar UI. Check the application assets and "
                    L"launch arguments.",
                    L"NeutronStar startup error", MB_OK | MB_ICONERROR);
#endif
        return 1;
    }
}
