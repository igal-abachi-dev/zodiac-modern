#include "ui.hpp"
#include <algorithm>
#include <cmath>
#include <cstring>
#include <fstream>
#include <iomanip>
#include <sstream>
Ui::Ui() {
    constexpr char fixture[] = "Zodiac GUI benchmark — שלום — 🌠";
    std::copy(std::begin(fixture), std::end(fixture), message.begin());
}
void Ui::loadFonts(const std::filesystem::path &root) {
    auto &io = ImGui::GetIO();
    auto load = [](const std::filesystem::path &path, ImFontConfig *config) {
        std::ifstream file(path, std::ios::binary | std::ios::ate);
        if (!file)
            throw std::runtime_error("Local font unavailable");
        const auto size = file.tellg();
        if (size <= 0 || size > 64 * 1024 * 1024)
            throw std::runtime_error("Local font size");
        std::unique_ptr<void, decltype(&ImGui::MemFree)> bytes(
            ImGui::MemAlloc(static_cast<size_t>(size)), ImGui::MemFree);
        if (!bytes)
            throw std::bad_alloc();
        file.seekg(0);
        if (!file.read(static_cast<char *>(bytes.get()), static_cast<std::streamsize>(size)))
            throw std::runtime_error("Local font read");
        auto *font = ImGui::GetIO().Fonts->AddFontFromMemoryTTF(bytes.get(), static_cast<int>(size),
                                                                14, config);
        if (!font)
            throw std::runtime_error("Local font format");
        bytes.release();
        return font;
    };
    wchar_t directory[MAX_PATH]{};
    std::filesystem::path emoji;
    if (GetWindowsDirectoryW(directory, MAX_PATH))
        emoji = std::filesystem::path(directory) / "Fonts/seguiemj.ttf";
    auto add = [&](const char *file) {
        auto *font = load(root / "assets/Fonts" / file, nullptr);
        ImFontConfig merge{};
        merge.MergeMode = true;
        load(root / "assets/Fonts/noto-sans-hebrew-hebrew-400-normal.ttf", &merge);
        if (!emoji.empty() && std::filesystem::exists(emoji))
            load(emoji, &merge);
        return font;
    };
    regular = add("inter-latin-400-normal.ttf");
    bold = add("inter-latin-600-normal.ttf");
    io.FontDefault = regular;
}
void Ui::scale(float value) {
    dpi = value;
    ImGui::StyleColorsLight();
    auto &s = ImGui::GetStyle();
    s.WindowPadding = {24, 24};
    s.FramePadding = {12, 10};
    s.ItemSpacing = {8, 12};
    s.ChildRounding = 12;
    s.FrameRounding = 6;
    s.PopupRounding = 12;
    s.ChildBorderSize = 1;
    s.FrameBorderSize = 1;
    s.WindowBorderSize = 0;
    s.FontSizeBase = 14;
    s.Colors[ImGuiCol_WindowBg] = {.98f, .98f, .98f, 1};
    s.Colors[ImGuiCol_ChildBg] = {1, 1, 1, 1};
    s.Colors[ImGuiCol_Text] = {.095f, .095f, .11f, 1};
    s.Colors[ImGuiCol_Button] = {.015f, .47f, .34f, 1};
    s.Colors[ImGuiCol_ButtonHovered] = {.025f, .37f, .27f, 1};
    s.Colors[ImGuiCol_ButtonActive] = {.025f, .3f, .22f, 1};
    s.Colors[ImGuiCol_PlotHistogram] = {.02f, .59f, .4f, 1};
    s.ScaleAllSizes(dpi);
    s.FontScaleDpi = dpi;
}
void Ui::mark(const char *name, bool enabled) {
#ifdef NEUTRONSTAR_PROBE
    widgets.push_back({name, ImGui::GetItemRectMin(), ImGui::GetItemRectMax(), enabled,
                       ImGui::IsItemVisible(), ImGui::IsItemFocused()});
#else
    (void)name;
    (void)enabled;
#endif
}
bool Ui::button(const char *label, bool enabled, float width) {
    ImGui::BeginDisabled(!enabled);
    ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(1, 1, 1, 1));
    const bool clicked = ImGui::Button(label, {width, 38 * dpi});
    ImGui::PopStyleColor();
    mark(label, enabled);
    ImGui::EndDisabled();
    return clicked;
}
void Ui::title(const char *text, float size) {
    ImGui::PushFont(bold, size);
    ImGui::TextWrapped("%s", text);
    ImGui::PopFont();
}
void Ui::icon(bool orbit, bool locked) {
    const auto p = ImGui::GetCursorScreenPos();
    ImGui::Dummy({24 * dpi, 24 * dpi});
    auto *draw = ImGui::GetWindowDrawList();
    const auto color = IM_COL32(4, 120, 87, 255);
    auto at = [&](float x, float y) { return ImVec2(p.x + x * dpi, p.y + y * dpi); };
    const float stroke = 2 * dpi;
    if (orbit) {
        draw->PathArcTo(at(12, 12), 10 * dpi, -.584f, 1.745f);
        draw->PathStroke(color, stroke);
        draw->PathArcTo(at(12, 12), 10 * dpi, 2.557f, 4.887f);
        draw->PathStroke(color, stroke);
        draw->AddCircle(at(12, 12), 3 * dpi, color, 0, stroke);
        draw->AddCircle(at(19, 5), 2 * dpi, color, 0, stroke);
        draw->AddCircle(at(5, 19), 2 * dpi, color, 0, stroke);
    } else {
        draw->AddRect(at(3, 11), at(21, 22), color, 2 * dpi, stroke);
        draw->PathArcTo(at(12, 7), 5 * dpi, 3.14159265f, 6.2831853f);
        draw->PathStroke(color, stroke);
        draw->AddLine(at(7, 7), at(7, 11), color, stroke);
        if (locked)
            draw->AddLine(at(17, 7), at(17, 11), color, stroke);
        draw->AddCircleFilled(at(12, 16), dpi * 1.4f, color);
    }
}
void Ui::mainPage(const GraphicsInfo &graphics) {
    icon(true);
    ImGui::SameLine();
    title("NeutronStar GUI Bench", 28);
    ImGui::TextWrapped("A UI-only simulation for comparing desktop frontends.");
    ImGui::TextColored({.015f, .47f, .34f, 1}, "SIMULATION · NO FILES OR CRYPTOGRAPHY.");
    ImGui::Spacing();
    const bool running = state.operation.phase == bench::Phase::running;
    const bool narrow = ImGui::GetContentRegionAvail().x < 592 * dpi;
    const float width = narrow ? ImGui::GetContentRegionAvail().x
                               : (ImGui::GetContentRegionAvail().x - 16 * dpi) / 2;
    for (int i = 0; i < 2; ++i) {
        if (i && !narrow)
            ImGui::SameLine(0, 16 * dpi);
        ImGui::BeginChild(i ? "encrypt-card" : "decrypt-card", {width, 232 * dpi},
                          ImGuiChildFlags_Borders);
        icon(false, i != 0);
        ImGui::SameLine();
        title(i ? "Encrypt" : "Decrypt");
        ImGui::TextUnformatted(i ? "Message" : "Synthetic input");
        if (i) {
            ImGui::SetNextItemWidth(-1);
            ImGui::InputTextMultiline("##message", message.data(), message.size(), {-1, 72 * dpi});
            mark("Message");
        } else {
            ImGui::TextWrapped("Synthetic sample: starlight.nsx");
            ImGui::TextWrapped("No disk file is opened.");
        }
        ImGui::SetCursorPosY(ImGui::GetWindowHeight() - ImGui::GetStyle().WindowPadding.y -
                             38 * dpi);
        if (button(i ? "Simulate encryption" : "Simulate decryption", ready && !running, -1))
            state.start(bench::Clock::now());
        ImGui::EndChild();
    }
    const char *status = !ready                                         ? "Loading…"
                         : state.operation.phase == bench::Phase::ready ? "Ready"
                         : running                                      ? "Simulation running…"
                         : state.operation.phase == bench::Phase::success
                             ? "Simulation complete. No file was changed."
                             : "Simulation canceled.";
    ImGui::TextWrapped("%s", status);
    ImGui::ProgressBar(static_cast<float>(state.operation.progress) / 100, {-1, 8 * dpi}, "");
    if (running) {
        if (button("Cancel"))
            state.operation.cancel();
        ImGui::SameLine();
    }
    if (button("Reset"))
        state.operation.reset();
    ImGui::SameLine();
    if (restoreWorkbench) {
        ImGui::SetKeyboardFocusHere();
        restoreWorkbench = false;
    }
    if (button("Open workbench", !running && ready)) {
        state.open();
        query.fill(0);
    }
    ImGui::SameLine();
    if (restoreAbout) {
        ImGui::SetKeyboardFocusHere();
        restoreAbout = false;
    }
    if (button("About this test")) {
        ImGui::OpenPopup("About this test");
        about = true;
    }
    ImGui::TextWrapped("%s · %s%s%s", graphics.renderer.c_str(), graphics.adapter.c_str(),
                       graphics.fallback ? " · fallback" : "",
                       graphics.software ? " · SOFTWARE" : "");
    ImGui::SetNextWindowSize({440 * dpi, 0}, ImGuiCond_Appearing);
    if (ImGui::BeginPopupModal("About this test", nullptr,
                               ImGuiWindowFlags_AlwaysAutoResize |
                                   ImGuiWindowFlags_NoSavedSettings)) {
        ImGui::TextWrapped("Actions are UI-only simulations. No files, cryptography, Go CLI, "
                           "network or native bridge are involved.");
        if (ImGui::IsWindowAppearing())
            ImGui::SetKeyboardFocusHere();
        const bool close = button("Close");
        if (close || ImGui::IsKeyPressed(ImGuiKey_Escape)) {
            ImGui::CloseCurrentPopup();
            about = false;
            restoreAbout = true;
        }
        ImGui::EndPopup();
    }
}
void Ui::workPage() {
    title("List and filter workbench", 24);
    ImGui::TextWrapped(
        "Deterministic synthetic rows. No files, network, cryptography or native commands.");
    ImGui::TextUnformatted("Workbench ready");
    const float right = ImGui::GetCursorScreenPos().x + ImGui::GetContentRegionAvail().x;
    bool first = true;
    auto action = [&](const char *label, auto fn) {
        const float width = ImGui::CalcTextSize(label).x + ImGui::GetStyle().FramePadding.x * 2;
        if (!first && ImGui::GetItemRectMax().x + width + ImGui::GetStyle().ItemSpacing.x <= right)
            ImGui::SameLine();
        if (button(label))
            fn();
        first = false;
    };
    action("Back to main screen", [&] {
        state.back();
        restoreWorkbench = true;
    });
    action("1,000 rows", [&] {
        state.stop();
        state.workload.replace(1000);
    });
    action("10,000 rows", [&] {
        state.stop();
        state.workload.replace(10000);
    });
    action("Reverse", [&] { state.workload.reverse(); });
    action("Splice 10", [&] { state.workload.splice(); });
    action("Update 10%", [&] { state.workload.update(); });
    for (int hz : {10, 30, 60}) {
        const auto label = std::to_string(hz) + " Hz / 2 s";
        action(label.c_str(), [&] { state.burst(hz, bench::Clock::now()); });
    }
    action("Stop", [&] { state.stop(); });
    action("Remount workload", [&] {
        state.remount();
        query.fill(0);
    });
    ImGui::TextUnformatted("Filter synthetic rows");
    ImGui::SetNextItemWidth(-1);
    ImGui::InputText("##filter", query.data(), query.size());
    mark("Filter synthetic rows");
    visibleRows = 0;
    firstId = 0;
    firstValue = 0;
    for (const auto &row : state.workload.rows)
        if (row.label().find(query.data()) != std::string::npos) {
            if (!visibleRows) {
                firstId = row.id;
                firstValue = row.value;
            }
            ++visibleRows;
        }
    ImGui::Text("%zu rows; tick %d", visibleRows, state.workload.tick);
    ImGui::BeginChild("Synthetic rows", {0, 0}, ImGuiChildFlags_Borders);
    // Intentionally submit every matching row. No ImGuiListClipper/virtualized lane.
    for (const auto &row : state.workload.rows) {
        if (row.label().find(query.data()) == std::string::npos)
            continue;
        ImGui::PushID(reinterpret_cast<const void *>(static_cast<uintptr_t>(row.id + 1)));
        ImGui::Text("%s: %d", row.label().c_str(), row.value);
        ImGui::Dummy({0, 2 * dpi});
        ImGui::PopID();
    }
    ImGui::EndChild();
}
void Ui::draw(const GraphicsInfo &graphics) {
    widgets.clear();
    auto &io = ImGui::GetIO();
    ImGui::SetNextWindowPos({0, 0});
    ImGui::SetNextWindowSize(io.DisplaySize);
    ImGui::Begin("NeutronStar surface", nullptr,
                 ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_NoMove |
                     ImGuiWindowFlags_NoSavedSettings | ImGuiWindowFlags_NoBringToFrontOnFocus);
    if (state.workbench)
        workPage();
    else
        mainPage(graphics);
    ImGui::End();
}

#ifdef NEUTRONSTAR_PROBE
namespace {
std::string json(const std::string &text) {
    std::ostringstream out;
    out << '"';
    for (unsigned char ch : text) {
        if (ch == '"' || ch == '\\')
            out << '\\' << ch;
        else if (ch < 32)
            out << "\\u00" << std::hex << std::setw(2) << std::setfill('0')
                << static_cast<unsigned>(ch);
        else
            out << ch;
    }
    out << '"';
    return out.str();
}
} // namespace
#endif
void writeProbe(const std::filesystem::path &path, const Ui &ui, const GraphicsInfo &graphics,
                std::uint64_t frames) {
#ifdef NEUTRONSTAR_PROBE
    if (path.empty())
        return;
    std::ostringstream out;
    out << std::boolalpha << "{\"schema\":1,\"testOnly\":true,\"frames\":" << frames
        << ",\"ready\":" << ui.ready
        << ",\"page\":" << json(ui.state.workbench ? "workbench" : "main")
        << ",\"about\":" << ui.about << ",\"phase\":" << static_cast<int>(ui.state.operation.phase)
        << ",\"progress\":" << ui.state.operation.progress << ",\"count\":" << ui.visibleRows
        << ",\"tick\":" << ui.state.workload.tick << ",\"firstId\":" << ui.firstId
        << ",\"firstValue\":" << ui.firstValue << ",\"hz\":" << ui.state.hz
        << ",\"renderer\":" << json(graphics.renderer) << ",\"adapter\":" << json(graphics.adapter)
        << ",\"software\":" << graphics.software << ",\"fallback\":" << graphics.fallback
        << ",\"fallbackCode\":" << static_cast<unsigned long>(graphics.fallbackCode)
        << ",\"widgets\":[";
    bool first = true;
    for (const auto &item : ui.widgets) {
        if (!first)
            out << ',';
        first = false;
        out << "{\"name\":" << json(item.name) << ",\"x\":" << item.low.x << ",\"y\":" << item.low.y
            << ",\"w\":" << item.high.x - item.low.x << ",\"h\":" << item.high.y - item.low.y
            << ",\"enabled\":" << item.enabled << ",\"visible\":" << item.visible
            << ",\"focused\":" << item.focused << '}';
    }
    out << "],\"endFrame\":" << frames << '}';
    const auto payload = out.str();
    if (payload.size() > 65536)
        throw std::runtime_error("Probe size bound");
    struct File {
        HANDLE handle = INVALID_HANDLE_VALUE;
        ~File() {
            if (handle != INVALID_HANDLE_VALUE)
                CloseHandle(handle);
        }
    } file;
    file.handle = CreateFileW(path.c_str(), GENERIC_WRITE,
                              FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, nullptr,
                              CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (file.handle == INVALID_HANDLE_VALUE)
        throw DxError(HRESULT_FROM_WIN32(GetLastError()), "Probe open");
    DWORD written = 0;
    if (!WriteFile(file.handle, payload.data(), static_cast<DWORD>(payload.size()), &written,
                   nullptr))
        throw DxError(HRESULT_FROM_WIN32(GetLastError()), "Probe write");
    if (written != payload.size())
        throw std::runtime_error("Probe short write");
#else
    (void)path;
    (void)ui;
    (void)graphics;
    (void)frames;
#endif
}
