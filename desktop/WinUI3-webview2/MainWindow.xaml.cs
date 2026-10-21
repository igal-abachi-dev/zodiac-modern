using Microsoft.UI.Xaml;
using Microsoft.Web.WebView2.Core;
using System.Runtime.InteropServices;
using Windows.Graphics;

namespace NeutronStar.WinUIHost;

public sealed partial class MainWindow : Window
{
    private readonly HostOptions options;
    private readonly AssetStore assets;
    private CoreWebView2Environment? environment;
    private CoreWebView2? core;
    private bool closing, started;
    [DllImport("user32.dll")] private static extern uint GetDpiForWindow(nint hwnd);

    internal MainWindow(HostOptions options)
    {
        this.options = options;
        assets = new AssetStore(Path.Combine(AppContext.BaseDirectory, "Frontend"), Path.Combine(AppContext.BaseDirectory, "Frontend.manifest.json"));
        InitializeComponent();
        Title = "NeutronStar GUI Bench";
        var dpi = GetDpiForWindow(WinRT.Interop.WindowNative.GetWindowHandle(this));
        AppWindow.ResizeClient(new SizeInt32((int)(960 * dpi / 96), (int)(640 * dpi / 96)));
        Browser.Loaded += BrowserLoaded;
        Closed += OnClosed;
    }
    private void BrowserLoaded(object sender, RoutedEventArgs args) => StartBrowser();
    internal async void StartBrowser()
    {
        if (started || closing || !Browser.IsLoaded) return;
        started = true;
        try
        {
            _ = CoreWebView2Environment.GetAvailableBrowserVersionString();
            environment = await CoreWebView2Environment.CreateWithOptionsAsync(null, options.Profile,
                new CoreWebView2EnvironmentOptions { AreBrowserExtensionsEnabled = false });
            if (closing) return;
            var controller = environment.CreateCoreWebView2ControllerOptions();
            controller.ProfileName = "NeutronStar";
            controller.IsInPrivateModeEnabled = true;
            await Browser.EnsureCoreWebView2Async(environment, controller);
            if (closing) { Browser.Close(); return; }
            core = Browser.CoreWebView2;
            var settings = core.Settings;
            settings.IsScriptEnabled = true;
            settings.IsWebMessageEnabled = false;
            settings.AreHostObjectsAllowed = false;
            settings.AreDevToolsEnabled = false;
            settings.AreDefaultContextMenusEnabled = false;
            settings.AreDefaultScriptDialogsEnabled = false;
            settings.AreBrowserAcceleratorKeysEnabled = false;
            settings.IsStatusBarEnabled = false;
            settings.IsZoomControlEnabled = false;
            settings.IsPinchZoomEnabled = false;
            settings.IsPasswordAutosaveEnabled = false;
            settings.IsGeneralAutofillEnabled = false;
            settings.IsBuiltInErrorPageEnabled = false;
            core.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
            core.WebResourceRequested += Resource;
            core.NavigationStarting += Navigation;
            core.FrameNavigationStarting += FrameNavigation;
            core.NavigationCompleted += NavigationCompleted;
            core.NewWindowRequested += Popup;
            core.PermissionRequested += Permission;
            core.DownloadStarting += Download;
            core.LaunchingExternalUriScheme += ExternalUri;
            core.ProcessFailed += ProcessFailed;
            core.Navigate(AssetPolicy.Origin + "index.html");
        }
        catch when (closing) { }
        catch (Exception error) { Console.Error.WriteLine($"browser_failed:{error.GetType().Name}:0x{error.HResult:X8}"); Fail(); }
    }
    private void Resource(object? sender, CoreWebView2WebResourceRequestedEventArgs args)
    {
        if (closing || environment is null) return;
        try
        {
            var response = assets.Response(args.Request.Method, args.Request.Uri);
            var stream = new MemoryStream(response.Bytes, writable: false).AsRandomAccessStream();
            // The SDK marshals this managed stream into the response's COM
            // lifetime. Do not dispose it while WebView2 may still read it.
            args.Response = environment.CreateWebResourceResponse(stream, response.Status,
                response.Status == 200 ? "OK" : response.Status == 404 ? "Not Found" : "Forbidden", AssetPolicy.Headers(response.Mime));
        }
        catch { Fail(); }
    }
    private void Navigation(object? sender, CoreWebView2NavigationStartingEventArgs args) => args.Cancel = AssetPolicy.ResourcePath(args.Uri) is null;
    private void FrameNavigation(object? sender, CoreWebView2NavigationStartingEventArgs args) => args.Cancel = true;
    private void Popup(object? sender, CoreWebView2NewWindowRequestedEventArgs args) => args.Handled = true;
    private void Permission(object? sender, CoreWebView2PermissionRequestedEventArgs args) => args.State = CoreWebView2PermissionState.Deny;
    private void Download(object? sender, CoreWebView2DownloadStartingEventArgs args) { args.Cancel = true; args.Handled = true; }
    private void ExternalUri(object? sender, CoreWebView2LaunchingExternalUriSchemeEventArgs args) => args.Cancel = true;
    private void ProcessFailed(object? sender, CoreWebView2ProcessFailedEventArgs args) => Fail();
    private void NavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs args)
    {
        if (closing) return;
        if (args.IsSuccess) Loading.Visibility = Visibility.Collapsed;
        else Fail();
    }
    private void Fail()
    {
        if (closing) return;
        Environment.ExitCode = 1;
        Browser.Visibility = Visibility.Collapsed;
        Loading.Visibility = Visibility.Visible;
        Loading.Text = "Unable to initialize the local interface.";
    }
    private void OnClosed(object sender, WindowEventArgs args)
    {
        if (closing) return;
        closing = true;
        Browser.Loaded -= BrowserLoaded;
        if (core is not null)
        {
            core.WebResourceRequested -= Resource;
            core.NavigationStarting -= Navigation;
            core.FrameNavigationStarting -= FrameNavigation;
            core.NavigationCompleted -= NavigationCompleted;
            core.NewWindowRequested -= Popup;
            core.PermissionRequested -= Permission;
            core.DownloadStarting -= Download;
            core.LaunchingExternalUriScheme -= ExternalUri;
            core.ProcessFailed -= ProcessFailed;
        }
        Browser.Close();
        core = null; environment = null;
    }
}
