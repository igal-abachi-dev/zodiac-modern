#pragma once
#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <stdexcept>
#include <string>
#include <vector>
namespace bench {
using Clock = std::chrono::steady_clock;
enum class Phase { ready, running, success, canceled };
struct Workflow {
    Phase phase = Phase::ready;
    int progress = 0;
    std::uint64_t generation = 0;
    void start() {
        if (phase != Phase::running) {
            ++generation;
            progress = 0;
            phase = Phase::running;
        }
    }
    void advance(std::uint64_t token, double elapsed) {
        if (token != generation || phase != Phase::running || !std::isfinite(elapsed))
            return;
        progress = std::max(progress, static_cast<int>(std::clamp(elapsed / 20., 0., 100.)));
        if (elapsed >= 2000.)
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
    std::uint64_t id = 0;
    int value = 0;
    std::string caption;
    Row(std::uint64_t key = 0, int initial = 0)
        : id(key), value(initial), caption("row-" + std::to_string(key) + " שלום") {}
    const std::string &label() const { return caption; }
};
struct Workload {
    std::vector<Row> rows;
    std::uint64_t next = 0;
    int tick = 0;
    void replace(int n) {
        if (n < 0 || n > 10000)
            throw std::out_of_range("Row bound");
        rows.clear();
        rows.reserve(static_cast<size_t>(n));
        for (int i = 0; i < n; ++i)
            rows.push_back({next++, 0});
        tick = 0;
    }
    void remount() {
        next = 0;
        replace(1000);
    }
    void reverse() { std::reverse(rows.begin(), rows.end()); }
    void splice() {
        rows.erase(rows.begin(),
                   rows.begin() + static_cast<std::ptrdiff_t>(std::min<size_t>(10, rows.size())));
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
};
struct Activity {
    Workflow operation;
    Workload workload;
    bool workbench = false;
    int hz = 0;
    Clock::time_point started{}, burstStarted{}, nextTick{};
    std::uint64_t token = 0;
    void start(Clock::time_point now) {
        if (operation.phase == Phase::running)
            return;
        operation.start();
        started = now;
        token = operation.generation;
    }
    void stop() { hz = 0; }
    void burst(int rate, Clock::time_point now) {
        if (rate != 10 && rate != 30 && rate != 60)
            throw std::invalid_argument("Rate");
        hz = rate;
        burstStarted = now;
        nextTick = now + std::chrono::microseconds(1000000 / rate);
    }
    void open() {
        stop();
        workload.remount();
        workbench = true;
    }
    void back() {
        stop();
        workbench = false;
    }
    void remount() {
        stop();
        workload.remount();
    }
    void advance(Clock::time_point now) {
        operation.advance(token, std::chrono::duration<double, std::milli>(now - started).count());
        if (hz) {
            if (now - burstStarted >= std::chrono::seconds(2))
                stop();
            else if (now >= nextTick) {
                workload.update();
                nextTick = now + std::chrono::microseconds(1000000 / hz);
            }
        }
    }
};
} // namespace bench
