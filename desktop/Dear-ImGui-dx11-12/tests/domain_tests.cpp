#include "../src/domain.hpp"
#include <iostream>
#include <limits>
void check(bool ok) {
    if (!ok)
        throw std::runtime_error("Domain contract failed");
}
int main() {
    bench::Workflow w;
    w.start();
    auto token = w.generation;
    w.advance(token, 500);
    check(w.progress == 25);
    w.advance(token, std::numeric_limits<double>::quiet_NaN());
    check(w.progress == 25);
    w.cancel();
    w.advance(token, 2000);
    check(w.phase == bench::Phase::canceled);
    w.reset();
    w.start();
    w.advance(w.generation, 2000);
    check(w.phase == bench::Phase::success && w.progress == 100);
    bench::Workload r;
    r.remount();
    check(r.rows.front().id == 0 && r.rows.size() == 1000);
    r.replace(10000);
    check(r.rows.front().id == 1000 && r.rows.back().id == 10999);
    r.replace(1000);
    r.reverse();
    check(r.rows.front().id == 11999);
    r.splice();
    r.update();
    check(r.rows.front().id == 12000 && r.rows[0].value == 1 && r.rows[1].value == 0 &&
          r.tick == 1);
    check(r.rows.front().label().find("row-12000 ") == 0);
    r.remount();
    check(r.next == 1000 && r.tick == 0);
    bench::Activity a;
    auto now = bench::Clock::now();
    a.open();
    a.burst(60, now);
    a.advance(now + std::chrono::milliseconds(100));
    check(a.workload.tick == 1);
    a.stop();
    a.advance(now + std::chrono::seconds(1));
    check(a.workload.tick == 1);
    a.burst(10, now);
    a.advance(now + std::chrono::seconds(2));
    check(a.hz == 0);
    a.back();
    a.open();
    check(a.workload.rows.front().id == 0 && a.workload.tick == 0);
    a.start(now);
    a.advance(now + std::chrono::seconds(2));
    check(a.operation.phase == bench::Phase::success);
    try {
        r.replace(10001);
        return 1;
    } catch (const std::out_of_range &) {
    }
    std::cout << "ImGui domain contract passed\n";
}
