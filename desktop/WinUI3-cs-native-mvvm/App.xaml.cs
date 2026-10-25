using Microsoft.UI.Xaml;
namespace NeutronStar.WinUINative;

public partial class App : Application
{
    private MainWindow? window;
    public App() => InitializeComponent();
    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        if (Environment.GetCommandLineArgs().Length != 1)
            throw new ArgumentException("This synthetic UI accepts no command arguments.");
        window = new MainWindow();
        window.Activate();
    }
}
