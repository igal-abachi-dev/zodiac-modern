#include "../src/domain.hpp"
#include <iostream>
#include <limits>
void require(bool ok) { if (!ok) throw std::runtime_error("Domain contract failed"); }
int main() {
    bench::Workflow w; w.start(); auto token = w.generation;
    w.advance(token, 500); require(w.progress == 25);
    w.advance(token, std::numeric_limits<double>::quiet_NaN()); require(w.progress == 25);
    w.cancel(); w.advance(token, 2000); require(w.phase == bench::Phase::canceled);
    w.reset(); w.start(); w.advance(w.generation, 2000); require(w.phase == bench::Phase::success && w.progress == 100);
    bench::Rows r; r.remount(); require(r.rows.size() == 1000 && r.rows.front().id == 0);
    r.replace(10000); require(r.rows.front().id == 1000 && r.rows.back().id == 10999);
    r.replace(1000); r.reverse(); require(r.rows.front().id == 11999);
    r.splice(); require(r.rows.front().id == 12000 && r.rows.size() == 1000);
    r.update(); require(r.rows[0].value == 1 && r.rows[1].value == 0 && r.tick == 1);
    require(r.filtered(L"row-12000 ").size() == 1 && r.filtered(L"absent").empty());
    r.remount(); require(r.next == 1000 && r.tick == 0);
    try {r.replace(10001); return 1;} catch (const std::out_of_range&) {}
    std::cout << "wx domain contract passed\n";
}
