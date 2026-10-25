using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
namespace NeutronStar.AvaloniaApp.ViewModels;

public sealed record Row(int Id, string Label, int Value)
{
    public string Display => $"{Label}: {Value}";
}
public sealed partial class WorkbenchViewModel : ObservableObject, IDisposable
{
    private readonly IClock clock; private IDisposable? timer; private bool disposed; private int nextId, generation; private IReadOnlyList<Row> rows = Array.Empty<Row>();
    [ObservableProperty] private IReadOnlyList<Row> visibleRows = Array.Empty<Row>();
    [ObservableProperty] private string query = "";
    [ObservableProperty] private int tick;
    public string Summary => $"{VisibleRows.Count} rows; tick {Tick}";
    public string ReadyStatus => "Workbench ready";
    public IRelayCommand Replace1000Command
    {
        get;
    }
    public IRelayCommand Replace10000Command
    {
        get;
    }
    public IRelayCommand ReverseCommand
    {
        get;
    }
    public IRelayCommand SpliceCommand
    {
        get;
    }
    public IRelayCommand UpdateCommand
    {
        get;
    }
    public IRelayCommand Burst10Command
    {
        get;
    }
    public IRelayCommand Burst30Command
    {
        get;
    }
    public IRelayCommand Burst60Command
    {
        get;
    }
    public IRelayCommand StopCommand
    {
        get;
    }
    public IRelayCommand RemountCommand
    {
        get;
    }
    public WorkbenchViewModel(IClock? clock = null)
    {
        this.clock = clock ?? new UiClock();
        Replace1000Command = new RelayCommand(() => Replace(1000));
        Replace10000Command = new RelayCommand(() => Replace(10000));
        ReverseCommand = new RelayCommand(Reverse);
        SpliceCommand = new RelayCommand(Splice);
        UpdateCommand = new RelayCommand(Update);
        Burst10Command = new RelayCommand(() => Burst(10));
        Burst30Command = new RelayCommand(() => Burst(30));
        Burst60Command = new RelayCommand(() => Burst(60));
        StopCommand = new RelayCommand(Stop);
        RemountCommand = new RelayCommand(Remount);
    }
    partial void OnQueryChanged(string value) => Filter();
    partial void OnTickChanged(int value) => OnPropertyChanged(nameof(Summary));
    partial void OnVisibleRowsChanged(IReadOnlyList<Row> value) => OnPropertyChanged(nameof(Summary));
    private void Filter()
    {
        if (!disposed)
            VisibleRows = rows.Where(r => r.Label.Contains(Query, StringComparison.Ordinal)).ToArray();
    }
    private Row[] NewRows(int count) => Enumerable.Range(0, count).Select(_ => { var id = nextId++; return new Row(id, $"row-{id} שלום", 0); }).ToArray();
    public void Replace(int count)
    {
        if (disposed)
            return;
        if (count < 0 || count > 10000)
            throw new ArgumentOutOfRangeException(nameof(count));
        Stop();
        rows = NewRows(count);
        Query = "";
        Tick = 0;
        Filter();
    }
    public void Reverse()
    {
        if (disposed)
            return;
        rows = rows.Reverse().ToArray();
        Filter();
    }
    public void Splice()
    {
        if (disposed)
            return;
        rows = NewRows(10).Concat(rows.Skip(10)).ToArray();
        Filter();
    }
    public void Update()
    {
        if (disposed)
            return;
        rows = rows.Select((r, i) => i % 10 == 0 ? r with { Value = r.Value + 1 } : r).ToArray();
        Tick++;
        Filter();
    }
    public void Burst(int hz)
    {
        if (disposed)
            return;
        if (hz != 10 && hz != 30 && hz != 60)
            throw new ArgumentOutOfRangeException(nameof(hz));
        Stop();
        var current = generation;
        var until = clock.Now + 2000;
        timer = clock.Every(() => { if (disposed || generation != current) return; if (clock.Now >= until) { Stop(); return; } Update(); }, 1000.0 / hz);
    }
    public void Stop()
    {
        generation++;
        timer?.Dispose();
        timer = null;
    }
    public void Remount()
    {
        if (disposed)
            return;
        Stop();
        nextId = 0;
        Replace(1000);
    }
    public void Dispose()
    {
        Stop();
        disposed = true;
    }
}
