using Microsoft.UI.Xaml;
using Microsoft.UI.Reactor.Hosting;
using Windows.Graphics;
using System.Runtime.InteropServices;
namespace NeutronStar.ReactorBench;
public partial class App:Application
{
 private Window? window;private ReactorHost? host;
 public App()=>InitializeComponent();
 [DllImport("user32.dll")]private static extern uint GetDpiForWindow(nint window);
 protected override void OnLaunched(LaunchActivatedEventArgs args){if(Environment.GetCommandLineArgs().Length!=1)throw new ArgumentException("No application arguments are supported.");window=new Window{Title="NeutronStar GUI Bench"};Shell.Window=window;uint dpi=GetDpiForWindow(WinRT.Interop.WindowNative.GetWindowHandle(window));window.AppWindow.ResizeClient(new SizeInt32((int)(960*dpi/96),(int)(640*dpi/96)));host=new ReactorHost(window);host.Mount(new BenchRoot());window.Closed+=(_,_)=>host.Dispose();window.Activate();}
}
