using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
namespace NeutronStar.AvaloniaApp.ViewModels;

public sealed partial class MainViewModel : ObservableObject, IDisposable
{
    private readonly IClock clock; private IDisposable? timer; private int generation; private bool disposed;
    [ObservableProperty] private bool loaded;
    [ObservableProperty] private string status = "Loading local interface…";
    [ObservableProperty] private int progress;
    [ObservableProperty] private bool running;
    [ObservableProperty] private bool aboutOpen;
    [ObservableProperty] private WorkbenchViewModel? workbench;
    public bool MainEnabled => !AboutOpen;
    public bool HasWorkbench => Workbench is not null;
    public string Percent => $"{Progress}%";
    public const string Fixture = "Zodiac GUI benchmark — שלום — 🌠";
    public string FixtureText => Fixture;
    public IRelayCommand EncryptCommand
    {
        get;
    }
    public IRelayCommand DecryptCommand
    {
        get;
    }
    public IRelayCommand CancelCommand
    {
        get;
    }
    public IRelayCommand ResetCommand
    {
        get;
    }
    public IRelayCommand OpenWorkbenchCommand
    {
        get;
    }
    public IRelayCommand BackCommand
    {
        get;
    }
    public IRelayCommand AboutCommand
    {
        get;
    }
    public IRelayCommand CloseAboutCommand
    {
        get;
    }
    public MainViewModel(IClock? clock = null)
    {
        this.clock = clock ?? new UiClock();
        EncryptCommand = new RelayCommand(() => Start(true), CanStart);
        DecryptCommand = new RelayCommand(() => Start(false), CanStart);
        CancelCommand = new RelayCommand(Cancel, () => Running);
        ResetCommand = new RelayCommand(Reset, () => Loaded);
        OpenWorkbenchCommand = new RelayCommand(OpenWorkbench, CanStart);
        BackCommand = new RelayCommand(CloseWorkbench);
        AboutCommand = new RelayCommand(() => AboutOpen = true);
        CloseAboutCommand = new RelayCommand(() => AboutOpen = false);
    }
    private bool CanStart() => Loaded && !Running && !disposed;
    partial void OnLoadedChanged(bool value) => RefreshCommands();
    partial void OnRunningChanged(bool value) => RefreshCommands();
    partial void OnProgressChanged(int value) => OnPropertyChanged(nameof(Percent));
    partial void OnAboutOpenChanged(bool value) => OnPropertyChanged(nameof(MainEnabled));
    partial void OnWorkbenchChanged(WorkbenchViewModel? value) => OnPropertyChanged(nameof(HasWorkbench));
    private void RefreshCommands()
    {
        EncryptCommand.NotifyCanExecuteChanged();
        DecryptCommand.NotifyCanExecuteChanged();
        CancelCommand.NotifyCanExecuteChanged();
        ResetCommand.NotifyCanExecuteChanged();
        OpenWorkbenchCommand.NotifyCanExecuteChanged();
    }
    public void Ready()
    {
        if (disposed)
            return;
        Loaded = true;
        Status = "Ready";
    }
    private void Stop()
    {
        generation++;
        timer?.Dispose();
        timer = null;
    }
    public void Start(bool encrypt)
    {
        if (!CanStart())
            return;
        Stop();
        var current = generation;
        var began = clock.Now;
        Progress = 0;
        Running = true;
        Status = encrypt ? "Simulating encryption…" : "Simulating decryption…";
        if (disposed || generation != current || !Running)
            return;
        timer = clock.Every(() => { if (disposed || generation != current) return; Progress = Math.Max(Progress, Math.Clamp((int)((clock.Now - began) / 20), 0, 100)); if (Progress == 100) { Stop(); Running = false; Status = "Simulation complete. No file was changed."; } }, 100);
    }
    public void Cancel()
    {
        Stop();
        if (Running)
        {
            Running = false;
            Status = "Simulation canceled.";
        }
    }
    public void Reset()
    {
        Stop();
        if (disposed)
            return;
        Progress = 0;
        Running = false;
        Status = Loaded ? "Ready" : "Loading local interface…";
    }
    public void OpenWorkbench()
    {
        if (!CanStart() || Workbench is not null)
            return;
        Workbench = new WorkbenchViewModel(clock);
        Workbench.Replace(1000);
    }
    public void CloseWorkbench()
    {
        Workbench?.Dispose();
        Workbench = null;
    }
    public void Dispose()
    {
        Stop();
        CloseWorkbench();
        disposed = true;
        RefreshCommands();
    }
}
