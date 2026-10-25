using System.Diagnostics;
using Avalonia.Threading;
namespace NeutronStar.AvaloniaApp.ViewModels;

public interface IClock
{
    double Now
    {
        get;
    }
    IDisposable Every(Action callback, double milliseconds);
}
public sealed class UiClock : IClock
{
    public double Now => Stopwatch.GetTimestamp() * 1000.0 / Stopwatch.Frequency;
    public IDisposable Every(Action callback, double milliseconds)
    {
        var timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(milliseconds) };
        timer.Tick += (_, _) => callback();
        timer.Start();
        return new TimerLease(timer);
    }
    private sealed class TimerLease(DispatcherTimer timer) : IDisposable
    {
        public void Dispose() => timer.Stop();
    }
}
