using Avalonia;
using Avalonia.Media;
namespace NeutronStar.AvaloniaApp;

internal static class Program
{
    [STAThread]
    public static void Main(string[] args)
    {
        if (args.Length != 0)
            throw new ArgumentException("This UI-only app does not accept command arguments.");
        BuildAvaloniaApp().StartWithClassicDesktopLifetime(args);
    }
    public static AppBuilder BuildAvaloniaApp() => AppBuilder.Configure<App>().UsePlatformDetect()
     .With(new FontManagerOptions { DefaultFamilyName = "avares://NeutronStar-Avalonia/Assets/fonts#Inter", FontFallbacks = [new FontFallback { FontFamily = new FontFamily("avares://NeutronStar-Avalonia/Assets/fonts#Noto Sans Hebrew"), UnicodeRange = new UnicodeRange(0x0590, 0x05ff) }] })
     .LogToTrace();
}
