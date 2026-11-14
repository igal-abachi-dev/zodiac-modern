using System.Diagnostics;
using System.Drawing;
using System.Runtime.InteropServices;

/// <summary>Per-process GPU engine utilization and GPU memory from PDH (secondary; null when unavailable).</summary>
internal sealed class GpuCounters : IDisposable
{
    IntPtr query, engine, dedicated, shared;
    public bool Available { get; }
    public GpuCounters()
    {
        try
        {
            if (Native.PdhOpenQueryW(null, UIntPtr.Zero, out query) != 0) return;
            if (Native.PdhAddEnglishCounterW(query, @"\GPU Engine(*)\Utilization Percentage", UIntPtr.Zero, out engine) != 0) return;
            if (Native.PdhAddEnglishCounterW(query, @"\GPU Process Memory(*)\Dedicated Usage", UIntPtr.Zero, out dedicated) != 0) return;
            if (Native.PdhAddEnglishCounterW(query, @"\GPU Process Memory(*)\Shared Usage", UIntPtr.Zero, out shared) != 0) return;
            Native.PdhCollectQueryData(query); Available = true;
        }
        catch { Available = false; }
    }
    static Dictionary<string, double> Read(IntPtr counter)
    {
        var values = new Dictionary<string, double>(); uint size = 0;
        uint code = Native.PdhGetFormattedCounterArrayW(counter, 0x200, ref size, out _, IntPtr.Zero);
        if ((code != 0x800007D2 && code != 0) || size == 0) return values;
        IntPtr memory = Marshal.AllocHGlobal((int)size);
        try
        {
            if (Native.PdhGetFormattedCounterArrayW(counter, 0x200, ref size, out uint count, memory) != 0) return values;
            int stride = Marshal.SizeOf<Native.CounterItem>();
            for (int i = 0; i < count; i++)
            {
                var item = Marshal.PtrToStructure<Native.CounterItem>(IntPtr.Add(memory, i * stride));
                if (item.Value.Status <= 1) values[Marshal.PtrToStringUni(item.Name)!] = values.GetValueOrDefault(Marshal.PtrToStringUni(item.Name)!) + item.Value.Value;
            }
        }
        finally { Marshal.FreeHGlobal(memory); }
        return values;
    }
    static bool Owns(string instance, HashSet<int> pids)
    {   // instance names look like "pid_1234_luid_0x..._phys_0_eng_0_engtype_3D" or "pid_1234_luid_..._phys_0"
        if (!instance.StartsWith("pid_", StringComparison.Ordinal)) return false;
        int end = instance.IndexOf('_', 4); return end > 4 && int.TryParse(instance.AsSpan(4, end - 4), out int pid) && pids.Contains(pid);
    }
    public object? Sample(IEnumerable<int> pids)
    {
        if (!Available) return null;
        var set = pids.ToHashSet();
        if (Native.PdhCollectQueryData(query) != 0) return null;
        double engineSum = Read(engine).Where(p => Owns(p.Key, set)).Sum(p => p.Value);
        double dedicatedBytes = Read(dedicated).Where(p => Owns(p.Key, set)).Sum(p => p.Value);
        double sharedBytes = Read(shared).Where(p => Owns(p.Key, set)).Sum(p => p.Value);
        return new { engineUtilizationPercentSum = engineSum, dedicatedBytes, sharedBytes };
    }
    public void Dispose() { if (query != IntPtr.Zero) { Native.PdhCloseQuery(query); query = IntPtr.Zero; } }
}

internal static partial class Program
{
    static object ResourceSample(AppRun run, PrivateWorkingSet pdh, GpuCounters gpu, string state, double t0)
    {
        double began = Now(); var privateWs = pdh.Sample(); var rows = new List<object>(); long privateTotal = 0, workingTotal = 0, residentTotal = 0; double cpu = 0; bool complete = true;
        var live = new List<int>();
        foreach (var pair in run.Identities)
            try
            {
                using var process = Process.GetProcessById(pair.Key);
                if (process.HasExited || process.StartTime.ToUniversalTime() != pair.Value) continue;
                var memory = new Native.Memory { Size = (uint)Marshal.SizeOf<Native.Memory>() };
                if (!Native.GetProcessMemoryInfo(process.Handle, ref memory, memory.Size)) throw new InvalidOperationException("GetProcessMemoryInfo failed");
                long resident = privateWs.TryGetValue(pair.Key, out long value) ? value : -1; if (resident < 0) complete = false;
                double seconds = process.TotalProcessorTime.TotalSeconds;
                privateTotal += (long)memory.Private.ToUInt64(); workingTotal += (long)memory.WorkingSet.ToUInt64(); cpu += seconds; if (resident >= 0) residentTotal += resident;
                live.Add(pair.Key);
                rows.Add(new { pid = pair.Key, name = process.ProcessName, startUtc = pair.Value, privateBytes = memory.Private.ToUInt64(), workingSetBytes = memory.WorkingSet.ToUInt64(), privateWorkingSetBytes = resident < 0 ? (long?)null : resident, cpuSeconds = seconds });
            }
            catch { complete = false; }
        return new { atMs = began - t0, state, processes = rows, privateBytes = privateTotal, totalWorkingSetBytes = workingTotal, privateWorkingSetBytes = complete ? (long?)residentTotal : null, cpuSeconds = cpu, complete, gpu = gpu.Sample(live), collectionMs = Now() - began };
    }

    /// <summary>Visible/unfocused/occluded/minimized/restored idle states over one process lifetime (Latin-square order from the orchestrator).</summary>
    static int Idle(Config config, Duplicator duplicator, Dictionary<string, object?> result)
    {
        using var run = new AppRun(config, duplicator); using var pdh = new PrivateWorkingSet(); using var gpu = new GpuCounters();
        try
        {
            pdh.Sample();
            Native.SetCursorPos(duplicator.OutputBounds.Right - 5, duplicator.OutputBounds.Bottom - 5);
            double t0 = run.Launch(); run.WaitWindow(30000); run.CalibrateClient(result); run.Foreground();
            if (config.Adapter == "none") Thread.Sleep(6000); else run.WaitUiaReady(60000);
            Thread.Sleep(2000);                                  // settle before the first measured state
            var samples = new List<object>(); var window = run.Window;
            result["gpuCountersAvailable"] = gpu.Available;
            foreach (string state in config.IdleOrder ?? new[] { "visible", "unfocused", "occluded", "minimized", "restored" })
            {
                System.Windows.Forms.Form? anchor = null;
                if (state is "unfocused" or "occluded")
                {
                    Native.GetWindowRect(window, out var bounds);
                    var screen = System.Windows.Forms.Screen.FromHandle(window).WorkingArea;
                    var own = new Rectangle(bounds.Left, bounds.Top, bounds.Right - bounds.Left, bounds.Bottom - bounds.Top);
                    var region = state == "occluded" ? own : new Rectangle(screen.Right - 150, screen.Bottom - 70, 145, 60);
                    if (state == "unfocused" && region.IntersectsWith(own)) throw new InvalidOperationException("No unoccluded focus-anchor placement available");
                    anchor = new System.Windows.Forms.Form { Text = "NeutronStar measurement fixture", ShowInTaskbar = false, TopMost = state == "occluded", FormBorderStyle = System.Windows.Forms.FormBorderStyle.None, StartPosition = System.Windows.Forms.FormStartPosition.Manual, Bounds = region, BackColor = Color.DimGray };
                    anchor.Show(); System.Windows.Forms.Application.DoEvents();
                    if (!Native.Foreground(anchor.Handle)) throw new InvalidOperationException("Unable to activate owned focus fixture");
                }
                if (state == "minimized") Native.ShowWindow(window, 6);
                if (state == "restored") { Native.ShowWindow(window, 6); Thread.Sleep(500); Native.ShowWindow(window, 9); Native.Foreground(window); Thread.Sleep(500); }
                if (state == "visible") { Native.ShowWindow(window, 9); Native.Foreground(window); }
                Thread.Sleep(1000);
                for (int i = 0; i < config.IdleSeconds; i++) { samples.Add(ResourceSample(run, pdh, gpu, state, t0)); System.Windows.Forms.Application.DoEvents(); Thread.Sleep(1000); }
                if (anchor != null) { anchor.Close(); anchor.Dispose(); System.Windows.Forms.Application.DoEvents(); Native.Foreground(window); }
            }
            Save(Path.Combine(config.Output, "resources.json"), samples);
            run.Close(result);
            result["status"] = result.TryGetValue("cleanupFailure", out var failure) && failure != null ? "failed" : "passed";
            return (string)result["status"]! == "passed" ? 0 : 1;
        }
        catch { run.Abort(result); throw; }
    }
}
