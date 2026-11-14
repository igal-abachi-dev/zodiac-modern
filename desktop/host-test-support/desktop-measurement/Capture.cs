using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using Vortice.Direct3D;
using Vortice.Direct3D11;
using Vortice.DXGI;

/// <summary>A reduced frame: DWM present time (QPC milliseconds) plus an RGB grid of the client area.</summary>
internal sealed record Frame(double PresentMs, double ArrivedMs, byte[] Grid);

/// <summary>
/// Compositor-timestamped frames from DXGI Desktop Duplication. LastPresentTime is the QPC time at which the
/// desktop image was last presented, i.e. the same clock as Stopwatch.GetTimestamp. It is the compositor's
/// present time, not photon scan-out, and its resolution is bounded by the monitor refresh interval.
/// The duplicated output must show the window unoccluded; only the client rectangle is copied and reduced.
/// </summary>
internal sealed class Duplicator : IDisposable
{
    public const int GridW = 64, GridH = 40, Channels = 3;
    public const int GridBytes = GridW * GridH * Channels;
    static readonly double QpcMs = 1000.0 / Stopwatch.Frequency;

    readonly ID3D11Device device;
    readonly ID3D11DeviceContext context;
    IDXGIOutputDuplication duplication;
    readonly IDXGIOutput1 output1;
    /// <summary>Each DXGI access-loss and re-creation: when it happened and how long frames were unobservable.</summary>
    public readonly List<object> Reinits = new();
    readonly Thread thread;
    readonly object gate = new();
    readonly List<Frame> frames = new();
    volatile bool stop;
    volatile bool keepCrop;
    Rectangle region;               // desktop pixels of the output's coordinate space
    ID3D11Texture2D? staging; int stagingW, stagingH;
    byte[]? lastCrop; int lastCropW, lastCropH;
    public Rectangle OutputBounds { get; }
    public string Adapter { get; }
    public int RefreshHz { get; }
    public long Acquired, Dropped, CursorOnly;
    /// <summary>Mean absolute grid difference (0..255) that makes a region change worth keeping. Startup keeps 0.25; interaction scenarios lower it.</summary>
    public volatile float StoreThreshold = 0.25f;
    public string? Error;

    public Duplicator()
    {
        using var factory = DXGI.CreateDXGIFactory1<IDXGIFactory1>();
        IDXGIAdapter1? chosen = null; IDXGIOutput? output = null;
        for (uint a = 0; factory.EnumAdapters1(a, out var adapter).Success; a++)
        {
            if (adapter.EnumOutputs(0, out var o).Success) { chosen = adapter; output = o; break; }
            adapter.Dispose();
        }
        if (chosen == null || output == null) throw new InvalidOperationException("No adapter with an attached output");
        Adapter = chosen.Description1.Description;
        var bounds = output.Description.DesktopCoordinates;
        OutputBounds = new Rectangle(bounds.Left, bounds.Top, bounds.Right - bounds.Left, bounds.Bottom - bounds.Top);
        var result = D3D11.D3D11CreateDevice(chosen, DriverType.Unknown, DeviceCreationFlags.BgraSupport,
            new[] { FeatureLevel.Level_11_0 }, out device!, out context!);
        result.CheckError();
        output1 = output.QueryInterface<IDXGIOutput1>();
        duplication = output1.DuplicateOutput(device);
        RefreshHz = 0;
        thread = new Thread(Loop) { IsBackground = true, Name = "desktop-duplication", Priority = ThreadPriority.Highest };
        thread.Start();
    }

    /// <summary>Set the client rectangle (screen pixels) whose frames are reduced.</summary>
    public void SetRegion(Rectangle screenRect)
    {
        var local = Rectangle.Intersect(new Rectangle(screenRect.X - OutputBounds.X, screenRect.Y - OutputBounds.Y, screenRect.Width, screenRect.Height),
            new Rectangle(0, 0, OutputBounds.Width, OutputBounds.Height));
        lock (gate) { region = local; }
    }
    public void KeepCrop(bool on) => keepCrop = on;

    public List<Frame> Snapshot() { lock (gate) return new List<Frame>(frames); }
    public int Count { get { lock (gate) return frames.Count; } }
    public Frame? Latest { get { lock (gate) return frames.Count == 0 ? null : frames[^1]; } }
    public void Clear() { lock (gate) frames.Clear(); }

    public bool SaveLastCrop(string path)
    {
        byte[]? copy; int w, h;
        lock (gate) { copy = lastCrop; w = lastCropW; h = lastCropH; }
        if (copy == null) return false;
        using var bmp = new Bitmap(w, h, PixelFormat.Format32bppRgb);
        var data = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppRgb);
        for (int y = 0; y < h; y++) Marshal.Copy(copy, y * w * 4, data.Scan0 + y * data.Stride, w * 4);
        bmp.UnlockBits(data); bmp.Save(path, ImageFormat.Png); return true;
    }

    void Loop()
    {
        try
        {
            while (!stop)
            {
                var r = duplication.AcquireNextFrame(50, out var info, out var resource);
                if (!r.Success)
                {
                    if (r == Vortice.DXGI.ResultCode.WaitTimeout) continue;
                    if (r == Vortice.DXGI.ResultCode.AccessLost) { Reinitialize(); continue; }
                    throw new InvalidOperationException("AcquireNextFrame failed: " + r.Code.ToString("X"));
                }
                double arrived = Stopwatch.GetTimestamp() * QpcMs;
                try
                {
                    Acquired++;
                    if (info.LastPresentTime == 0) { CursorOnly++; continue; }   // pointer-only update
                    Rectangle rect; lock (gate) rect = region;
                    if (rect.Width < 8 || rect.Height < 8) continue;
                    using var texture = resource!.QueryInterface<ID3D11Texture2D>();
                    var grid = Reduce(texture, rect);
                    double present = info.LastPresentTime * QpcMs;
                    // The duplication reports a present for ANY desktop change (clock, other windows). Keep a frame only
                    // when the client region itself changed, so "no new frame" means "this window is quiet".
                    lock (gate)
                    {
                        if (frames.Count == 0 || Diff(frames[^1].Grid, grid) > StoreThreshold) frames.Add(new Frame(present, arrived, grid));
                    }
                }
                finally { resource?.Dispose(); duplication.ReleaseFrame(); }
            }
        }
        catch (Exception e) { Error = e.GetType().Name + ": " + e.Message; }
    }

    /// <summary>
    /// DXGI invalidates a duplication when the desktop composition changes (e.g. a window switching presentation
    /// mode). Re-create it; the new session starts with the current desktop image. The unobservable gap is recorded.
    /// </summary>
    void Reinitialize()
    {
        double lost = Stopwatch.GetTimestamp() * QpcMs, deadline = lost + 5000; Exception? last = null;
        duplication.Dispose();
        while (!stop && Stopwatch.GetTimestamp() * QpcMs < deadline)
        {
            try
            {
                duplication = output1.DuplicateOutput(device);
                double back = Stopwatch.GetTimestamp() * QpcMs;
                lock (gate) Reinits.Add(new { lostAtMs = lost, recoveredAfterMs = back - lost });
                return;
            }
            catch (Exception e) { last = e; Thread.Sleep(10); }
        }
        throw new InvalidOperationException("Desktop duplication could not be re-created: " + last?.Message);
    }

    byte[] Reduce(ID3D11Texture2D desktop, Rectangle rect)
    {
        if (staging == null || stagingW != rect.Width || stagingH != rect.Height)
        {
            staging?.Dispose();
            staging = device.CreateTexture2D(new Texture2DDescription
            {
                Width = (uint)rect.Width, Height = (uint)rect.Height, MipLevels = 1, ArraySize = 1,
                Format = Format.B8G8R8A8_UNorm, SampleDescription = new SampleDescription(1, 0),
                Usage = ResourceUsage.Staging, CPUAccessFlags = CpuAccessFlags.Read,
            });
            stagingW = rect.Width; stagingH = rect.Height;
        }
        context.CopySubresourceRegion(staging, 0, 0, 0, 0, desktop, 0, new Vortice.Mathematics.Box(rect.Left, rect.Top, 0, rect.Right, rect.Bottom, 1));
        var map = context.Map(staging, 0, MapMode.Read, Vortice.Direct3D11.MapFlags.None);
        try
        {
            var grid = new byte[GridBytes];
            var sum = new int[GridBytes]; var count = new int[GridW * GridH];
            unsafe
            {
                byte* basePtr = (byte*)map.DataPointer;
                for (int y = 0; y < rect.Height; y += 4)
                {
                    byte* row = basePtr + (long)y * map.RowPitch; int gy = Math.Min(GridH - 1, y * GridH / rect.Height);
                    for (int x = 0; x < rect.Width; x += 4)
                    {
                        int gx = Math.Min(GridW - 1, x * GridW / rect.Width), cell = gy * GridW + gx;
                        byte* px = row + x * 4; int i = cell * Channels;
                        sum[i] += px[2]; sum[i + 1] += px[1]; sum[i + 2] += px[0]; count[cell]++;
                    }
                }
                if (keepCrop)
                {
                    var crop = new byte[rect.Width * rect.Height * 4];
                    for (int y = 0; y < rect.Height; y++) Marshal.Copy((IntPtr)(basePtr + (long)y * map.RowPitch), crop, y * rect.Width * 4, rect.Width * 4);
                    lock (gate) { lastCrop = crop; lastCropW = rect.Width; lastCropH = rect.Height; }
                }
            }
            for (int c = 0; c < GridW * GridH; c++) for (int k = 0; k < Channels; k++) grid[c * Channels + k] = (byte)(count[c] == 0 ? 0 : sum[c * Channels + k] / count[c]);
            return grid;
        }
        finally { context.Unmap(staging, 0); }
    }

    /// <summary>Mean absolute per-channel difference (0..255) between two grids.</summary>
    public static double Diff(byte[] a, byte[] b)
    {
        long total = 0; for (int i = 0; i < a.Length; i++) total += Math.Abs(a[i] - b[i]);
        return (double)total / a.Length;
    }

    public void Dispose()
    {
        stop = true; thread.Join(2000);
        duplication.Dispose(); output1.Dispose(); staging?.Dispose(); context.Dispose(); device.Dispose();
    }
}
