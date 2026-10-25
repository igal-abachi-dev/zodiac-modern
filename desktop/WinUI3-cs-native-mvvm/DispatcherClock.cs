using System.Diagnostics;
using Microsoft.UI.Dispatching;
using NeutronStar.WinUINative.Models;
namespace NeutronStar.WinUINative;
internal sealed class DispatcherClock(DispatcherQueue queue):IClock
{
 public double Now=>Stopwatch.GetTimestamp()*1000.0/Stopwatch.Frequency;
 public IDisposable Repeat(Action callback,double periodMs){var timer=queue.CreateTimer();timer.Interval=TimeSpan.FromMilliseconds(periodMs);timer.IsRepeating=true;timer.Tick+=Tick;timer.Start();return new Lease(timer,Tick);void Tick(DispatcherQueueTimer sender,object args)=>callback();}
 private sealed class Lease(DispatcherQueueTimer timer,Windows.Foundation.TypedEventHandler<DispatcherQueueTimer,object> tick):IDisposable{public void Dispose(){timer.Stop();timer.Tick-=tick;}}
}
