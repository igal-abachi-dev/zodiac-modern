#pragma once
#include <QColor>
#include <QObject>
#include <QtQml/qqmlregistration.h>
class Theme final : public QObject {
    Q_OBJECT
    QML_ELEMENT
    QML_SINGLETON
    Q_PROPERTY(bool highContrast READ highContrast NOTIFY changed)
    Q_PROPERTY(QColor background READ background NOTIFY changed)
    Q_PROPERTY(QColor surface READ surface NOTIFY changed)
    Q_PROPERTY(QColor text READ text NOTIFY changed)
    Q_PROPERTY(QColor muted READ muted NOTIFY changed)
    Q_PROPERTY(QColor border READ border NOTIFY changed)
    Q_PROPERTY(QColor inset READ inset NOTIFY changed)
    Q_PROPERTY(QColor accent READ accent NOTIFY changed)
    Q_PROPERTY(QColor onAccent READ onAccent NOTIFY changed)
  public:
    explicit Theme(QObject *parent = nullptr);
    bool highContrast() const;
    QColor background() const;
    QColor surface() const;
    QColor text() const;
    QColor muted() const;
    QColor border() const;
    QColor inset() const;
    QColor accent() const;
    QColor onAccent() const;
  signals:
    void changed();

  protected:
    bool eventFilter(QObject *, QEvent *event) override;
};
