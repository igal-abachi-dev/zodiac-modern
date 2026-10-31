#include "controller.hpp"
#include <chrono>

QVariant RowsModel::data(const QModelIndex &index, int role) const {
    if (!index.isValid() || index.row() < 0 || index.row() >= rowCount())
        return {};
    const auto &row = state.rows[static_cast<size_t>(index.row())];
    switch (role) {
    case Key:
        return row.id;
    case Label:
        return QString::fromStdWString(row.label());
    case Value:
        return row.value;
    case Display:
    case Qt::DisplayRole:
        return QString::fromStdWString(row.label()) + QStringLiteral(": ") +
               QString::number(row.value);
    default:
        return {};
    }
}
void RowsModel::replace(int count, bool remount) {
    if (count < 0 || count > 10000)
        return;
    beginResetModel();
    if (remount)
        state.next = 0;
    state.replace(count);
    endResetModel();
}
void RowsModel::reverse() {
    emit layoutAboutToBeChanged();
    const auto old = persistentIndexList();
    QModelIndexList replacement;
    replacement.reserve(old.size());
    for (const auto &i : old)
        replacement.push_back(index(rowCount() - 1 - i.row(), 0));
    state.reverse();
    changePersistentIndexList(old, replacement);
    emit layoutChanged();
}
void RowsModel::splice() {
    const int removed = std::min(10, rowCount());
    if (removed) {
        beginRemoveRows({}, 0, removed - 1);
        state.rows.erase(state.rows.begin(), state.rows.begin() + removed);
        endRemoveRows();
    }
    beginInsertRows({}, 0, 9);
    std::vector<bench::Row> added;
    for (int i = 0; i < 10; ++i)
        added.push_back({state.next++, 0});
    state.rows.insert(state.rows.begin(), added.begin(), added.end());
    endInsertRows();
}
void RowsModel::update() {
    state.update();
    for (int i = 0; i < rowCount(); i += 10)
        emit dataChanged(index(i), index(i), {Value, Display, Qt::DisplayRole});
}
void RowsModel::clear() {
    beginResetModel();
    state = {};
    endResetModel();
}
BenchController::BenchController(QObject *parent) : QObject(parent) {
    filter_.setSourceModel(&model_);
    filter_.setFilterRole(RowsModel::Label);
    flowTimer_.setInterval(100);
    flowTimer_.setTimerType(Qt::PreciseTimer);
    burstTimer_.setTimerType(Qt::PreciseTimer);
    connect(&flowTimer_, &QTimer::timeout, this, [this] {
        flow_.advance(token_, static_cast<double>(flowClock_.elapsed()));
        if (!busy())
            flowTimer_.stop();
        emit changed();
    });
    connect(&burstTimer_, &QChronoTimer::timeout, this, [this] {
        if (!open_ || !active_)
            return;
        if (burstClock_.elapsed() >= 2000) {
            stop();
            return;
        }
        updateRows();
    });
}
QString BenchController::status() const {
    if (!ready())
        return QStringLiteral("Loading local interface…");
    switch (flow_.phase) {
    case bench::Phase::ready:
        return QStringLiteral("Ready");
    case bench::Phase::running:
        return flow_.encrypt ? QStringLiteral("Simulating encryption…")
                             : QStringLiteral("Simulating decryption…");
    case bench::Phase::success:
        return QStringLiteral("Simulation complete. No file was changed.");
    case bench::Phase::canceled:
        return QStringLiteral("Simulation canceled.");
    }
    return {};
}
void BenchController::loaded() {
    if (ready())
        return;
    flow_.loaded = true;
    emit changed();
}
void BenchController::start(bool encrypt) {
    if (!ready() || busy())
        return;
    flow_.start(encrypt);
    token_ = flow_.generation;
    flowClock_.start();
    flowTimer_.start();
    emit changed();
}
void BenchController::cancel() {
    flowTimer_.stop();
    flow_.cancel();
    emit changed();
}
void BenchController::reset() {
    flowTimer_.stop();
    flow_.reset();
    emit changed();
}
void BenchController::openWorkbench() {
    if (!ready() || busy() || open_)
        return;
    open_ = true;
    remount();
}
void BenchController::closeWorkbench() {
    stop();
    open_ = false;
    filter_.setQuery({});
    model_.clear();
    emit changed();
}
void BenchController::replaceRows(int count) {
    if (!open_)
        return;
    stop();
    filter_.setQuery({});
    model_.replace(count);
    emit changed();
}
void BenchController::reverseRows() {
    if (open_) {
        model_.reverse();
        emit changed();
    }
}
void BenchController::spliceRows() {
    if (open_) {
        model_.splice();
        emit changed();
    }
}
void BenchController::updateRows() {
    if (open_) {
        model_.update();
        emit changed();
    }
}
void BenchController::setQuery(const QString &query) {
    if (open_) {
        filter_.setQuery(query);
        emit changed();
    }
}
void BenchController::burst(int hz) {
    if (!open_ || (hz != 10 && hz != 30 && hz != 60))
        return;
    stop();
    active_ = true;
    burstClock_.start();
    burstTimer_.setInterval(std::chrono::nanoseconds(1000000000 / hz));
    burstTimer_.start();
    emit changed();
}
void BenchController::stop() {
    burstTimer_.stop();
    active_ = false;
    emit changed();
}
void BenchController::remount() {
    if (!open_)
        return;
    stop();
    filter_.setQuery({});
    model_.replace(1000, true);
    emit changed();
}
void BenchController::close() {
    flowTimer_.stop();
    burstTimer_.stop();
    ++flow_.generation;
    active_ = false;
    flow_.loaded = false;
    flow_.phase = bench::Phase::ready;
    emit changed();
}
