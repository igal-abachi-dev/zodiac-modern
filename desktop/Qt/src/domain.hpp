#pragma once
#include <algorithm>
#include <cmath>
#include <stdexcept>
#include <string>
#include <vector>

namespace bench {
enum class Phase { ready, running, success, canceled };
struct Workflow {
    bool loaded = false, encrypt = false;
    Phase phase = Phase::ready;
    int progress = 0;
    unsigned generation = 0;
    void start(bool operation) {
        if (!loaded || phase == Phase::running)
            return;
        ++generation;
        encrypt = operation;
        phase = Phase::running;
        progress = 0;
    }
    void advance(unsigned token, double milliseconds) {
        if (token != generation || phase != Phase::running || !std::isfinite(milliseconds))
            return;
        progress = std::max(progress, static_cast<int>(std::clamp(milliseconds / 20., 0., 100.)));
        if (milliseconds >= 2000.)
            phase = Phase::success;
    }
    void cancel() {
        if (phase == Phase::running) {
            ++generation;
            phase = Phase::canceled;
        }
    }
    void reset() {
        ++generation;
        phase = Phase::ready;
        progress = 0;
    }
};
struct Row {
    int id = 0, value = 0;
    [[nodiscard]] std::wstring label() const {
        return L"row-" + std::to_wstring(id) + L" שלום";
    }
};
struct Workload {
    std::vector<Row> rows;
    int next = 0, tick = 0;
    void replace(int count) {
        if (count < 0 || count > 10000)
            throw std::out_of_range("Synthetic row bound");
        rows.clear();
        rows.reserve(static_cast<size_t>(count));
        for (int i = 0; i < count; ++i)
            rows.push_back({next++, 0});
        tick = 0;
    }
    void reverse() {
        std::reverse(rows.begin(), rows.end());
    }
    void splice() {
        const auto removed = std::min<size_t>(10, rows.size());
        rows.erase(rows.begin(), rows.begin() + static_cast<std::ptrdiff_t>(removed));
        std::vector<Row> added;
        for (int i = 0; i < 10; ++i)
            added.push_back({next++, 0});
        rows.insert(rows.begin(), added.begin(), added.end());
    }
    void update() {
        for (size_t i = 0; i < rows.size(); i += 10)
            ++rows[i].value;
        ++tick;
    }
    void remount() {
        next = 0;
        replace(1000);
    }
};
} // namespace bench
