#pragma once
#include <memory>
#include <stdexcept>
#include <string>
#include <windows.h>
struct DxError final : std::runtime_error {
    HRESULT code;
    DxError(HRESULT value, const char *stage) : std::runtime_error(stage), code(value) {}
};
inline void checked(HRESULT code, const char *stage) {
    if (FAILED(code))
        throw DxError(code, stage);
}
struct GraphicsInfo {
    std::string renderer, adapter;
    bool software = false, fallback = false;
    HRESULT fallbackCode = S_OK;
};
class Graphics {
public:
    GraphicsInfo info;
    virtual ~Graphics() = default;
    virtual void newFrame() = 0;
    virtual void render() = 0;
    virtual void resize(unsigned width, unsigned height) = 0;
    virtual bool visible() = 0;
};
std::unique_ptr<Graphics> createGraphics(HWND window, const std::string &requested,
                                         bool allowSoftware, bool injectUnavailable = false);
