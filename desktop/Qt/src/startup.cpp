#include "startup.hpp"
#include <QFile>
#include <QJsonDocument>
#include <QQuickWindow>
#include <QSGRendererInterface>
#include <d3d11.h>
#include <dxgi1_2.h>
#include <stdexcept>
#include <wrl/client.h>
namespace startup {
QJsonObject Graphics::json() const {
    return {{"event", "graphics"},
            {"api", api},
            {"verified", verified},
            {"software", software},
            {"vendor", static_cast<int>(vendor)},
            {"device", static_cast<int>(device)},
            {"adapter", adapter.left(128)},
            {"failure", failure}};
}
Graphics inspect(QQuickWindow *window) {
    Graphics report;
    const auto *renderer = window->rendererInterface();
    report.api = static_cast<int>(renderer->graphicsApi());
    if (renderer->graphicsApi() != QSGRendererInterface::Direct3D11) {
        report.failure = "graphics-api";
        return report;
    }
    auto *device = static_cast<ID3D11Device *>(
        renderer->getResource(window, QSGRendererInterface::DeviceResource));
    Microsoft::WRL::ComPtr<IDXGIDevice> dxgi;
    Microsoft::WRL::ComPtr<IDXGIAdapter> adapter;
    Microsoft::WRL::ComPtr<IDXGIAdapter1> adapter1;
    DXGI_ADAPTER_DESC1 description{};
    if (!device || FAILED(device->QueryInterface(IID_PPV_ARGS(&dxgi))) ||
        FAILED(dxgi->GetAdapter(&adapter)) || FAILED(adapter.As(&adapter1)) ||
        FAILED(adapter1->GetDesc1(&description))) {
        report.failure = "graphics-inspection";
        return report;
    }
    report.software = (description.Flags & DXGI_ADAPTER_FLAG_SOFTWARE) != 0;
    report.vendor = description.VendorId;
    report.device = description.DeviceId;
    report.adapter =
        QString::fromWCharArray(description.Description, 128).split(QChar::Null).front();
    report.verified = !report.software;
    if (report.software)
        report.failure = "software-adapter";
    return report;
}
QString failureText(const QString &code) {
    if (code == "renderer-override")
        return QStringLiteral("A renderer environment override is present. Start a clean "
                              "comparison process without Qt graphics overrides.");
    if (code == "font")
        return QStringLiteral("A bundled interface font could not be loaded. Restore the complete "
                              "application folder.");
    if (code == "qml")
        return QStringLiteral("The bundled QML interface could not be created. Restore the "
                              "matching application and Qt plugins.");
    if (code == "scene-graph")
        return QStringLiteral("Qt could not initialize its graphics scene. Check the display "
                              "driver and application deployment.");
    if (code == "graphics-api")
        return QStringLiteral(
            "This comparison requires Qt Quick D3D11. A different scene-graph backend was "
            "selected. Remove renderer overrides before comparing results.");
    if (code == "software-adapter")
        return QStringLiteral(
            "Qt selected a software graphics adapter. This is not an accepted hardware-rendered "
            "benchmark run. Check the display driver or remote-session configuration.");
    if (code == "graphics-inspection")
        return QStringLiteral("The actual D3D11 adapter could not be verified. This run cannot be "
                              "accepted as a hardware-rendered benchmark.");
    if (code == "startup-timeout")
        return QStringLiteral("The interface did not become ready within 30 seconds. Check the "
                              "application deployment and graphics driver.");
    return QStringLiteral(
        "The local interface could not start. Check the complete application deployment.");
}
void write(const QString &file, const QJsonObject &event) {
    if (file.isEmpty())
        return;
    QFile output(file);
    if (!output.open(QIODevice::WriteOnly | QIODevice::Append))
        throw std::runtime_error("Cannot write the explicitly requested diagnostic file");
    const auto bytes = QJsonDocument(event).toJson(QJsonDocument::Compact) + '\n';
    if (output.write(bytes) != bytes.size())
        throw std::runtime_error("Incomplete diagnostic write");
}
void showFailure(const QString &code) {
    const auto text = failureText(code);
    MessageBoxW(nullptr, reinterpret_cast<const wchar_t *>(text.utf16()),
                L"NeutronStar Qt — startup failure", MB_OK | MB_ICONERROR | MB_TASKMODAL);
}
} // namespace startup
