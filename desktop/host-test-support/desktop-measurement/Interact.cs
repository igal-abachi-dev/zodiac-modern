using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;
using FlaUI.Core.AutomationElements;
using FlaUI.Core.Definitions;
using FlaUI.UIA3;

/// <summary>
/// Locates controls and injects real pointer/keyboard input. UIA apps are resolved through their accessibility tree
/// (the same lookups the correctness checker uses); Dear ImGui has no provider, so it uses frozen client coordinates
/// recorded once from the read-only probe build (the `targets` scenario).
/// </summary>
internal sealed class Driver
{
    readonly Config config; readonly AppRun run; readonly string kind;
    readonly Dictionary<string, Dictionary<string, double[]>>? targets;
    [ThreadStatic] static UIA3Automation? automation;
    static UIA3Automation Automation => automation ??= new UIA3Automation { ConnectionTimeout = TimeSpan.FromSeconds(3), TransactionTimeout = TimeSpan.FromSeconds(3) };

    public Driver(Config config, AppRun run)
    {
        this.config = config; this.run = run;
        kind = config.Adapter == "none" ? "none" : config.Variant switch { "wx" => "wx", "flutter" => "flutter", "rnw" => "rnw", "tauri" or "electron" => "webview", _ => "native" };
        if (kind == "none")
            targets = JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, double[]>>>(File.ReadAllText(config.Targets ?? throw new InvalidOperationException("ImGui targets file required")))!;
    }
    public string Kind => kind;

    AutomationElement? Document()
    {
        var root = Automation.FromHandle(run.Window);
        if (kind == "wx")
        {
            var dialog = Automation.GetDesktop().FindFirstChild(cf => cf.ByProcessId(root.Properties.ProcessId.Value).And(cf.ByName("About this test")));
            if (dialog != null) return dialog;
            var work = root.FindFirstChild(cf => cf.ByAutomationId("6000"));
            return work?.Properties.IsOffscreen.ValueOrDefault == false ? work : root;
        }
        if (kind == "flutter") return root.FindFirstChild(cf => cf.ByControlType(ControlType.Pane));
        if (kind == "native" || kind == "rnw") return root;
        return root.FindFirstDescendant(cf => cf.ByControlType(ControlType.Document));
    }
    AutomationElement? Named(string name, ControlType type)
    {
        var document = Document();
        if (kind == "wx" && document?.Properties.AutomationId.ValueOrDefault == "6000") return document.FindFirstChild(cf => cf.ByName(name).And(cf.ByControlType(type)));
        if (kind is "native" or "rnw" && name == "Close") return document?.FindFirstDescendant(cf => cf.ByAutomationId("about-close")) ?? document?.FindFirstDescendant(cf => cf.ByAutomationId("CloseButton"))
            ?? document?.FindFirstDescendant(cf => cf.ByName(name).And(cf.ByControlType(type)));
        return document?.FindFirstDescendant(cf => cf.ByName(name).And(cf.ByControlType(type)));
    }

    /// <summary>Screen coordinates of a control's centre. Lookup cost is outside every timed interval.</summary>
    readonly Dictionary<string, (int X, int Y)> cache = new();
    /// <summary>React Native Windows only: its workbench toolbar does not scroll, and a 10k-row accessibility tree exceeds UIA timeouts, so positions are resolved once while the list is small. Other toolkits scroll the page, so they are resolved live.</summary>
    public void Prefetch(string page, params (string Name, ControlType Type)[] items) { if (kind != "rnw") return; foreach (var item in items) cache[page + "|" + item.Name] = LocateUncached(item.Name, item.Type, page); }
    public (int X, int Y) Locate(string name, ControlType type, string page) => cache.TryGetValue(page + "|" + name, out var hit) ? hit : LocateUncached(name, type, page);
    (int X, int Y) LocateUncached(string name, ControlType type, string page)
    {
        if (kind == "none")
        {
            if (!targets!.TryGetValue(page, out var map) || !map.TryGetValue(name, out var t)) throw new InvalidOperationException($"No frozen target '{name}' on page '{page}'");
            var p = new Native.Point { X = (int)(t[0] + t[2] / 2), Y = (int)(t[1] + t[3] / 2) };
            Native.ClientToScreen(run.Window, ref p); return (p.X, p.Y);
        }
        double end = Program.Now() + 10000; string last = "not found";
        while (Program.Now() < end)
        {
            try
            {
                var e = Named(name, type);
                if (e != null && e.Properties.IsEnabled.ValueOrDefault)
                {
                    if (e.Patterns.ScrollItem.IsSupported) { e.Patterns.ScrollItem.Pattern.ScrollIntoView(); Thread.Sleep(75); }
                    var r = e.Properties.BoundingRectangle.Value;
                    if (!e.Properties.IsOffscreen.ValueOrDefault && r.Width >= 1 && r.Height >= 1) return ((int)(r.X + r.Width / 2), (int)(r.Y + r.Height / 2));
                    last = "offscreen";
                }
                else if (e != null) last = "disabled";
            }
            catch (COMException) { last = "provider error"; }
            catch (FlaUI.Core.Exceptions.ElementNotAvailableException) { last = "element unavailable"; }
            catch (TimeoutException) { last = "uia timeout"; }
            catch (System.ComponentModel.Win32Exception) { last = "uia win32 timeout"; }
            Thread.Sleep(20);
        }
        throw new InvalidOperationException($"Target '{name}' unavailable ({last})");
    }

    public void MoveTo((int X, int Y) p) { if (!Native.Foreground(run.Window)) throw new InvalidOperationException("Foreground lost"); Native.SetCursorPos(p.X, p.Y); }

    /// <summary>Press and release the left button. Returns the QPC time taken immediately before SendInput.</summary>
    public double Press()
    {
        var inputs = new[] { new Native.Input { Mouse = new Native.MouseInput { Flags = 2 } }, new Native.Input { Mouse = new Native.MouseInput { Flags = 4 } } };
        double t = Program.Now();
        if (Native.SendInput(2, inputs, Marshal.SizeOf<Native.Input>()) != 2) throw new InvalidOperationException("Pointer input failed");
        return t;
    }

    /// <summary>Button-down only (untimed). The timed event is the later <see cref="Up"/>, so the pressed-style frame is not mistaken for the app's response.</summary>
    public void Down() { if (Native.SendInput(1, new[] { new Native.Input { Mouse = new Native.MouseInput { Flags = 2 } } }, Marshal.SizeOf<Native.Input>()) != 1) throw new InvalidOperationException("Pointer input failed"); }
    public double Up() { double t = Program.Now(); if (Native.SendInput(1, new[] { new Native.Input { Mouse = new Native.MouseInput { Flags = 4 } } }, Marshal.SizeOf<Native.Input>()) != 1) throw new InvalidOperationException("Pointer input failed"); return t; }

    [StructLayout(LayoutKind.Sequential)] struct Key { public ushort Vk, Scan; public uint Flags, Time; public nuint Extra; }
    [StructLayout(LayoutKind.Explicit, Size = 40)] struct KeyInput { [FieldOffset(0)] public uint Type; [FieldOffset(8)] public Key Key; }
    [DllImport("user32.dll", EntryPoint = "SendInput")] static extern uint Keys(uint count, KeyInput[] input, int size);
    [DllImport("user32.dll")] static extern uint MapVirtualKeyW(uint code, uint type);
    static void Send(List<KeyInput> keys) { if (Keys((uint)keys.Count, keys.ToArray(), Marshal.SizeOf<KeyInput>()) != keys.Count) throw new InvalidOperationException("Keyboard input failed"); keys.Clear(); }
    static void Vk(List<KeyInput> keys, ushort vk, bool up = false) => keys.Add(new KeyInput { Type = 1, Key = new Key { Vk = vk, Scan = (ushort)MapVirtualKeyW(vk, 0), Flags = up ? 2u : 0u } });

    /// <summary>Select the whole filter text (untimed). Flutter and React Native Windows need the modifier delivered in separate batches.</summary>
    public void SelectAll()
    {
        var keys = new List<KeyInput>();
        if (kind is "flutter" or "rnw") { Vk(keys, 0xA2); Send(keys); Thread.Sleep(50); Vk(keys, 0x41); Vk(keys, 0x41, true); Send(keys); Thread.Sleep(50); Vk(keys, 0xA2, true); Send(keys); }
        else { Vk(keys, 0x11); Vk(keys, 0x41); Vk(keys, 0x41, true); Vk(keys, 0x11, true); Send(keys); }
        Thread.Sleep(80);
    }
    public double Backspace() { var keys = new List<KeyInput>(); Vk(keys, 8); Vk(keys, 8, true); double t = Program.Now(); Send(keys); return t; }
    public double TypeText(string text)
    {
        var keys = new List<KeyInput>();
        foreach (char ch in text) { keys.Add(new KeyInput { Type = 1, Key = new Key { Scan = ch, Flags = 4 } }); keys.Add(new KeyInput { Type = 1, Key = new Key { Scan = ch, Flags = 6 } }); }
        double t = Program.Now(); Send(keys); return t;
    }
}

internal static partial class Program
{
    static string OutputDir = ".";
    static bool WaitQuiet(Duplicator d, int quietMs, int maxMs)
    {
        double begin = Now(), quietSince = Now(); int seen = d.Count;
        while (Now() - quietSince < quietMs)
        {
            Thread.Sleep(10);
            if (d.Count != seen) { seen = d.Count; quietSince = Now(); }
            if (Now() - begin > maxMs) return false;
        }
        return true;
    }

    /// <summary>
    /// One timed interaction: wait until the window is quiet, clear frames, inject input, then record the first presented
    /// frame that changed the client region (first change) and, when asked, the last change before `quietMs` of silence (settled).
    /// </summary>
    static Dictionary<string, object?> Step(Duplicator d, string name, double launchedAt, Func<double> send, bool settle, int quietMs = 300, int timeoutMs = 10000, byte[]? expected = null, bool quietFirst = true, double limit = 0.05)
    {
        if (quietFirst && !WaitQuiet(d, 250, 5000)) throw new InvalidOperationException($"{name}: window not quiet before input");
        d.Clear();
        double t = send(); double deadline = t + timeoutMs;
        Frame? first = null, last = null; int count = 0;
        while (Now() < deadline)
        {
            var after = d.Snapshot().Where(f => f.PresentMs >= t).ToList();
            if (after.Count > 0)
            {
                first ??= after[0]; last = after[^1]; count = after.Count;
                if (!settle) break;
                if (Now() - last.PresentMs >= quietMs) break;
            }
            Thread.Sleep(5);
        }
        if (first == null) throw new InvalidOperationException($"{name}: no visible response within {timeoutMs} ms");
        if (settle && Now() - last!.PresentMs < quietMs) throw new InvalidOperationException($"{name}: window did not settle within {timeoutMs} ms");
        var row = new Dictionary<string, object?> { ["name"] = name, ["atMs"] = t - launchedAt, ["firstChangeMs"] = first.PresentMs - t, ["settledMs"] = settle ? last!.PresentMs - t : null, ["frames"] = count };
        if (expected != null) { double bad = BadFraction(last!.Grid, expected); row["badVsReference"] = bad; if (bad > limit) { d.SaveLastCrop(System.IO.Path.Combine(OutputDir, name + "-mismatch.png")); throw new InvalidOperationException($"{name}: final state differs from the Ready reference ({bad:P1} cells)"); } }
        return row;
    }

    static int Interact(Config config, Duplicator duplicator, Dictionary<string, object?> result)
    {
        var reference = Convert.FromBase64String(JsonDocument.Parse(File.ReadAllText(config.Reference!)).RootElement.GetProperty("grid").GetString()!);
        using var run = new AppRun(config, duplicator);
        try
        {
            var driver = new Driver(config, run); var steps = new List<Dictionary<string, object?>>(); result["steps"] = steps;
            Native.SetCursorPos(duplicator.OutputBounds.Right - 5, duplicator.OutputBounds.Bottom - 5);
            double t0 = run.Launch(); run.WaitWindow(30000); run.CalibrateClient(result); run.Foreground();
            Native.SetCursorPos(duplicator.OutputBounds.Right - 5, duplicator.OutputBounds.Bottom - 5);
            duplicator.StoreThreshold = 0.002f; duplicator.KeepCrop(true); OutputDir = config.Output;
            if (config.Adapter == "none") Thread.Sleep(config.ReferenceWaitMs > 0 ? config.ReferenceWaitMs : 6000); else run.WaitUiaReady(60000);
            if (!WaitQuiet(duplicator, 1500, 30000)) throw new TimeoutException("Window never settled before interaction");
            string shots = config.Output;
            void Shot(string file) { Thread.Sleep(200); duplicator.SaveLastCrop(Path.Combine(shots, file)); }

            Dictionary<string, object?> Click(string name, ControlType type, string page, bool settle, int quiet = 300, bool verify = false, string? label = null, bool live = false)
            {
                var p = driver.Locate(name, type, page); driver.MoveTo(p); Thread.Sleep(100);
                // `live` targets (Cancel) exist only while an animation runs, so they cannot wait for the window to go quiet.
                if (!live && !WaitQuiet(duplicator, 250, 5000)) throw new InvalidOperationException($"{label ?? name}: window not quiet before input");
                driver.Down(); Thread.Sleep(live ? 60 : 150);
                var row = Step(duplicator, label ?? name, t0, driver.Up, settle, quiet, 10000, verify ? reference : null, !live, label == "workbench-back" ? 0.5 : 0.05);
                steps.Add(row); return row;
            }
            Dictionary<string, object?> Keyed(string label, Func<double> send, int quiet = 500)
            { var row = Step(duplicator, label, t0, send, true, quiet); steps.Add(row); return row; }

            // ---- main-screen actions ------------------------------------------------------------------------
            Click("About this test", ControlType.Button, "main", true, 300, false, "about-open"); Shot("about.png");
            Click("Close", ControlType.Button, "about", true, 300, false, "about-close");
            Click("Simulate decryption", ControlType.Button, "main", false, 300, false, "decrypt-start"); Thread.Sleep(400);
            Click("Cancel", ControlType.Button, "running", true, 300, false, "decrypt-cancel", true);
            Click("Reset", ControlType.Button, "canceled", true, 300, true, "reset-after-cancel");
            Click("Simulate encryption", ControlType.Button, "main", false, 300, false, "encrypt-start");
            { double began = Now(); if (!WaitQuiet(duplicator, 800, 40000)) throw new InvalidOperationException("Encryption simulation never finished"); var lastFrame = duplicator.Latest; steps[^1]["completeMs"] = lastFrame == null ? null : lastFrame.PresentMs - (t0 + (double)steps[^1]["atMs"]!); }
            Click("Reset", ControlType.Button, "complete", true, 300, true, "reset-after-complete");

            // ---- workbench list workload --------------------------------------------------------------------
            Click("Open workbench", ControlType.Button, "main", true, 500, false, "workbench-open"); Thread.Sleep(1000); Shot("workbench.png");
            driver.Prefetch("workbench", ("10,000 rows", ControlType.Button), ("1,000 rows", ControlType.Button), ("Reverse", ControlType.Button), ("Splice 10", ControlType.Button), ("Update 10%", ControlType.Button),
                ("Filter synthetic rows", ControlType.Edit), ("Remount workload", ControlType.Button), ("Back to main screen", ControlType.Button));
            Click("10,000 rows", ControlType.Button, "workbench", true, 500, false, "rows-10000");
            Click("1,000 rows", ControlType.Button, "workbench", true, 500, false, "rows-1000");
            Click("Reverse", ControlType.Button, "workbench", true, 500, false, "reverse");
            Click("Splice 10", ControlType.Button, "workbench", true, 500, false, "splice-10");
            Click("Update 10%", ControlType.Button, "workbench", true, 500, false, "update-10-percent");
            { var p = driver.Locate("Filter synthetic rows", ControlType.Edit, "workbench"); driver.MoveTo(p); Thread.Sleep(100); driver.Press(); Thread.Sleep(300); }
            Keyed("filter-to-one", () => driver.TypeText("row-12000 "));
            driver.SelectAll();
            Keyed("filter-clear", driver.Backspace, 400);
            Click("Remount workload", ControlType.Button, "workbench", true, 400, false, "remount");
            Click("Back to main screen", ControlType.Button, "workbench", true, 400, true, "workbench-back");

            result["driver"] = driver.Kind; result["steps"] = steps; result["frameStoreThreshold"] = duplicator.StoreThreshold;
            run.Close(result);
            result["status"] = result.TryGetValue("cleanupFailure", out var failure) && failure != null ? "failed" : "passed";
            return (string)result["status"]! == "passed" ? 0 : 1;
        }
        catch { run.Abort(result); throw; }
    }

    /// <summary>One-off for Dear ImGui: record widget positions from the read-only probe build (page by page) as frozen client coordinates.</summary>
    static int Targets(Config config, Duplicator duplicator, Dictionary<string, object?> result)
    {
        string snapshot = Path.Combine(config.Output, "probe.json");
        var probeConfig = config with { Arguments = config.Arguments.Concat(new[] { "--probe", snapshot }).ToArray() };
        using var run = new AppRun(probeConfig, duplicator);
        JsonElement current = default;
        JsonElement Read()
        {
            try
            {
                using var stream = new FileStream(snapshot, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete); using var document = JsonDocument.Parse(stream);
                var root = document.RootElement;
                return root.TryGetProperty("endFrame", out var end) && end.GetUInt64() == root.GetProperty("frames").GetUInt64() ? root.Clone() : default;
            }
            catch (IOException) { return default; }
            catch (JsonException) { return default; }
        }
        void Wait(Func<bool> predicate, string label)
        {
            double end = Now() + 20000;
            while (true) { current = Read(); if (current.ValueKind == JsonValueKind.Object && predicate()) return; if (Now() > end) throw new TimeoutException(label); Thread.Sleep(15); }
        }
        JsonElement? Widget(string name) { foreach (var w in current.GetProperty("widgets").EnumerateArray()) if (w.GetProperty("name").GetString() == name) return w; return null; }
        bool Usable(string name) => Widget(name) is JsonElement w && w.GetProperty("visible").GetBoolean() && w.GetProperty("enabled").GetBoolean();
        var table = new Dictionary<string, Dictionary<string, double[]>>();
        void Capture(string page)
        {
            var map = new Dictionary<string, double[]>();
            foreach (var w in current.GetProperty("widgets").EnumerateArray()) if (w.GetProperty("visible").GetBoolean()) map[w.GetProperty("name").GetString()!] = new[] { w.GetProperty("x").GetDouble(), w.GetProperty("y").GetDouble(), w.GetProperty("w").GetDouble(), w.GetProperty("h").GetDouble() };
            table[page] = map;
        }
        void ClickWidget(string name)
        {
            Wait(() => Usable(name), "target " + name); var w = Widget(name)!.Value;
            var p = new Native.Point { X = (int)(w.GetProperty("x").GetDouble() + w.GetProperty("w").GetDouble() / 2), Y = (int)(w.GetProperty("y").GetDouble() + w.GetProperty("h").GetDouble() / 2) };
            Native.ClientToScreen(run.Window, ref p); Native.SetCursorPos(p.X, p.Y); Thread.Sleep(70);
            Native.SendInput(1, new[] { new Native.Input { Mouse = new Native.MouseInput { Flags = 2 } } }, Marshal.SizeOf<Native.Input>()); Thread.Sleep(40);
            Native.SendInput(1, new[] { new Native.Input { Mouse = new Native.MouseInput { Flags = 4 } } }, Marshal.SizeOf<Native.Input>()); Thread.Sleep(150);
        }
        try
        {
            run.Launch(); run.WaitWindow(30000); run.CalibrateClient(result); run.Foreground();
            Wait(() => current.GetProperty("ready").GetBoolean(), "ready"); Thread.Sleep(500); current = Read(); Capture("main");
            ClickWidget("About this test"); Wait(() => current.GetProperty("about").GetBoolean() && Widget("Close") != null, "about"); Thread.Sleep(300); current = Read(); Capture("about");
            ClickWidget("Close"); Wait(() => !current.GetProperty("about").GetBoolean(), "about closed");
            ClickWidget("Simulate decryption"); Wait(() => current.GetProperty("phase").GetInt32() == 1 && Usable("Cancel"), "running"); Capture("running");
            ClickWidget("Cancel"); Wait(() => Usable("Reset"), "canceled"); Capture("canceled");
            ClickWidget("Reset"); Wait(() => Usable("Simulate decryption"), "reset");
            ClickWidget("Simulate encryption"); Wait(() => current.GetProperty("phase").GetInt32() == 2 && current.GetProperty("progress").GetInt32() == 100, "complete"); Thread.Sleep(300); current = Read(); Capture("complete");
            ClickWidget("Reset"); Wait(() => Usable("Simulate decryption"), "reset 2");
            ClickWidget("Open workbench"); Wait(() => current.GetProperty("page").GetString() == "workbench" && Usable("Remount workload"), "workbench"); Thread.Sleep(500); current = Read(); Capture("workbench");
            ClickWidget("Back to main screen"); Wait(() => current.GetProperty("page").GetString() == "main", "back");
            Save(config.Reference!, table); result["pages"] = table.Keys.ToArray();
            run.Close(result);
            result["status"] = result.TryGetValue("cleanupFailure", out var failure) && failure != null ? "failed" : "passed";
            return (string)result["status"]! == "passed" ? 0 : 1;
        }
        catch { run.Abort(result); throw; }
    }
}
