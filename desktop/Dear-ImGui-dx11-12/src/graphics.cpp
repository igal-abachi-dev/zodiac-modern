#include "graphics.hpp"
#include <array>
#include <d3d11.h>
#include <d3d12.h>
#include <dxgi1_6.h>
#include <imgui.h>
#include <imgui_impl_dx11.h>
#include <imgui_impl_dx12.h>
#include <limits>
#include <vector>
#include <wrl/client.h>
using Microsoft::WRL::ComPtr;
namespace {
struct HandleCloser {
    void operator()(void *h) const noexcept {
        if (h && h != INVALID_HANDLE_VALUE)
            CloseHandle(h);
    }
};
using Handle = std::unique_ptr<void, HandleCloser>;
std::string utf8(const wchar_t *value) {
    const int size = WideCharToMultiByte(CP_UTF8, 0, value, -1, nullptr, 0, nullptr, nullptr);
    if (size <= 0)
        throw DxError(HRESULT_FROM_WIN32(GetLastError()), "Adapter name");
    std::string out(static_cast<size_t>(size), '\0');
    WideCharToMultiByte(CP_UTF8, 0, value, -1, out.data(), size, nullptr, nullptr);
    out.pop_back();
    return out;
}
constexpr DXGI_FORMAT format = DXGI_FORMAT_R8G8B8A8_UNORM;
constexpr UINT buffers = 2;
class SwapGraphics : public Graphics {
protected:
    ComPtr<IDXGIFactory6> factory;
    ComPtr<IDXGISwapChain3> swap;
    Handle latency;
    bool hidden = false;
    void createFactory() { checked(CreateDXGIFactory2(0, IID_PPV_ARGS(&factory)), "DXGI factory"); }
    void createSwap(HWND hwnd, IUnknown *device) {
        DXGI_SWAP_CHAIN_DESC1 desc{};
        desc.BufferCount = buffers;
        desc.Format = format;
        desc.SampleDesc.Count = 1;
        desc.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT;
        desc.SwapEffect = DXGI_SWAP_EFFECT_FLIP_DISCARD;
        desc.Flags = DXGI_SWAP_CHAIN_FLAG_FRAME_LATENCY_WAITABLE_OBJECT;
        ComPtr<IDXGISwapChain1> initial;
        checked(factory->CreateSwapChainForHwnd(device, hwnd, &desc, nullptr, nullptr, &initial),
                "Swap chain");
        checked(initial.As(&swap), "Swap chain interface");
        checked(factory->MakeWindowAssociation(hwnd, DXGI_MWA_NO_ALT_ENTER), "Window association");
        checked(swap->SetMaximumFrameLatency(1), "Frame latency");
        latency.reset(swap->GetFrameLatencyWaitableObject());
        if (!latency)
            throw DxError(E_HANDLE, "Frame latency handle");
    }
    void waitFrame() {
        const auto result = WaitForSingleObject(latency.get(), 5000);
        if (result != WAIT_OBJECT_0)
            throw DxError(result == WAIT_FAILED ? HRESULT_FROM_WIN32(GetLastError())
                                                : HRESULT_FROM_WIN32(ERROR_TIMEOUT),
                          "Frame wait");
    }
    void present() {
        const auto result = swap->Present(1, 0);
        hidden = result == DXGI_STATUS_OCCLUDED;
        checked(result, "Present");
    }

public:
    bool visible() override {
        if (hidden) {
            const auto result = swap->Present(0, DXGI_PRESENT_TEST);
            if (result == DXGI_STATUS_OCCLUDED)
                return false;
            checked(result, "Visibility test");
            hidden = false;
        }
        return true;
    }
};
class Dx11 final : public SwapGraphics {
    ComPtr<ID3D11Device> device;
    ComPtr<ID3D11DeviceContext> context;
    ComPtr<ID3D11RenderTargetView> target;
    bool backend = false;
    void views() {
        ComPtr<ID3D11Texture2D> texture;
        checked(swap->GetBuffer(0, IID_PPV_ARGS(&texture)), "DX11 back buffer");
        checked(device->CreateRenderTargetView(texture.Get(), nullptr, &target), "DX11 target");
    }

public:
    Dx11(HWND hwnd, bool allowSoftware) {
        createFactory();
        D3D_FEATURE_LEVEL level{};
        const D3D_FEATURE_LEVEL wanted[] = {D3D_FEATURE_LEVEL_11_0};
        auto result = D3D11CreateDevice(nullptr, D3D_DRIVER_TYPE_HARDWARE, nullptr,
                                        D3D11_CREATE_DEVICE_BGRA_SUPPORT, wanted, 1,
                                        D3D11_SDK_VERSION, &device, &level, &context);
        if (FAILED(result) && allowSoftware) {
            device.Reset();
            context.Reset();
            result = D3D11CreateDevice(nullptr, D3D_DRIVER_TYPE_WARP, nullptr,
                                       D3D11_CREATE_DEVICE_BGRA_SUPPORT, wanted, 1,
                                       D3D11_SDK_VERSION, &device, &level, &context);
            info.software = SUCCEEDED(result);
        }
        checked(result, "DX11 device");
        ComPtr<IDXGIDevice> dxgi;
        ComPtr<IDXGIAdapter> adapter;
        DXGI_ADAPTER_DESC description{};
        checked(device.As(&dxgi), "DX11 adapter interface");
        checked(dxgi->GetAdapter(&adapter), "DX11 adapter");
        checked(adapter->GetDesc(&description), "DX11 adapter description");
        info.renderer = "DX11";
        info.adapter = utf8(description.Description);
        createSwap(hwnd, device.Get());
        views();
        if (!ImGui_ImplDX11_Init(device.Get(), context.Get()))
            throw DxError(E_FAIL, "DX11 ImGui backend");
        backend = true;
    }
    ~Dx11() override {
        if (backend)
            ImGui_ImplDX11_Shutdown();
        if (context) {
            context->ClearState();
            context->Flush();
        }
    }
    void newFrame() override { ImGui_ImplDX11_NewFrame(); }
    void render() override {
        waitFrame();
        const float clear[] = {.98f, .98f, .98f, 1.f};
        auto *view = target.Get();
        context->OMSetRenderTargets(1, &view, nullptr);
        context->ClearRenderTargetView(view, clear);
        ImGui_ImplDX11_RenderDrawData(ImGui::GetDrawData());
        present();
    }
    void resize(unsigned w, unsigned h) override {
        context->OMSetRenderTargets(0, nullptr, nullptr);
        target.Reset();
        checked(swap->ResizeBuffers(0, w, h, format,
                                    DXGI_SWAP_CHAIN_FLAG_FRAME_LATENCY_WAITABLE_OBJECT),
                "DX11 resize");
        views();
    }
};
class Dx12 final : public SwapGraphics {
    struct Frame {
        ComPtr<ID3D12CommandAllocator> allocator;
        UINT64 fence = 0;
    };
    ComPtr<ID3D12Device> device;
    ComPtr<ID3D12CommandQueue> queue;
    ComPtr<ID3D12GraphicsCommandList> list;
    ComPtr<ID3D12DescriptorHeap> rtv, srv;
    ComPtr<ID3D12Fence> fence;
    Handle event;
    std::array<Frame, buffers> frames{};
    std::array<ComPtr<ID3D12Resource>, buffers> targets{};
    std::array<D3D12_CPU_DESCRIPTOR_HANDLE, buffers> handles{};
    std::vector<UINT> freeDescriptors;
    UINT descriptorSize = 0;
    UINT64 signal = 0;
    bool backend = false;
    void wait(UINT64 value) {
        if (value && fence->GetCompletedValue() < value) {
            checked(fence->SetEventOnCompletion(value, event.get()), "DX12 fence event");
            const auto result = WaitForSingleObject(event.get(), 5000);
            if (result != WAIT_OBJECT_0)
                throw DxError(result == WAIT_FAILED ? HRESULT_FROM_WIN32(GetLastError())
                                                    : HRESULT_FROM_WIN32(ERROR_TIMEOUT),
                              "DX12 GPU wait");
        }
    }
    void idle() {
        if (queue && fence) {
            checked(queue->Signal(fence.Get(), ++signal), "DX12 signal");
            wait(signal);
        }
    }
    void views() {
        auto handle = rtv->GetCPUDescriptorHandleForHeapStart();
        const UINT size = device->GetDescriptorHandleIncrementSize(D3D12_DESCRIPTOR_HEAP_TYPE_RTV);
        for (UINT i = 0; i < buffers; ++i) {
            checked(swap->GetBuffer(i, IID_PPV_ARGS(&targets[i])), "DX12 back buffer");
            device->CreateRenderTargetView(targets[i].Get(), nullptr, handle);
            handles[i] = handle;
            handle.ptr += size;
        }
    }
    void allocate(D3D12_CPU_DESCRIPTOR_HANDLE *cpu, D3D12_GPU_DESCRIPTOR_HANDLE *gpu) {
        if (freeDescriptors.empty())
            throw DxError(E_OUTOFMEMORY, "DX12 descriptor heap exhausted");
        const UINT index = freeDescriptors.back();
        freeDescriptors.pop_back();
        *cpu = srv->GetCPUDescriptorHandleForHeapStart();
        *gpu = srv->GetGPUDescriptorHandleForHeapStart();
        cpu->ptr += static_cast<SIZE_T>(index) * descriptorSize;
        gpu->ptr += static_cast<UINT64>(index) * descriptorSize;
    }
    void release(D3D12_CPU_DESCRIPTOR_HANDLE cpu, D3D12_GPU_DESCRIPTOR_HANDLE gpu) {
        const auto offset = cpu.ptr - srv->GetCPUDescriptorHandleForHeapStart().ptr;
        const auto index = offset / descriptorSize;
        if (index >= 64 || offset % descriptorSize ||
            gpu.ptr != srv->GetGPUDescriptorHandleForHeapStart().ptr + index * descriptorSize)
            std::terminate();
        freeDescriptors.push_back(static_cast<UINT>(index));
    }

public:
    explicit Dx12(HWND hwnd) {
        createFactory();
        ComPtr<IDXGIAdapter1> adapter;
        for (UINT i = 0;; ++i) {
            ComPtr<IDXGIAdapter1> candidate;
            const auto result = factory->EnumAdapterByGpuPreference(
                i, DXGI_GPU_PREFERENCE_HIGH_PERFORMANCE, IID_PPV_ARGS(&candidate));
            if (result == DXGI_ERROR_NOT_FOUND)
                break;
            checked(result, "DX12 adapter");
            DXGI_ADAPTER_DESC1 desc{};
            checked(candidate->GetDesc1(&desc), "DX12 adapter description");
            if (desc.Flags & DXGI_ADAPTER_FLAG_SOFTWARE)
                continue;
            const auto capability =
                D3D12CreateDevice(candidate.Get(), D3D_FEATURE_LEVEL_11_0, IID_PPV_ARGS(&device));
            if (FAILED(capability) && capability != DXGI_ERROR_UNSUPPORTED &&
                capability != E_NOINTERFACE && capability != DXGI_ERROR_NOT_CURRENTLY_AVAILABLE &&
                capability != E_NOTIMPL)
                checked(capability, "DX12 device");
            if (SUCCEEDED(capability)) {
                adapter = candidate;
                info.adapter = utf8(desc.Description);
                break;
            }
        }
        if (!device)
            throw DxError(DXGI_ERROR_UNSUPPORTED, "DX12 device");
        info.renderer = "DX12";
        D3D12_COMMAND_QUEUE_DESC q{};
        q.Type = D3D12_COMMAND_LIST_TYPE_DIRECT;
        checked(device->CreateCommandQueue(&q, IID_PPV_ARGS(&queue)), "DX12 queue");
        D3D12_DESCRIPTOR_HEAP_DESC heap{};
        heap.Type = D3D12_DESCRIPTOR_HEAP_TYPE_RTV;
        heap.NumDescriptors = buffers;
        checked(device->CreateDescriptorHeap(&heap, IID_PPV_ARGS(&rtv)), "DX12 RTV heap");
        heap.Type = D3D12_DESCRIPTOR_HEAP_TYPE_CBV_SRV_UAV;
        heap.NumDescriptors = 64;
        heap.Flags = D3D12_DESCRIPTOR_HEAP_FLAG_SHADER_VISIBLE;
        checked(device->CreateDescriptorHeap(&heap, IID_PPV_ARGS(&srv)), "DX12 SRV heap");
        descriptorSize = device->GetDescriptorHandleIncrementSize(heap.Type);
        for (UINT i = 64; i > 0; --i)
            freeDescriptors.push_back(i - 1);
        for (auto &frame : frames)
            checked(device->CreateCommandAllocator(D3D12_COMMAND_LIST_TYPE_DIRECT,
                                                   IID_PPV_ARGS(&frame.allocator)),
                    "DX12 allocator");
        checked(device->CreateCommandList(0, D3D12_COMMAND_LIST_TYPE_DIRECT,
                                          frames[0].allocator.Get(), nullptr, IID_PPV_ARGS(&list)),
                "DX12 command list");
        checked(list->Close(), "DX12 list close");
        checked(device->CreateFence(0, D3D12_FENCE_FLAG_NONE, IID_PPV_ARGS(&fence)), "DX12 fence");
        event.reset(CreateEventW(nullptr, FALSE, FALSE, nullptr));
        if (!event)
            throw DxError(HRESULT_FROM_WIN32(GetLastError()), "DX12 event");
        createSwap(hwnd, queue.Get());
        views();
        ImGui_ImplDX12_InitInfo init{};
        init.Device = device.Get();
        init.CommandQueue = queue.Get();
        init.NumFramesInFlight = buffers;
        init.RTVFormat = format;
        init.SrvDescriptorHeap = srv.Get();
        init.UserData = this;
        init.SrvDescriptorAllocFn = [](ImGui_ImplDX12_InitInfo *i, D3D12_CPU_DESCRIPTOR_HANDLE *c,
                                       D3D12_GPU_DESCRIPTOR_HANDLE *g) {
            static_cast<Dx12 *>(i->UserData)->allocate(c, g);
        };
        init.SrvDescriptorFreeFn = [](ImGui_ImplDX12_InitInfo *i, D3D12_CPU_DESCRIPTOR_HANDLE c,
                                      D3D12_GPU_DESCRIPTOR_HANDLE g) {
            static_cast<Dx12 *>(i->UserData)->release(c, g);
        };
        if (!ImGui_ImplDX12_Init(&init))
            throw DxError(E_FAIL, "DX12 ImGui backend");
        backend = true;
    }
    ~Dx12() override {
        try {
            if (device && device->GetDeviceRemovedReason() == S_OK)
                idle();
        } catch (...) {
        }
        if (backend)
            ImGui_ImplDX12_Shutdown();
    }
    void newFrame() override { ImGui_ImplDX12_NewFrame(); }
    void render() override {
        waitFrame();
        const auto index = swap->GetCurrentBackBufferIndex();
        auto &frame = frames[index];
        wait(frame.fence);
        checked(frame.allocator->Reset(), "DX12 allocator reset");
        checked(list->Reset(frame.allocator.Get(), nullptr), "DX12 list reset");
        D3D12_RESOURCE_BARRIER barrier{};
        barrier.Type = D3D12_RESOURCE_BARRIER_TYPE_TRANSITION;
        barrier.Transition.pResource = targets[index].Get();
        barrier.Transition.Subresource = D3D12_RESOURCE_BARRIER_ALL_SUBRESOURCES;
        barrier.Transition.StateBefore = D3D12_RESOURCE_STATE_PRESENT;
        barrier.Transition.StateAfter = D3D12_RESOURCE_STATE_RENDER_TARGET;
        list->ResourceBarrier(1, &barrier);
        const float clear[] = {.98f, .98f, .98f, 1.f};
        list->ClearRenderTargetView(handles[index], clear, 0, nullptr);
        list->OMSetRenderTargets(1, &handles[index], FALSE, nullptr);
        auto *heap = srv.Get();
        list->SetDescriptorHeaps(1, &heap);
        ImGui_ImplDX12_RenderDrawData(ImGui::GetDrawData(), list.Get());
        std::swap(barrier.Transition.StateBefore, barrier.Transition.StateAfter);
        list->ResourceBarrier(1, &barrier);
        checked(list->Close(), "DX12 list close");
        ID3D12CommandList *lists[] = {list.Get()};
        queue->ExecuteCommandLists(1, lists);
        checked(queue->Signal(fence.Get(), ++signal), "DX12 frame signal");
        frame.fence = signal;
        present();
    }
    void resize(unsigned w, unsigned h) override {
        idle();
        for (auto &target : targets)
            target.Reset();
        checked(swap->ResizeBuffers(0, w, h, format,
                                    DXGI_SWAP_CHAIN_FLAG_FRAME_LATENCY_WAITABLE_OBJECT),
                "DX12 resize");
        views();
    }
};
} // namespace
std::unique_ptr<Graphics> createGraphics(HWND hwnd, const std::string &requested,
                                         bool allowSoftware, bool injectUnavailable) {
    if (requested == "dx11")
        return std::make_unique<Dx11>(hwnd, allowSoftware);
    try {
        if (injectUnavailable)
            throw DxError(DXGI_ERROR_UNSUPPORTED, "DX12 device");
        return std::make_unique<Dx12>(hwnd);
    } catch (const DxError &error) {
        const bool unavailable =
            error.code == DXGI_ERROR_UNSUPPORTED || error.code == E_NOINTERFACE ||
            error.code == DXGI_ERROR_NOT_CURRENTLY_AVAILABLE || error.code == E_NOTIMPL;
        if (requested != "auto" || !unavailable)
            throw;
        auto result = std::make_unique<Dx11>(hwnd, true);
        result->info.fallback = true;
        result->info.fallbackCode = error.code;
        return result;
    }
}
