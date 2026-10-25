using Microsoft.UI.Dispatching;
using System.Diagnostics;
namespace NeutronStar.ReactorBench;

internal sealed class Pulse : IDisposable
{
    private DispatcherQueueTimer? timer; private int generation; private bool disposed;
    public int Start(double hz, Action<int, double> callback, bool finalTick = false, Action? ended = null)
    {
        if (disposed)
            throw new ObjectDisposedException(nameof(Pulse));
        if (hz != 10 && hz != 30 && hz != 60)
            throw new ArgumentOutOfRangeException(nameof(hz));
        Stop();
        int token = generation;
        double began = Stopwatch.GetTimestamp() * 1000.0 / Stopwatch.Frequency;
        timer = Shell.Window.DispatcherQueue.CreateTimer();
        timer.Interval = TimeSpan.FromMilliseconds(1000 / hz);
        timer.IsRepeating = true;
        timer.Tick += (_, _) => { if (token != generation || disposed) return; double elapsed = Stopwatch.GetTimestamp() * 1000.0 / Stopwatch.Frequency - began; if (elapsed >= 2000) { Stop(); if (finalTick) callback(token, elapsed); ended?.Invoke(); return; } callback(token, elapsed); };
        timer.Start();
        return token;
    }
    public void Stop()
    {
        generation++;
        timer?.Stop();
        timer = null;
    }
    public void Dispose()
    {
        Stop();
        disposed = true;
    }
}
