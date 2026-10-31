#include "../src/domain.hpp"
#include <iostream>
static void check(bool value) {
    if (!value)
        throw std::runtime_error("Qt domain contract assertion");
}
int main() {
    bench::Workflow flow;
    flow.start(true);
    check(flow.phase == bench::Phase::ready);
    flow.loaded = true;
    flow.start(true);
    const auto old = flow.generation;
    flow.advance(old, 500);
    check(flow.progress == 25);
    flow.advance(old, 100);
    check(flow.progress == 25);
    flow.cancel();
    flow.advance(old, 2000);
    check(flow.phase == bench::Phase::canceled);
    flow.reset();
    flow.start(false);
    flow.advance(flow.generation, 2000);
    check(flow.progress == 100 && flow.phase == bench::Phase::success);
    bench::Workload rows;
    rows.replace(1000);
    check(rows.rows.front().id == 0);
    rows.replace(10000);
    check(rows.rows.front().id == 1000);
    rows.replace(1000);
    rows.reverse();
    check(rows.rows.front().id == 11999);
    rows.splice();
    check(rows.rows.front().id == 12000);
    rows.update();
    check(rows.tick == 1 && rows.rows.front().value == 1 && rows.rows[1].value == 0);
    rows.remount();
    check(rows.next == 1000 && rows.tick == 0);
    bool rejected = false;
    try {
        rows.replace(10001);
    } catch (const std::out_of_range &) {
        rejected = true;
    }
    check(rejected);
    std::cout << "PASS independent C++ domain contract\n";
}
