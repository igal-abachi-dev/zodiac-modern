using System.Diagnostics;
using System.Drawing;
using FlaUI.Core.AutomationElements;
using FlaUI.Core.Definitions;
using FlaUI.UIA3;

/// <summary>Secondary (semantic) readiness endpoint for the UIA-capable candidates.</summary>
internal sealed class UiaState
{
    internal readonly object Gate = new();
    internal double? ReadyAt; internal int Polls; internal double MaxPollMs; internal string? Error; internal int ProviderGaps;
}

/// <summary>One launched candidate process with its run-owned process tree.</summary>
internal sealed class AppRun : IDisposable
{
    readonly Config config; readonly Duplicator duplicator;
    Process? host; IntPtr window;
    readonly Dictionary<int, DateTime> identities = new();
    readonly object gate = new(); volatile bool stopDiscovery, stopUia;
    Thread? discovery, uiaThread; UiaState? uia;
    [ThreadStatic] static UIA3Automation? automation;
    static UIA3Automation Automation => automation ??= new UIA3Automation { ConnectionTimeout = TimeSpan.FromSeconds(3), TransactionTimeout = TimeSpan.FromSeconds(3) };

    public AppRun(Config config, Duplicator duplicator) { this.config = config; this.duplicator = duplicator; }
    public double LaunchedAt { get; private set; }
    public IntPtr Window => window;
    public Process Host => host!;
    public IReadOnlyDictionary<int, DateTime> Identities { get { lock (gate) return new Dictionary<int, DateTime>(identities); } }

    public double Launch()
    {
        var info = new ProcessStartInfo(config.Runner) { UseShellExecute = false, CreateNoWindow = true, WorkingDirectory = Path.GetDirectoryName(config.Runner)! };
        foreach (var key in info.Environment.Keys.Where(k => k.StartsWith("WEBVIEW2_", StringComparison.OrdinalIgnoreCase)).ToArray()) info.Environment.Remove(key);
        foreach (var arg in config.Arguments) info.ArgumentList.Add(arg);
        double t0 = Program.Now(); LaunchedAt = t0;
        host = Process.Start(info) ?? throw new InvalidOperationException("Launch failed");
        _ = host.Handle;
        lock (gate) identities[host.Id] = host.StartTime.ToUniversalTime();
        discovery = new Thread(() =>
        {
            while (!stopDiscovery)
            {
                try { lock (gate) ProcessTree.Expand(identities, Native.Processes().Select(p => new ProcessTree.Edge((int)p.Pid, (int)p.Parent)), Created); } catch { }
                Thread.Sleep(100);
            }
        }) { IsBackground = true, Name = "process-discovery" };
        discovery.Start();
        return t0;
    }
    static DateTime? Created(int pid) { try { using var p = Process.GetProcessById(pid); return p.HasExited ? null : p.StartTime.ToUniversalTime(); } catch { return null; } }
    static bool Alive(int pid, DateTime created) { try { using var p = Process.GetProcessById(pid); return !p.HasExited && p.StartTime.ToUniversalTime() == created; } catch { return false; } }

    public double WaitWindow(int timeoutMs)
    {
        double end = Program.Now() + timeoutMs;
        while (Program.Now() < end)
        {
            window = Native.Window(host!.Id);
            if (window != IntPtr.Zero) return Program.Now();
            if (host.HasExited) throw new InvalidOperationException("Host exited before a window appeared");
            Thread.Sleep(2);
        }
        throw new TimeoutException("No NeutronStar window appeared");
    }

    /// <summary>Match the 960x640 DIP client area externally (as the six-host collector did) and aim the capture region.</summary>
    public void CalibrateClient(Dictionary<string, object?> result)
    {
        uint dpi = Native.GetDpiForWindow(window);
        Native.GetClientRect(window, out var client); Native.GetWindowRect(window, out var outer);
        int wantW = (int)(960 * dpi / 96), wantH = (int)(640 * dpi / 96);
        bool resized = client.Right != wantW || client.Bottom != wantH;
        if (resized) Native.SetWindowPos(window, IntPtr.Zero, 0, 0, outer.Right - outer.Left + wantW - client.Right, outer.Bottom - outer.Top + wantH - client.Bottom, 0x16);
        Native.GetClientRect(window, out var after);
        result["dpi"] = dpi; result["initialClientPixels"] = new { width = client.Right, height = client.Bottom };
        result["clientCalibration"] = new { resized, wantW, wantH, finalWidth = after.Right, finalHeight = after.Bottom };
        if (after.Right != wantW || after.Bottom != wantH) throw new InvalidOperationException("Client area mismatch after calibration");
        duplicator.SetRegion(Program.ClientScreenRect(window));
    }

    public void Foreground()
    {
        double end = Program.Now() + 3000; bool ok;
        do
        {
            if (config.Adapter != "none") { try { Automation.FromHandle(window).FrameworkAutomationElement.SetFocus(); } catch (System.Runtime.InteropServices.COMException) { } }
            ok = Native.Foreground(window); if (!ok) Thread.Sleep(50);
        } while (!ok && Program.Now() < end);
        if (!ok) throw new InvalidOperationException("Foreground activation deadline failed");
    }

    // ---- UIA readiness (secondary endpoint) -----------------------------------------------------------------
    public UiaState StartUiaPolling()
    {
        uia = new UiaState(); stopUia = false;
        uiaThread = new Thread(() =>
        {
            var automation = Automation; int failures = 0;
            while (!stopUia)
            {
                double began = Program.Now();
                try
                {
                    var root = automation.FromHandle(window);
                    bool ready = false, encrypt = false, decrypt = false;
                    foreach (AutomationElement e in root.FindAllDescendants(cf => cf.ByControlType(ControlType.Text).Or(cf.ByControlType(ControlType.Button))))
                    {
                        if (e.Properties.IsOffscreen.ValueOrDefault) continue;
                        string name = e.Properties.Name.ValueOrDefault ?? ""; bool enabled = e.Properties.IsEnabled.ValueOrDefault;
                        ready |= name == "Ready"; encrypt |= name == "Simulate encryption" && enabled; decrypt |= name == "Simulate decryption" && enabled;
                    }
                    double ended = Program.Now();
                    lock (uia.Gate) { uia.Polls++; uia.MaxPollMs = Math.Max(uia.MaxPollMs, ended - began); if (ready && encrypt && decrypt) uia.ReadyAt ??= ended; }
                    failures = 0;
                }
                catch (System.Runtime.InteropServices.COMException) { lock (uia.Gate) uia.ProviderGaps++; if (++failures >= 10) { uia.Error = "UIA provider failed repeatedly"; return; } }
                catch (FlaUI.Core.Exceptions.ElementNotAvailableException) { lock (uia.Gate) uia.ProviderGaps++; if (++failures >= 10) { uia.Error = "UIA element unavailable repeatedly"; return; } }
                Thread.Sleep(50);
            }
        }) { IsBackground = true, Name = "uia-readiness" };
        uiaThread.SetApartmentState(ApartmentState.MTA); uiaThread.Start();
        return uia;
    }
    public void StopUiaPolling() { stopUia = true; uiaThread?.Join(5000); }
    public double WaitUiaReady(int timeoutMs)
    {
        var state = StartUiaPolling(); double end = Program.Now() + timeoutMs;
        while (Program.Now() < end) { lock (state.Gate) { if (state.ReadyAt != null) { StopUiaPolling(); return state.ReadyAt.Value; } if (state.Error != null) throw new InvalidOperationException(state.Error); } Thread.Sleep(20); }
        StopUiaPolling(); throw new TimeoutException("UIA Ready not observed");
    }

    // ---- shutdown --------------------------------------------------------------------------------------------
    public void Close(Dictionary<string, object?> result)
    {
        stopUia = true;
        if (window != IntPtr.Zero) Native.PostMessageW(window, 0x10, IntPtr.Zero, IntPtr.Zero);
        bool exited = host == null || host.WaitForExit(30000);
        double deadline = Program.Now() + 30000;
        while (Program.Now() < deadline && Identities.Any(p => Alive(p.Key, p.Value))) Thread.Sleep(100);
        bool helpers = !Identities.Any(p => Alive(p.Key, p.Value));
        int? exitCode = null; try { if (host?.HasExited == true) exitCode = host.ExitCode; } catch (InvalidOperationException) { }
        result["hostExited"] = exited; result["helpersExited"] = helpers; result["hostExitCode"] = exitCode;
        result["processIdentities"] = Identities.Select(p => new { pid = p.Key, startUtc = p.Value }).ToArray();
        if (!exited || !helpers) result["cleanupFailure"] = "Run-owned processes did not exit; a forced kill is never counted as success";
        else if (exitCode != 0) result["cleanupFailure"] = "Host exit code nonzero or unavailable";
    }

    /// <summary>Failure path: record state and terminate only run-owned processes so the machine is left clean.</summary>
    public void Abort(Dictionary<string, object?> result)
    {
        stopUia = true;
        try { result["abortedProcesses"] = Identities.Where(p => Alive(p.Key, p.Value)).Select(p => p.Key).ToArray(); } catch { }
        foreach (var pair in Identities) { try { if (Alive(pair.Key, pair.Value)) { using var p = Process.GetProcessById(pair.Key); p.Kill(); } } catch { } }
    }

    public void Dispose() { stopDiscovery = true; stopUia = true; host?.Dispose(); }
}
