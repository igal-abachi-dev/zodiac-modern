using Microsoft.UI.Xaml;

namespace NeutronStar.WinUIHost;

public partial class App : Application
{
    private MainWindow? window;
    public App() => InitializeComponent();
    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        try
        {
            var options = HostOptions.Parse(Environment.GetCommandLineArgs().Skip(1).ToArray());
            window = new MainWindow(options);
            window.Activate();
            window.StartBrowser();
        }
        catch (Exception error)
        {
            // Fixed error only; do not print command arguments, URLs or paths.
            Console.Error.WriteLine($"startup_failed:{error.GetType().Name}:0x{error.HResult:X8}");
            Environment.ExitCode = 1;
            window?.Close();
            Exit();
        }
    }
}
