using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using FlaUI.UIA3;
using FlaUI.Core.AutomationElements;
using FlaUI.Core.Definitions;
using FlaUI.Core.Input;
using FlaUI.Core.WindowsAPI;

if(args.Length < 3) { Console.Error.WriteLine("UIA3Probe <exe> <profile> <report.json> [extra application args...]"); return 2; }
Native.SetProcessDpiAwarenessContext(-4);
using var automation = new UIA3Automation { ConnectionTimeout = TimeSpan.FromSeconds(3), TransactionTimeout = TimeSpan.FromSeconds(3) };
var start = new ProcessStartInfo(Path.GetFullPath(args[0])) { UseShellExecute = false, WorkingDirectory = Path.GetDirectoryName(Path.GetFullPath(args[0]))! };
foreach (var key in start.Environment.Keys.Where(k => k.StartsWith("WEBVIEW2_", StringComparison.OrdinalIgnoreCase)).ToArray()) start.Environment.Remove(key);
start.ArgumentList.Add("--profile"); start.ArgumentList.Add(Path.GetFullPath(args[1]));
foreach(var argument in args.Skip(3)) start.ArgumentList.Add(argument);
using var process = Process.Start(start) ?? throw new Exception("Launch failed");
nint hwnd = 0;
var names = new List<string>();
var windows = new List<string>();
var ready = false;
var passed = false;
string? failure = null;
var steps = new List<string>();
AutomationElement Until(Func<AutomationElement?> query, string label)
{
    var timer = Stopwatch.StartNew();
    while (timer.Elapsed < TimeSpan.FromSeconds(30))
    {
        if (process.HasExited) throw new InvalidOperationException("Host exited before " + label);
        try { if (query() is { } element) return element; }
        catch (COMException) { }
        Thread.Sleep(50);
    }
    throw new InvalidOperationException("Timed out: " + label);
}
AutomationElement Named(AutomationElement root, string name, bool button = false) =>
    Until(() => root.FindAllDescendants(cf => cf.ByName(name)).FirstOrDefault(e =>
        !e.Properties.IsOffscreen.ValueOrDefault && (!button || e.Properties.ControlType.ValueOrDefault == ControlType.Button)), name);
void Click(AutomationElement document, string name)
{
    var button = Named(document, name, true);
    Until(() => button.Properties.IsEnabled.ValueOrDefault ? button : null, "enabled " + name);
    Until(() => Native.Foreground(hwnd) ? button : null, "foreground");
    var rect = button.Properties.BoundingRectangle.Value;
    if (rect.Width < 1 || rect.Height < 1 || !Native.SetCursorPos((int)(rect.X + rect.Width / 2), (int)(rect.Y + rect.Height / 2)))
        throw new InvalidOperationException("Invalid button bounds");
    var input = new[] { new Native.Input { Mouse = new Native.MouseInput { Flags = 2 } }, new Native.Input { Mouse = new Native.MouseInput { Flags = 4 } } };
    if (Native.SendInput(2, input, Marshal.SizeOf<Native.Input>()) != 2) throw new InvalidOperationException("Input dispatch failed");
}
try
{
    var clock = Stopwatch.StartNew();
    while (!process.HasExited && clock.Elapsed < TimeSpan.FromSeconds(25))
    {
        Native.EnumWindows((w, _) => {
            Native.GetWindowThreadProcessId(w, out var owner);
            if (owner != process.Id) return true;
            var title = new StringBuilder(256); Native.GetWindowTextW(w, title, title.Capacity);
            var className = new StringBuilder(256); Native.GetClassNameW(w, className, className.Capacity);
            var summary = $"{w}:visible={Native.IsWindowVisible(w)}:{className}:{title}";
            if(!windows.Contains(summary)) windows.Add(summary);
            if (Native.IsWindowVisible(w) && title.ToString().StartsWith("NeutronStar", StringComparison.Ordinal)) hwnd = w;
            return true;
        }, 0);
        if (hwnd != 0)
        {
            try
            {
                var root = automation.FromHandle(hwnd);
                var elements = root.FindAllDescendants();
                names = elements.Take(120).Select(e => $"{e.Properties.ControlType.ValueOrDefault}: {e.Properties.Name.ValueOrDefault}").ToList();
                ready = elements.Any(e => e.Properties.Name.ValueOrDefault == "Ready" && !e.Properties.IsOffscreen.ValueOrDefault);
                if (ready) break;
            }
            catch (COMException) { }
        }
        Thread.Sleep(200);
    }
    if (!ready) throw new InvalidOperationException("Timed out: UIA3 Ready");
    steps.Add("Ready");
    var document = Until(() => automation.FromHandle(hwnd).FindAllDescendants(cf => cf.ByControlType(ControlType.Document))
        .FirstOrDefault(d => d.FindFirstDescendant(cf => cf.ByName("Ready")) is not null), "ready document");
    Click(document, "About this test"); Named(document, "Close", true);
    Keyboard.Press(VirtualKeyShort.ESCAPE);
    Keyboard.Release(VirtualKeyShort.ESCAPE);
    Until(() => Named(document, "About this test", true).Properties.HasKeyboardFocus.ValueOrDefault ? document : null, "restored dialog focus");
    steps.Add("About/Escape/focus");
    Click(document, "About this test"); Click(document, "Close"); steps.Add("About/Close");
    Click(document, "Simulate encryption"); Named(document, "Simulation complete. No file was changed."); steps.Add("Encrypt/complete");
    Click(document, "Reset"); Named(document, "Ready"); steps.Add("Reset");
    Click(document, "Simulate decryption"); Click(document, "Cancel"); Named(document, "Simulation canceled."); steps.Add("Decrypt/Cancel");
    Click(document, "Reset"); Named(document, "Ready"); steps.Add("Reset");
    passed = true;
}
catch (Exception error) {
    failure = error.GetType().Name + ": " + error.Message;
    try {
        names = automation.FromHandle(hwnd).FindAllDescendants().Take(120).Select(e =>
            $"{e.Properties.ControlType.ValueOrDefault}: {e.Properties.Name.ValueOrDefault}:focus={e.Properties.HasKeyboardFocus.ValueOrDefault}:offscreen={e.Properties.IsOffscreen.ValueOrDefault}").ToList();
    } catch (COMException) { }
}
finally
{
    if (hwnd != 0) Native.PostMessageW(hwnd, 0x10, 0, 0);
    if (!process.WaitForExit(10000)) { passed = false; failure = "Host did not exit after WM_CLOSE"; process.Kill(); process.WaitForExit(); }
    if (process.ExitCode != 0) { passed = false; failure ??= "Nonzero host exit"; }
    Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(args[2]))!);
    File.WriteAllText(args[2], JsonSerializer.Serialize(new { ready, passed, failure, steps, names, windows, exitCode = process.ExitCode, scope = "UIA3 production workflow correctness; no timing/AT/helper-tree acceptance" }, new JsonSerializerOptions { WriteIndented = true }));
}
Console.WriteLine(passed ? "PASS UIA3 production workflow" : "FAIL " + failure);
return passed ? 0 : 1;

internal static class Native
{
    internal delegate bool Callback(nint w, nint p);
    [DllImport("user32.dll")] internal static extern bool EnumWindows(Callback callback, nint p);
    [DllImport("user32.dll")] internal static extern uint GetWindowThreadProcessId(nint w, out int pid);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] internal static extern int GetWindowTextW(nint w, StringBuilder text, int count);
    [DllImport("user32.dll")] internal static extern bool PostMessageW(nint w, uint message, nuint wp, nint lp);
    [DllImport("user32.dll")] internal static extern bool IsWindowVisible(nint w);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] internal static extern int GetClassNameW(nint w, StringBuilder text, int count);
    [DllImport("user32.dll")] internal static extern bool SetProcessDpiAwarenessContext(nint context);
    [DllImport("user32.dll")] internal static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] internal static extern uint SendInput(uint count, Input[] inputs, int size);
    [StructLayout(LayoutKind.Sequential)] internal struct MouseInput { public int X, Y; public uint Data, Flags, Time; public nuint Extra; }
    [StructLayout(LayoutKind.Explicit, Size=40)] internal struct Input { [FieldOffset(0)] public uint Type; [FieldOffset(8)] public MouseInput Mouse; }
    [DllImport("user32.dll")] private static extern nint GetForegroundWindow();
    [DllImport("user32.dll")] private static extern nint GetAncestor(nint w, uint flags);
    [DllImport("user32.dll")] private static extern bool SetForegroundWindow(nint w);
    [DllImport("user32.dll")] private static extern bool BringWindowToTop(nint w);
    [DllImport("user32.dll")] private static extern nint SetFocus(nint w);
    [DllImport("kernel32.dll")] private static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] private static extern bool AttachThreadInput(uint first, uint second, bool attach);
    internal static bool Foreground(nint window)
    {
        var own = GetCurrentThreadId(); var foreground = GetWindowThreadProcessId(GetForegroundWindow(), out _); var target = GetWindowThreadProcessId(window, out _);
        var linkedForeground = own != foreground && AttachThreadInput(own, foreground, true);
        var linkedTarget = own != target && target != foreground && AttachThreadInput(own, target, true);
        try { BringWindowToTop(window); SetForegroundWindow(window); SetFocus(window); }
        finally { if (linkedTarget) AttachThreadInput(own, target, false); if (linkedForeground) AttachThreadInput(own, foreground, false); }
        return GetAncestor(GetForegroundWindow(), 2) == window;
    }
}
