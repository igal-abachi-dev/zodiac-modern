#include "controller.hpp"
#include <QCoreApplication>
#include <QPersistentModelIndex>
#include <iostream>
#include <stdexcept>
static void check(bool value) {
    if (!value)
        throw std::runtime_error("Qt model assertion");
}
int main(int argc, char **argv) {
    QCoreApplication application(argc, argv);
    RowsModel rows;
    FilterModel filter;
    filter.setSourceModel(&rows);
    rows.replace(1000);
    QPersistentModelIndex stable(rows.index(0));
    rows.reverse();
    check(stable.row() == 999 && stable.data(RowsModel::Key).toInt() == 0);
    rows.splice();
    check(stable.row() == 999 && rows.index(0).data(RowsModel::Key).toInt() == 1000);
    filter.setQuery(QStringLiteral("row-1000 "));
    check(filter.rowCount() == 1);
    rows.update();
    check(filter.index(0, 0).data(RowsModel::Value).toInt() == 1);
    filter.setQuery(QStringLiteral("ROW-1000 "));
    check(filter.rowCount() == 0);
    filter.setQuery({});
    check(filter.rowCount() == 1000);
    rows.replace(1000, true);
    check(!stable.isValid() && rows.index(0).data(RowsModel::Key).toInt() == 0);
    BenchController controller;
    controller.loaded();
    controller.openWorkbench();
    controller.burst(30);
    check(controller.active());
    controller.closeWorkbench();
    check(!controller.active() && !controller.workbenchOpen());
    controller.openWorkbench();
    check(controller.summary() == QStringLiteral("1000 rows; tick 0"));
    controller.start(true);
    check(controller.busy());
    controller.cancel();
    controller.reset();
    check(!controller.busy() && controller.status() == QStringLiteral("Ready"));
    controller.close();
    check(!controller.ready() && !controller.busy() && !controller.active());
    std::cout << "PASS Qt model identity/filter/lifecycle contract\n";
}
