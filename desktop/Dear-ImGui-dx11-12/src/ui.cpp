#include "ui.hpp"
#include "lucide_icons.hpp"
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
        load(root / "assets/Fonts/lucide-bench.ttf", &merge);
        load(root / "assets/Fonts/noto-sans-hebrew-hebrew-400-normal.ttf", &merge);
        if (!emoji.empty() && std::filesystem::exists(emoji))
            load(emoji, &merge);
        return font;
    };
    regular = add("inter-latin-400-normal.ttf");
    bold = add("inter-latin-600-normal.ttf");
    symbols = load(root / "assets/Fonts/lucide-bench.ttf", nullptr);
    io.FontDefault = regular;
}
void Ui::scale(float value) {
    dpi = value;
    ImGui::StyleColorsLight();
    auto &s = ImGui::GetStyle();
    s.WindowPadding = {28, 28};
    s.FramePadding = {13, 0};
    s.ItemSpacing = {8, 20};
    s.ChildRounding = 8;
    s.FrameRounding = 8;
    s.PopupRounding = 8;
    s.ChildBorderSize = 1;
    s.FrameBorderSize = 1;
    s.WindowBorderSize = 0;
    s.FontSizeBase = 14;
    s.Colors[ImGuiCol_WindowBg] = {248.f / 255, 250.f / 255, 249.f / 255, 1};
    s.Colors[ImGuiCol_ChildBg] = {1, 1, 1, 1};
    s.Colors[ImGuiCol_PopupBg] = {1, 1, 1, 1};
    s.Colors[ImGuiCol_Text] = {23.f / 255, 26.f / 255, 24.f / 255, 1};
    s.Colors[ImGuiCol_TextDisabled] = {93.f / 255, 102.f / 255, 96.f / 255, 1};
    s.Colors[ImGuiCol_Border] = {220.f / 255, 227.f / 255, 222.f / 255, 1};
    s.Colors[ImGuiCol_Button] = {1, 1, 1, 1};
    s.Colors[ImGuiCol_ButtonHovered] = {.97f, .97f, .97f, 1};
    s.Colors[ImGuiCol_ButtonActive] = {.94f, .95f, .94f, 1};
    s.Colors[ImGuiCol_FrameBg] = {241.f / 255, 244.f / 255, 242.f / 255, 1};
    s.Colors[ImGuiCol_PlotHistogram] = {4.f / 255, 120.f / 255, 87.f / 255, 1};
    s.Colors[ImGuiCol_NavCursor] = s.Colors[ImGuiCol_PlotHistogram];
    s.Colors[ImGuiCol_ModalWindowDimBg] = {7.f / 255, 19.f / 255, 13.f / 255, .4f};
    s.DisabledAlpha = .55f;
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
bool Ui::button(const char *label, bool enabled, float width, bool primary, float fontSize) {
    ImGui::BeginDisabled(!enabled);
    ImGui::PushFont(regular, fontSize);
    if (primary) {
        ImGui::PushStyleColor(ImGuiCol_Button, ImVec4(4.f / 255, 120.f / 255, 87.f / 255, 1));
        ImGui::PushStyleColor(ImGuiCol_ButtonHovered, ImVec4(.015f, .45f, .33f, 1));
        ImGui::PushStyleColor(ImGuiCol_ButtonActive, ImVec4(.015f, .40f, .30f, 1));
        ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(1, 1, 1, 1));
    }
    const char *glyph =
        std::strcmp(label, "About this test") == 0       ? lucide::info
        : std::strcmp(label, "Simulate encryption") == 0 ? lucide::arrow_up_from_line
        : std::strcmp(label, "Simulate decryption") == 0 ? lucide::arrow_down_to_line
                                                         : nullptr;
    const std::string display = glyph ? std::string(glyph) + "  " + label + "###" + label : label;
    const bool clicked = ImGui::Button(display.c_str(), {width, 40 * dpi});
    mark(label, enabled);
    if (primary)
        ImGui::PopStyleColor(4);
    ImGui::PopFont();
    ImGui::EndDisabled();
    return clicked;
}
void Ui::title(const char *text, float size) {
    ImGui::PushFont(bold, size);
    ImGui::TextWrapped("%s", text);
    ImGui::PopFont();
}
void Ui::icon(const char *glyph, float size) {
    ImGui::PushFont(symbols, size);
    ImGui::TextUnformatted(glyph);
    ImGui::PopFont();
}
void Ui::mainPage(const GraphicsInfo &graphics) {
    const auto origin = ImGui::GetCursorPos();
    const auto available = ImGui::GetContentRegionAvail().x;
    const bool narrow = ImGui::GetIO().DisplaySize.x < 760 * dpi;
    const bool running = state.operation.phase == bench::Phase::running;
    const ImVec4 muted(93.f / 255, 102.f / 255, 96.f / 255, 1);
    auto y = [&](float value) { ImGui::SetCursorPos({origin.x, origin.y + value * dpi}); };
    auto text = [&](const char *value, float size, bool subdued = false) {
        ImGui::PushFont(regular, size);
        if (subdued)
            ImGui::PushStyleColor(ImGuiCol_Text, muted);
        ImGui::TextWrapped("%s", value);
        if (subdued)
            ImGui::PopStyleColor();
        ImGui::PopFont();
    };
    // Use stock ImGui children/buttons/progress widgets; no painted substitute controls.
    ImGui::PushStyleColor(ImGuiCol_ChildBg, ImVec4(241.f / 255, 244.f / 255, 242.f / 255, 1));
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(10 * dpi, 10 * dpi));
    ImGui::BeginChild("brand", {40 * dpi, 40 * dpi}, ImGuiChildFlags_Borders,
                      ImGuiWindowFlags_NoScrollbar);
    icon(lucide::orbit, 20);
    ImGui::EndChild();
    ImGui::PopStyleVar();
    ImGui::PopStyleColor();
    ImGui::SetCursorPos({origin.x + 52 * dpi, origin.y + 5 * dpi});
    title("NeutronStar GUI Bench", 24);
    y(48);
    text("A UI-only simulation for comparing desktop frontends.", 14, true);
    ImGui::SetCursorPos(
        {narrow ? origin.x : origin.x + available - 126 * dpi, origin.y + (narrow ? 84 : 0) * dpi});
    if (restoreAbout) {
        ImGui::SetKeyboardFocusHere();
        restoreAbout = false;
    }
    if (button("About this test", true, 126 * dpi)) {
        ImGui::OpenPopup("About this test");
        about = true;
    }
    const float badgeY = narrow ? 148.f : 94.4f;
    y(badgeY);
    ImGui::PushStyleColor(ImGuiCol_ChildBg, ImVec4(241.f / 255, 244.f / 255, 242.f / 255, 1));
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(9 * dpi, 7 * dpi));
    ImGui::BeginChild("disclosure", {300 * dpi, 31 * dpi}, ImGuiChildFlags_Borders,
                      ImGuiWindowFlags_NoScrollbar);
    icon(lucide::shield_check, 14);
    ImGui::SameLine(0, 7 * dpi);
    text("SIMULATION \xc2\xb7 NO FILES OR CRYPTOGRAPHY.", 10);
    ImGui::EndChild();
    ImGui::PopStyleVar();
    ImGui::PopStyleColor();
    const float cardsY = badgeY + 51;
    const float width = narrow ? available : (available - 20 * dpi) / 2;
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(16 * dpi, 16 * dpi));
    for (int i = 0; i < 2; ++i) {
        ImGui::SetCursorPos({origin.x + (i && !narrow ? width + 20 * dpi : 0),
                             origin.y + (cardsY + (i && narrow ? 272.f : 0)) * dpi});
        ImGui::BeginChild(i ? "encrypt-card" : "decrypt-card", {width, 252 * dpi},
                          ImGuiChildFlags_Borders, ImGuiWindowFlags_NoScrollbar);
        icon(i ? lucide::lock_keyhole : lucide::unlock_keyhole);
        ImGui::SameLine(0, 8 * dpi);
        title(i ? "Encrypt" : "Decrypt", 16);
        ImGui::SetCursorPos({16 * dpi, 60 * dpi});
        text("SYNTHETIC INPUT", 10, true);
        ImGui::SetCursorPos({16 * dpi, 84 * dpi});
        ImGui::PushStyleColor(ImGuiCol_ChildBg, ImVec4(241.f / 255, 244.f / 255, 242.f / 255, 1));
        ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(13 * dpi, 13 * dpi));
        ImGui::PushStyleVar(ImGuiStyleVar_ChildRounding, 6 * dpi);
        ImGui::BeginChild("fixture", {-1, 94 * dpi}, ImGuiChildFlags_Borders,
                          ImGuiWindowFlags_NoScrollbar);
        text(i ? message.data() : "Synthetic sample: starlight.nsx", 14);
        if (!i) {
            ImGui::SetCursorPosY(42 * dpi);
            text("No disk file is opened.", 12, true);
        }
        ImGui::EndChild();
        ImGui::PopStyleVar(2);
        ImGui::PopStyleColor();
        ImGui::SetCursorPos({16 * dpi, 194 * dpi});
        if (button(i ? "Simulate encryption" : "Simulate decryption", ready && !running, -1, i != 0,
                   14))
            state.start(bench::Clock::now());
        ImGui::EndChild();
    }
    const float statusY = cardsY + (narrow ? 524.f : 252.f) + 20;
    y(statusY);
    ImGui::BeginChild("status-card", {available, 118.5f * dpi}, ImGuiChildFlags_Borders,
                      ImGuiWindowFlags_NoScrollbar);
    const char *status = !ready                                         ? "Loading..."
                         : state.operation.phase == bench::Phase::ready ? "Ready"
                         : running                                      ? "Simulation running..."
                         : state.operation.phase == bench::Phase::success
                             ? "Simulation complete. No file was changed."
                             : "Simulation canceled.";
    ImGui::SetCursorPos({16 * dpi, 25 * dpi});
    text(status, 13);
    ImGui::SetCursorPos({ImGui::GetWindowWidth() - 76 * dpi, 16 * dpi});
    if (button("Reset", ready, 60 * dpi))
        state.operation.reset();
    if (running) {
        ImGui::SetCursorPos({ImGui::GetWindowWidth() - 154 * dpi, 16 * dpi});
        if (button("Cancel", true, 70 * dpi))
            state.operation.cancel();
    }
    ImGui::SetCursorPos({16 * dpi, 70 * dpi});
    ImGui::ProgressBar(static_cast<float>(state.operation.progress) / 100, {-1, 6 * dpi}, "");
    ImGui::SetCursorPos({16 * dpi, 84 * dpi});
    text("Simulation progress", 11, true);
    ImGui::SetCursorPos({ImGui::GetWindowWidth() - 48 * dpi, 84 * dpi});
    const auto percent = std::to_string(state.operation.progress) + "%";
    text(percent.c_str(), 11, true);
    ImGui::EndChild();
    ImGui::PopStyleVar();
    y(statusY + 136.5f);
    if (restoreWorkbench) {
        ImGui::SetKeyboardFocusHere();
        restoreWorkbench = false;
    }
    if (button("Open workbench", !running && ready)) {
        state.open();
        query.fill(0);
    }
    if (!narrow)
        ImGui::SameLine(0, 12 * dpi);
    text("Local interface. Synthetic data. Nothing is encrypted or decrypted.", 11, true);
    if (!narrow)
        ImGui::SameLine(0, 12 * dpi);
    text("CONTROLLED RENDERER \xc2\xb7 LOCAL STATE", 11, true);
    ImGui::SetNextWindowSize({420 * dpi, 0}, ImGuiCond_Appearing);
    ImGui::SetNextWindowPos({ImGui::GetIO().DisplaySize.x / 2, ImGui::GetIO().DisplaySize.y / 2},
                            ImGuiCond_Appearing, {.5f, .5f});
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(24 * dpi, 24 * dpi));
    if (ImGui::BeginPopupModal("About this test", nullptr,
                               ImGuiWindowFlags_AlwaysAutoResize | ImGuiWindowFlags_NoTitleBar |
                                   ImGuiWindowFlags_NoSavedSettings)) {
        title("About this test", 18);
        text("Actions are UI-only simulations. No files, cryptography, Go CLI, network or native "
             "bridge are involved.",
             14, true);
        // Renderer diagnostics remain available without changing the main-screen layout.
        text(graphics.renderer.c_str(), 11, true);
        if (ImGui::IsWindowAppearing())
            ImGui::SetKeyboardFocusHere();
        if (button("Close", true, -1) || ImGui::IsKeyPressed(ImGuiKey_Escape)) {
            ImGui::CloseCurrentPopup();
            about = false;
            restoreAbout = true;
        }
        ImGui::EndPopup();
    }
    ImGui::PopStyleVar();
}
void Ui::workPage() {
    const auto heading = ImGui::GetCursorPos();
    const float available = ImGui::GetContentRegionAvail().x;
    title("List and filter workbench", 22);
    if (available > 704 * dpi)
        ImGui::SetCursorPos({heading.x + available - 150 * dpi, heading.y});
    if (button("Back to main screen", true, 150 * dpi)) {
        state.back();
        restoreWorkbench = true;
    }
    ImGui::SetCursorPosY(ImGui::GetCursorPosY() + 8 * dpi);
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
    ImGui::PushStyleVar(ImGuiStyleVar_FramePadding,
                        ImVec2(12 * dpi, (40 * dpi - ImGui::GetFontSize()) / 2));
    ImGui::InputText("##filter", query.data(), query.size());
    ImGui::PopStyleVar();
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
    const float inset = io.DisplaySize.x < 760 * dpi ? 20.f : 28.f;
    const float horizontal = std::max(inset * dpi, (io.DisplaySize.x - 1044 * dpi) / 2);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(horizontal, inset * dpi));
    ImGui::Begin("NeutronStar surface", nullptr,
                 ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_NoMove |
                     ImGuiWindowFlags_NoSavedSettings | ImGuiWindowFlags_NoBringToFrontOnFocus);
    if (state.workbench)
        workPage();
    else
        mainPage(graphics);
    ImGui::End();
    ImGui::PopStyleVar();
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
