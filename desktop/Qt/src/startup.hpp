#pragma once
#include <QJsonObject>
#include <QString>
class QQuickWindow;
namespace startup {
struct Graphics {
    int api = 0;
    bool verified = false;
    bool software = false;
    unsigned vendor = 0, device = 0;
    QString adapter;
    QString failure;
    QJsonObject json() const;
};
// Call only on the scene-graph render thread, after graphics initialization.
Graphics inspect(QQuickWindow *window);
QString failureText(const QString &code);
void write(const QString &file, const QJsonObject &event);
void showFailure(const QString &code);
} // namespace startup
