#pragma once
#include "domain.hpp"
#include <QAbstractListModel>
#include <QChronoTimer>
#include <QElapsedTimer>
#include <QObject>
#include <QSortFilterProxyModel>
#include <QTimer>
#include <QtQml/qqmlregistration.h>

class RowsModel final : public QAbstractListModel {
    Q_OBJECT
  public:
    enum Role { Key = Qt::UserRole + 1, Label, Value, Display };
    explicit RowsModel(QObject *parent = nullptr) : QAbstractListModel(parent) {}
    bench::Workload state;
    int rowCount(const QModelIndex &parent = {}) const override {
        return parent.isValid() ? 0 : static_cast<int>(state.rows.size());
    }
    QVariant data(const QModelIndex &index, int role) const override;
    QHash<int, QByteArray> roleNames() const override {
        return {{Key, "rowKey"}, {Label, "label"}, {Value, "value"}, {Display, "displayText"}};
    }
    void replace(int count, bool remount = false);
    void reverse();
    void splice();
    void update();
    void clear();
};
class FilterModel final : public QSortFilterProxyModel {
    Q_OBJECT
  public:
    QString query;
    explicit FilterModel(QObject *parent = nullptr) : QSortFilterProxyModel(parent) {}
    void setQuery(const QString &value) {
        beginFilterChange();
        query = value;
        endFilterChange(Direction::Rows);
    }

  protected:
    bool filterAcceptsRow(int row, const QModelIndex &parent) const override {
        return sourceModel()
            ->index(row, 0, parent)
            .data(RowsModel::Label)
            .toString()
            .contains(query, Qt::CaseSensitive);
    }
};
class BenchController final : public QObject {
    Q_OBJECT
    QML_ELEMENT
    QML_UNCREATABLE("The application supplies its own controller")
    Q_PROPERTY(bool ready READ ready NOTIFY changed)
    Q_PROPERTY(bool busy READ busy NOTIFY changed)
    Q_PROPERTY(int progress READ progress NOTIFY changed)
    Q_PROPERTY(QString status READ status NOTIFY changed)
    Q_PROPERTY(bool workbenchOpen READ workbenchOpen NOTIFY changed)
    Q_PROPERTY(bool active READ active NOTIFY changed)
    Q_PROPERTY(QString query READ query NOTIFY changed)
    Q_PROPERTY(QString summary READ summary NOTIFY changed)
    Q_PROPERTY(QAbstractItemModel *rows READ rows CONSTANT)
  public:
    explicit BenchController(QObject *parent = nullptr);
    bool ready() const {
        return flow_.loaded;
    }
    bool busy() const {
        return flow_.phase == bench::Phase::running;
    }
    int progress() const {
        return flow_.progress;
    }
    QString status() const;
    bool workbenchOpen() const {
        return open_;
    }
    bool active() const {
        return active_;
    }
    QString query() const {
        return filter_.query;
    }
    QString summary() const {
        return QStringLiteral("%1 rows; tick %2").arg(filter_.rowCount()).arg(model_.state.tick);
    }
    QAbstractItemModel *rows() {
        return &filter_;
    }
    Q_INVOKABLE void loaded();
    Q_INVOKABLE void start(bool encrypt);
    Q_INVOKABLE void cancel();
    Q_INVOKABLE void reset();
    Q_INVOKABLE void openWorkbench();
    Q_INVOKABLE void closeWorkbench();
    Q_INVOKABLE void replaceRows(int count);
    Q_INVOKABLE void reverseRows();
    Q_INVOKABLE void spliceRows();
    Q_INVOKABLE void updateRows();
    Q_INVOKABLE void setQuery(const QString &query);
    Q_INVOKABLE void burst(int hz);
    Q_INVOKABLE void stop();
    Q_INVOKABLE void remount();
    Q_INVOKABLE void close();
  signals:
    void changed();

  private:
    bench::Workflow flow_;
    RowsModel model_;
    FilterModel filter_;
    QTimer flowTimer_;
    QChronoTimer burstTimer_;
    QElapsedTimer flowClock_, burstClock_;
    unsigned token_ = 0;
    bool open_ = false, active_ = false;
};
