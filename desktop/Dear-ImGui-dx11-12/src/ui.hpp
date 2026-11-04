#pragma once
#include "domain.hpp"
#include "graphics.hpp"
#include <array>
#include <filesystem>
#include <imgui.h>
#include <string>
#include <vector>
struct Widget {
    std::string name;
    ImVec2 low, high;
    bool enabled = false, visible = false, focused = false;
};
struct Ui {
    bench::Activity state;
    std::array<char, 512> message{};
    std::array<char, 256> query{};
    std::vector<Widget> widgets;
    ImFont *regular = nullptr;
    ImFont *bold = nullptr;
    bool ready = false, about = false, restoreAbout = false, restoreWorkbench = false;
    std::size_t visibleRows = 0;
    std::uint64_t firstId = 0;
    int firstValue = 0;
    float dpi = 1;
    Ui();
    void loadFonts(const std::filesystem::path &root);
    void scale(float value);
    void draw(const GraphicsInfo &graphics);
    bool active() const { return state.hz || state.operation.phase == bench::Phase::running; }

private:
    void mark(const char *name, bool enabled = true);
    bool button(const char *label, bool enabled = true, float width = 0);
    void title(const char *text, float size = 22);
    void icon(bool orbit, bool locked = true);
    void mainPage(const GraphicsInfo &graphics);
    void workPage();
};
void writeProbe(const std::filesystem::path &path, const Ui &ui, const GraphicsInfo &graphics,
                std::uint64_t frames);
