#pragma once
#include <algorithm>
#include <cmath>
#include <stdexcept>
#include <string>
#include <vector>
namespace bench {
enum class Phase { ready, running, success, canceled };
struct Workflow {
    Phase phase = Phase::ready;
    int progress = 0;
    unsigned generation = 0;
    void start() { if (phase != Phase::running) { ++generation; progress = 0; phase = Phase::running; } }
    void advance(unsigned token, double ms) {
        if (token != generation || phase != Phase::running || !std::isfinite(ms)) return;
        progress = std::max(progress, static_cast<int>(std::clamp(ms / 20., 0., 100.)));
        if (ms >= 2000.) phase = Phase::success;
    }
    void cancel() { if (phase == Phase::running) { ++generation; phase = Phase::canceled; } }
    void reset() { ++generation; phase = Phase::ready; progress = 0; }
};
struct Row {
    int id = 0, value = 0;
    std::wstring label() const { return L"row-" + std::to_wstring(id) + L" שלום"; }
};
struct Rows {
    std::vector<Row> rows;
    int next = 0, tick = 0;
    void replace(int n) {
        if (n < 0 || n > 10000) throw std::out_of_range("Row bound");
        rows.clear(); rows.reserve(static_cast<size_t>(n)); tick = 0;
        for (int i = 0; i < n; ++i) rows.push_back({next++, 0});
    }
    void remount() { next = 0; replace(1000); }
    void reverse() { std::reverse(rows.begin(), rows.end()); }
    void splice() {
        rows.erase(rows.begin(), rows.begin() + static_cast<std::ptrdiff_t>(std::min<size_t>(10, rows.size())));
        std::vector<Row> inserted;
        for (int i = 0; i < 10; ++i) inserted.push_back({next++, 0});
        rows.insert(rows.begin(), inserted.begin(), inserted.end());
    }
    void update() { for (size_t i = 0; i < rows.size(); i += 10) ++rows[i].value; ++tick; }
    std::vector<Row> filtered(const std::wstring& query) const {
        std::vector<Row> result;
        for (const auto& row : rows) if (row.label().find(query) != std::wstring::npos) result.push_back(row);
        return result;
    }
};
}
