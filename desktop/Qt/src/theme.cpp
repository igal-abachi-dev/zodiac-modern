#include "theme.hpp"
#include <QAccessibilityHints>
#include <QEvent>
#include <QGuiApplication>
#include <QPalette>
#include <QStyleHints>
Theme::Theme(QObject *parent) : QObject(parent) {
    qApp->installEventFilter(this);
    connect(QGuiApplication::styleHints()->accessibility(),
            &QAccessibilityHints::contrastPreferenceChanged, this, [this] { emit changed(); });
}
bool Theme::eventFilter(QObject *, QEvent *event) {
    if (event->type() == QEvent::ApplicationPaletteChange)
        emit changed();
    return false;
}
bool Theme::highContrast() const {
#ifdef NEUTRONSTAR_STARTUP_PROBE
    if (qApp->property("neutronstar.test.contrast").toBool())
        return true;
#endif
    return QGuiApplication::styleHints()->accessibility()->contrastPreference() ==
           Qt::ContrastPreference::HighContrast;
}
QColor Theme::background() const {
    return highContrast() ? QGuiApplication::palette().color(QPalette::Window) : QColor("#f8faf9");
}
QColor Theme::surface() const {
    return highContrast() ? QGuiApplication::palette().color(QPalette::Base) : QColor("white");
}
QColor Theme::text() const {
    return highContrast() ? QGuiApplication::palette().color(QPalette::Text) : QColor("#171a18");
}
QColor Theme::muted() const {
    return highContrast() ? text() : QColor("#5d6660");
}
QColor Theme::border() const {
    return highContrast() ? text() : QColor("#dce3de");
}
QColor Theme::inset() const {
    return highContrast() ? surface() : QColor("#f1f4f2");
}
QColor Theme::accent() const {
    return highContrast() ? QGuiApplication::palette().color(QPalette::Highlight)
                          : QColor("#047857");
}
QColor Theme::onAccent() const {
    return highContrast() ? QGuiApplication::palette().color(QPalette::HighlightedText)
                          : QColor("white");
}
