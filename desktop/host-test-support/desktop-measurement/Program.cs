using System.Diagnostics;
using System.Drawing;
using System.Security.Cryptography;
using System.Text.Json;
using FlaUI.Core.AutomationElements;
using FlaUI.Core.Definitions;
using FlaUI.UIA3;

internal sealed record Config(string Variant, string Runner, string[] Arguments, string Adapter, string Scenario, string Output,
    string? Reference = null, int ReferenceWaitMs = 0, int Repeats = 30, int IdleSeconds = 12, string[]? IdleOrder = null, string? Targets = null);

internal static partial class Program
{
    internal static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = true };
    internal static readonly double QpcMs = 1000.0 / Stopwatch.Frequency;
    internal static double Now() => Stopwatch.GetTimestamp() * QpcMs;
    internal static void Save(string path, object data) => File.WriteAllText(path, JsonSerializer.Serialize(data, Json));
    internal static string Hash(string path) => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path))).ToLowerInvariant();
    // Visual-state thresholds. The raw per-frame series is stored, so these can be re-evaluated offline.
    internal const double CellBad = 8.0;          // per-cell mean abs channel difference counted as "different"
    internal const double ReadyBadFraction = 0.01; // <=1% of cells differ from the reference = visually ready
    internal const double ContentBadFraction = 0.25;
    internal const double ReadyHoldMs = 500;

    [MTAThread]
    static int Main(string[] args)
    {
        if (args.Length != 1) { Console.Error.WriteLine("One config JSON path required"); return 2; }
        var config = JsonSerializer.Deserialize<Config>(File.ReadAllText(args[0]), new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
        Directory.CreateDirectory(config.Output);
        Native.SetProcessDpiAwarenessContext(new IntPtr(-4));
        Native.GetCursorPos(out var cursor);
        var result = new Dictionary<string, object?>
        {
            ["schema"] = "neutronstar.desktop-measurement.v1", ["config"] = config, ["status"] = "failed",
            ["collectorSha256"] = Hash(typeof(Program).Assembly.Location), ["qpcFrequency"] = Stopwatch.Frequency,
            ["frameSource"] = "DXGI Desktop Duplication; LastPresentTime (QPC). Compositor present time, not photon scan-out.",
        };
        int code = 1;
        try
        {
            using var duplicator = new Duplicator();
            result["adapter"] = duplicator.Adapter; result["outputBounds"] = duplicator.OutputBounds.ToString();
            switch (config.Scenario)
            {
                case "calibrate": code = Calibrate(config, duplicator, result); break;
                case "reference": code = Reference(config, duplicator, result); break;
                case "startup": code = Startup(config, duplicator, result); break;
                case "idle": code = Idle(config, duplicator, result); break;
                case "interact": code = Interact(config, duplicator, result); break;
                case "targets": code = Targets(config, duplicator, result); break;
                default: throw new InvalidOperationException("Unknown scenario " + config.Scenario);
            }
            if (duplicator.Error != null) { result["status"] = "failed"; result["error"] = "Capture thread: " + duplicator.Error; code = 1; }
            result["capture"] = new { duplicator.Acquired, duplicator.CursorOnly, reinits = duplicator.Reinits.ToArray() };
        }
        catch (Exception error) { result["status"] = "failed"; result["error"] = error.GetType().Name + ": " + error.Message; code = 1; }
        finally { Native.SetCursorPos(cursor.X, cursor.Y); Save(Path.Combine(config.Output, "result.json"), result); }
        Console.WriteLine(JsonSerializer.Serialize(new { config.Variant, config.Scenario, status = result["status"], output = config.Output }));
        return code;
    }

    internal static double BadFraction(byte[] frame, byte[] reference)
    {
        int bad = 0, cells = Duplicator.GridW * Duplicator.GridH;
        for (int c = 0; c < cells; c++)
        {
            int d = 0; for (int k = 0; k < Duplicator.Channels; k++) d += Math.Abs(frame[c * Duplicator.Channels + k] - reference[c * Duplicator.Channels + k]);
            if (d / (double)Duplicator.Channels > CellBad) bad++;
        }
        return bad / (double)cells;
    }

    internal static Rectangle ClientScreenRect(IntPtr window)
    {
        Native.GetClientRect(window, out var client); var origin = new Native.Point(); Native.ClientToScreen(window, ref origin);
        return new Rectangle(origin.X, origin.Y, client.Right, client.Bottom);
    }

    // ---- reference recording -------------------------------------------------------------------------------
    static int Reference(Config config, Duplicator duplicator, Dictionary<string, object?> result)
    {
        using var run = new AppRun(config, duplicator);
        try
        {
            run.Launch(); run.WaitWindow(30000); run.CalibrateClient(result); run.Foreground();
            Native.SetCursorPos(duplicator.OutputBounds.Right - 5, duplicator.OutputBounds.Bottom - 5);
            duplicator.KeepCrop(true);
            if (config.Adapter == "none") Thread.Sleep(config.ReferenceWaitMs > 0 ? config.ReferenceWaitMs : 6000);
            else result["uiaReadyMs"] = run.WaitUiaReady(60000) - run.LaunchedAt;
            // Quiet: the client region unchanged for 1.5 s (frames are kept only when the region changes). Hard 30 s bound.
            double settleStart = Now(), quietSince = Now(); int seen = duplicator.Count;
            while (Now() - quietSince < 1500)
            {
                Thread.Sleep(50);
                if (duplicator.Count != seen) { seen = duplicator.Count; quietSince = Now(); }
                if (Now() - settleStart > 30000) throw new TimeoutException("Window region never settled for 1.5 s");
            }
            var latest = duplicator.Latest ?? throw new InvalidOperationException("No frame captured in the client region");
            Directory.CreateDirectory(Path.GetDirectoryName(config.Reference!)!);
            Save(config.Reference!, new { variant = config.Variant, gridW = Duplicator.GridW, gridH = Duplicator.GridH, grid = Convert.ToBase64String(latest.Grid), framesSeen = duplicator.Count });
            duplicator.SaveLastCrop(Path.ChangeExtension(config.Reference!, ".png"));
            result["referenceFrames"] = duplicator.Count;
            run.Close(result);
            result["status"] = "passed"; return 0;
        }
        catch { run.Abort(result); throw; }
    }

    // ---- startup ---------------------------------------------------------------------------------------------
    static int Startup(Config config, Duplicator duplicator, Dictionary<string, object?> result)
    {
        var reference = Convert.FromBase64String(JsonDocument.Parse(File.ReadAllText(config.Reference!)).RootElement.GetProperty("grid").GetString()!);
        using var run = new AppRun(config, duplicator);
        try
        {
            Native.SetCursorPos(duplicator.OutputBounds.Right - 5, duplicator.OutputBounds.Bottom - 5);
            duplicator.Clear();
            double t0 = run.Launch(); result["launchReturnedMs"] = Now() - t0;
            double hwnd = run.WaitWindow(30000); result["windowVisibleMs"] = hwnd - t0;
            run.CalibrateClient(result);
            run.Foreground();
            double? ready = null;
            var uia = config.Adapter == "none" ? null : run.StartUiaPolling();
            // Wait for a held visual-ready state or deadline.
            double deadline = Now() + 40000; (double ms, double bad)? held = null;
            var series = new List<object>();
            int processed = 0;
            while (Now() < deadline)
            {
                var frames = duplicator.Snapshot();
                for (; processed < frames.Count; processed++)
                {
                    var f = frames[processed]; double bad = BadFraction(f.Grid, reference);
                    series.Add(new { ms = f.PresentMs - t0, arrivedMs = f.ArrivedMs - t0, bad });
                    if (bad <= ReadyBadFraction) held ??= (f.PresentMs, bad); else held = null;
                }
                // Held means the last frame matches and no deviating frame arrived for ReadyHoldMs.
                if (held != null && Now() - held.Value.ms >= ReadyHoldMs && (uia == null || uia.ReadyAt != null)) break;
                Thread.Sleep(10);
            }
            if (held == null) throw new InvalidOperationException("Visual ready state not reached");
            if (uia != null && uia.ReadyAt == null) throw new InvalidOperationException("UIA ready state not reached");
            ready = held.Value.ms - t0;
            var all = duplicator.Snapshot();
            var firstFrame = all.FirstOrDefault(); var content = all.FirstOrDefault(f => BadFraction(f.Grid, reference) <= ContentBadFraction);
            result["visualReadyMs"] = ready; result["firstFrameMs"] = firstFrame == null ? null : firstFrame.PresentMs - t0;
            result["firstContentMs"] = content == null ? null : content.PresentMs - t0;
            result["uiaReadyMs"] = uia?.ReadyAt == null ? null : uia.ReadyAt - t0;
            result["uiaPolls"] = uia?.Polls; result["uiaMaxPollMs"] = uia?.MaxPollMs;
            result["frameCount"] = all.Count;
            Save(Path.Combine(config.Output, "frames.json"), series);
            duplicator.KeepCrop(true); Thread.Sleep(200); duplicator.SaveLastCrop(Path.Combine(config.Output, "final.png"));
            run.StopUiaPolling();
            run.Close(result);
            result["status"] = result.TryGetValue("cleanupFailure", out var failure) && failure != null ? "failed" : "passed";
            return (string)result["status"]! == "passed" ? 0 : 1;
        }
        catch { run.Abort(result); throw; }
    }
}
