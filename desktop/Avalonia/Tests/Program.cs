using NeutronStar.AvaloniaApp.ViewModels;
static void Check(bool condition, string name) { if (!condition) throw new Exception(name); }
var clock = new FakeClock();
using var main = new MainViewModel(clock);
main.Start(true);
Check(clock.Pending == 0, "not ready");
main.Ready();
main.Start(true);
clock.Advance(1000);
Check(main.Progress == 50, "half progress");
main.Cancel();
Check(!main.Running && main.Status == "Simulation canceled." && clock.Pending == 0, "cancel");
main.Reset();
main.Start(false);
clock.Advance(2000);
Check(main.Progress == 100 && main.Status.StartsWith("Simulation complete") && clock.Pending == 0, "complete");
main.OpenWorkbench();
var w = main.Workbench!;
Check(w.VisibleRows[0].Id == 0, "initial id");
w.Replace(10000);
Check(w.VisibleRows[0].Id == 1000, "10k ids");
w.Replace(1000);
w.Reverse();
Check(w.VisibleRows[0].Id == 11999, "reverse");
w.Splice();
Check(w.VisibleRows[0].Id == 12000, "splice");
var before = w.VisibleRows[0];
w.Update();
Check(w.Tick == 1 && before.Value == 0 && w.VisibleRows[0].Value == 1, "immutable update");
w.Query = "row-12000 ";
Check(w.VisibleRows.Count == 1, "filter");
w.Query = "missing";
Check(w.VisibleRows.Count == 0, "empty filter");
w.Query = "";
foreach (var hz in new[] { 10, 30, 60 }) { w.Burst(hz); clock.Advance(100); Check(clock.Pending == 1, "burst"); w.Stop(); Check(clock.Pending == 0, "stop"); }
// Incremental list publishing must always equal a plain recomputation, whatever the order of queries and edits.
{
    var rng = new Random(7); var queries = new[] { "", "r", "row-1", "row-12", "row-120", "1", "9", "row-9", "שלום", "zzz", "row-12000 " };
    w.Replace(1000);
    for (int step = 0; step < 400; step++)
    {
        var q = queries[rng.Next(queries.Length)];
        switch (rng.Next(6)) { case 0: w.Reverse(); break; case 1: w.Splice(); break; case 2: w.Update(); break; case 3: w.Replace(rng.Next(2) == 0 ? 50 : 1000); break; default: break; }
        w.Query = q;
        var active = w.VisibleRows.ToArray();
        w.Query = "";
        var all = w.VisibleRows.ToArray();
        Check(active.SequenceEqual(all.Where(r => r.Label.Contains(q, StringComparison.Ordinal))), "incremental filter equals recompute at step " + step);
        w.Query = q;
        Check(w.VisibleRows.SequenceEqual(active) && w.Summary.StartsWith(active.Length + " rows;"), "refilter and summary at step " + step);
        if (rng.Next(3) == 0) { w.Update(); var after = w.VisibleRows.ToArray(); w.Query = ""; Check(after.SequenceEqual(w.VisibleRows.ToArray().Where(r => r.Label.Contains(q, StringComparison.Ordinal))), "update under query at step " + step); }
    }
    w.Query = "";
}
w.Remount();
Check(w.Tick == 0 && w.VisibleRows[0].Id == 0, "remount");
w.Burst(30);
main.CloseWorkbench();
Check(clock.Pending == 0, "close clears timer");
clock.Advance(500);
main.OpenWorkbench();
Check(main.Workbench!.Tick == 0 && main.Workbench.VisibleRows[0].Id == 0, "fresh reopen");
main.Dispose();
Check(clock.Pending == 0 && !main.EncryptCommand.CanExecute(null), "terminal disposal");
Console.WriteLine("PASS independent Avalonia workflow/list/timer model assertions");
sealed class FakeClock : IClock
{
    private double now; private int serial; private readonly Dictionary<int, Action> callbacks = new(); public double Now => now; public int Pending => callbacks.Count; public IDisposable Every(Action callback, double milliseconds)
    {
        int id = ++serial;
        callbacks[id] = callback;
        return new Lease(() => callbacks.Remove(id));
    }
    public void Advance(double ms)
    {
        now += ms;
        foreach (var cb in callbacks.Values.ToArray())
            cb();
    }
    private sealed class Lease(Action close) : IDisposable
    {
        public void Dispose() => close();
    }
}
