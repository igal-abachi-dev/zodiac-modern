using System.ComponentModel;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Threading;
using NeutronStar.AvaloniaApp.ViewModels;
namespace NeutronStar.AvaloniaApp;

public sealed partial class MainWindow : Window
{
    private readonly MainViewModel model = new();
    public MainWindow()
    {
        InitializeComponent();
        DataContext = model;
        Opened += (_, _) => RequestAnimationFrame(_ => RequestAnimationFrame(_ => model.Ready()));
        Closed += (_, _) => model.Dispose();
        model.PropertyChanged += Changed;
        KeyDown += OnKey;
        DialogOverlay.PointerPressed += (_, e) => { if (e.Source == DialogOverlay) model.AboutOpen = false; };
        SizeChanged += (_, _) => ArrangeCards();
    }
    private void Changed(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(model.AboutOpen))
            Dispatcher.UIThread.Post(() => { if (model.AboutOpen) CloseAboutButton.Focus(); else AboutTrigger.Focus(); });
        if (e.PropertyName == nameof(model.Workbench))
            Dispatcher.UIThread.Post(() => { if (model.HasWorkbench) WorkbenchSection.BringIntoView(); else { PageScroll.Offset = new Vector(0, 0); OpenWorkbenchButton.Focus(); } }, DispatcherPriority.Loaded);
    }
    private void OnKey(object? sender, KeyEventArgs e)
    {
        if (e.Key == Key.Escape && model.AboutOpen)
        {
            model.AboutOpen = false;
            e.Handled = true;
        }
    }
    private void ArrangeCards()
    {
        bool narrow = ClientSize.Width < 620;
        HeaderGrid.ColumnDefinitions = narrow ? new ColumnDefinitions("*") : new ColumnDefinitions("*,Auto");
        HeaderGrid.RowDefinitions = narrow ? new RowDefinitions("Auto,Auto") : new RowDefinitions("Auto");
        Grid.SetColumn(AboutTrigger, narrow ? 0 : 1);
        Grid.SetRow(AboutTrigger, narrow ? 1 : 0);
        AboutTrigger.HorizontalAlignment = narrow ? global::Avalonia.Layout.HorizontalAlignment.Left : global::Avalonia.Layout.HorizontalAlignment.Right;
        Grid.SetColumn(EncryptCard, narrow ? 0 : 1);
        Grid.SetRow(EncryptCard, narrow ? 1 : 0);
        Cards.ColumnDefinitions = narrow ? new ColumnDefinitions("*") : new ColumnDefinitions("*,*");
        Cards.RowDefinitions = narrow ? new RowDefinitions("Auto,Auto") : new RowDefinitions("Auto");
        FooterGrid.ColumnDefinitions = narrow ? new ColumnDefinitions("*") : new ColumnDefinitions("Auto,*,Auto");
        FooterGrid.RowDefinitions = narrow ? new RowDefinitions("Auto,Auto,Auto") : new RowDefinitions("Auto");
        Grid.SetColumn(PrivacyText, narrow ? 0 : 1);
        Grid.SetRow(PrivacyText, narrow ? 1 : 0);
        Grid.SetColumn(RendererText, narrow ? 0 : 2);
        Grid.SetRow(RendererText, narrow ? 2 : 0);
    }
}
