#include "controller.hpp"
#include "startup.hpp"
#include <QCommandLineParser>
#include <QFontDatabase>
#include <QGuiApplication>
#include <QPalette>
#include <QQmlApplicationEngine>
#include <QQuickStyle>
#include <QQuickWindow>
#include <QStyleHints>
#include <atomic>
#include <memory>

int main(int argc, char **argv) {
    QGuiApplication app(argc, argv);
    app.setApplicationName(QStringLiteral("NeutronStar GUI Bench"));
    QCommandLineParser parser;
    parser.addHelpOption();
    parser.addOptions(
        {{QStringLiteral("diagnostics"), "Explicit non-secret diagnostic JSONL output", "file"},
         {QStringLiteral("verify-startup"),
          "Exit after verified startup; reject renderer overrides"},
         {QStringLiteral("no-dialogs"), "Report errors without a blocking native dialog"}});
#ifdef NEUTRONSTAR_STARTUP_PROBE
    parser.addOption(
        {"inject", "Test-only startup failure (not in the shipped executable)", "case"});
#endif
    parser.process(app);
    const auto diagnostic = parser.value("diagnostics");
    const bool verify = parser.isSet("verify-startup");
    const bool dialogs = !parser.isSet("no-dialogs");
    QString injection;
#ifdef NEUTRONSTAR_STARTUP_PROBE
    injection = parser.value("inject");
    if (injection == "contrast") {
        app.setProperty("neutronstar.test.contrast", true);
        QPalette palette;
        palette.setColor(QPalette::Window, Qt::black);
        palette.setColor(QPalette::Base, Qt::black);
        palette.setColor(QPalette::Text, Qt::white);
        palette.setColor(QPalette::WindowText, Qt::white);
        palette.setColor(QPalette::Button, Qt::black);
        palette.setColor(QPalette::ButtonText, Qt::white);
        palette.setColor(QPalette::Highlight, Qt::yellow);
        palette.setColor(QPalette::HighlightedText, Qt::black);
        app.setPalette(palette);
    }
#endif
    bool failed = false;
    BenchController controller;
    const auto record = [&](const QJsonObject &event) {
        try {
            startup::write(diagnostic, event);
            return true;
        } catch (...) {
            failed = true;
            app.exit(2);
            return false;
        }
    };
    const auto fail = [&](const QString &code) {
        if (failed)
            return;
        failed = true;
        controller.close();
        try {
            startup::write(diagnostic, {{"event", "failed"}, {"code", code}});
        } catch (...) {
        }
        if (dialogs)
            startup::showFailure(code);
        app.exit(2);
    };
    bool overridden = false;
    for (const char *name : {"QT_QUICK_BACKEND", "QMLSCENE_DEVICE", "QSG_RHI_BACKEND",
                             "QSG_RHI_PREFER_SOFTWARE_RENDERER", "QT_D3D_ADAPTER_INDEX"})
        overridden = overridden || qEnvironmentVariableIsSet(name);
    if (!record({{"event", "starting"}, {"qt", qVersion()}, {"rendererOverride", overridden}}))
        return 2;
    if (verify && overridden) {
        fail("renderer-override");
        return 2;
    }
    app.styleHints()->setColorScheme(Qt::ColorScheme::Light);
    QQuickStyle::setStyle(QStringLiteral("Basic"));
    // A requested API is not hardware evidence; inspect the actual initialized device below.
    QQuickWindow::setGraphicsApi(QSGRendererInterface::Direct3D11);
    for (const auto *font :
         {":/Fonts/inter-latin-400-normal.ttf", ":/Fonts/inter-latin-500-normal.ttf",
          ":/Fonts/inter-latin-600-normal.ttf", ":/Fonts/noto-sans-hebrew-hebrew-400-normal.ttf"})
        if (QFontDatabase::addApplicationFont(injection == "font" ? QStringLiteral(":/missing.ttf")
                                                                  : QString::fromUtf8(font)) < 0) {
            fail("font");
            return 2;
        }
    QFont font(QStringLiteral("Inter"));
    font.setFamilies({QStringLiteral("Inter"), QStringLiteral("Noto Sans Hebrew"),
                      QStringLiteral("Segoe UI Emoji")});
    font.setPixelSize(14);
    app.setFont(font);
    struct Readiness {
        std::atomic_bool inspected{false};
        bool hardware = false;
        int frames = 0;
        QMetaObject::Connection graphicsProbe, frameProbe;
    };
    const auto ready = std::make_shared<Readiness>();
    QQmlApplicationEngine engine;
    engine.setInitialProperties({{QStringLiteral("bench"), QVariant::fromValue(&controller)}});
    QTimer watchdog;
    watchdog.setSingleShot(true);
    watchdog.setInterval(30000);
    QObject::connect(&watchdog, &QTimer::timeout, &app, [&] { fail("startup-timeout"); });
    QObject::connect(&app, &QCoreApplication::aboutToQuit, &controller, &BenchController::close);
    QObject::connect(
        &engine, &QQmlApplicationEngine::objectCreationFailed, &app, [&] { fail("qml"); },
        Qt::QueuedConnection);
    const auto announce = [&] {
        if (failed || controller.ready() || !ready->hardware || ready->frames < 2)
            return;
        watchdog.stop();
        QObject::disconnect(ready->frameProbe);
        controller.loaded();
        if (record({{"event", "ready"}, {"verifiedHardware", true}}) && verify)
            app.quit();
    };
    QObject::connect(
        &engine, &QQmlApplicationEngine::objectCreated, &app, [&](QObject *object, const QUrl &) {
            auto *window = qobject_cast<QQuickWindow *>(object);
            if (!window)
                return;
            QObject::connect(
                window, &QQuickWindow::sceneGraphError, &app,
                [&](auto, const QString &) { fail("scene-graph"); }, Qt::QueuedConnection);
            ready->graphicsProbe = QObject::connect(
                window, &QQuickWindow::beforeRendering, &app,
                [&, window, ready] {
                    if (ready->inspected.exchange(true))
                        return;
                    const auto graphics = startup::inspect(window);
                    QMetaObject::invokeMethod(
                        &app,
                        [&, ready, graphics] {
                            QObject::disconnect(ready->graphicsProbe);
                            if (failed)
                                return;
                            if (!record(graphics.json()))
                                return;
                            if (!graphics.verified) {
                                fail(graphics.failure);
                                return;
                            }
                            ready->hardware = true;
                            announce();
                        },
                        Qt::QueuedConnection);
                },
                Qt::DirectConnection);
            ready->frameProbe = QObject::connect(
                window, &QQuickWindow::frameSwapped, &app,
                [&, window, ready] {
                    if (++ready->frames == 1)
                        window->update();
                    announce();
                },
                Qt::QueuedConnection);
            if (injection == "scene-graph")
                QTimer::singleShot(0, &app, [window] {
                    window->sceneGraphError(QQuickWindow::ContextNotAvailable,
                                            QStringLiteral("synthetic test event"));
                });
            window->update();
        });
    if (injection == "qml")
        engine.load(QUrl(QStringLiteral("qrc:/missing.qml")));
    else
        engine.loadFromModule(QStringLiteral("NeutronStar"), QStringLiteral("Main"));
    watchdog.start();
    const int result = app.exec();
    // Stop/join the scene graph while all callback captures are still alive.
    for (auto *object : engine.rootObjects())
        delete object;
    return failed ? 2 : result;
}
