using System.Collections.ObjectModel;
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
    private ObservableCollection<Row>? shown;
    private void Filter()
    {
        if (!disposed)
            Show(rows.Where(r => r.Label.Contains(Query, StringComparison.Ordinal)).ToArray());
    }
    // Sparse changed-row notifications, like the other native candidates: when the new list keeps the old order, remove, replace and
    // insert only the differing rows instead of re-realizing every row. A reorder or a mostly new list is published as a whole.
    private void Show(Row[] target)
    {
        var plan = shown is null ? null : Plan(shown, target);
        if (plan is null)
        {
            shown = new ObservableCollection<Row>(target);
            VisibleRows = shown;
            return;
        }
        foreach (var (kind, index, row) in plan)
        {
            if (kind == 0) shown!.RemoveAt(index);
            else if (kind == 1) shown![index] = row!;
            else shown!.Insert(index, row!);
        }
        OnPropertyChanged(nameof(Summary));
    }
    // Operations (0 remove, 1 replace, 2 insert; applied in order) or null when a whole-list publish is cheaper or the order changed.
    private static List<(int Kind, int Index, Row? Row)>? Plan(IReadOnlyList<Row> old, Row[] target)
    {
        var oldIds = new HashSet<int>(old.Count); foreach (var r in old) oldIds.Add(r.Id);
        var newIds = new HashSet<int>(target.Length); foreach (var r in target) newIds.Add(r.Id);
        var ops = new List<(int, int, Row?)>(); int i = 0, j = 0, costly = 0; // the old row at i sits at index j once earlier ops are applied
        while (i < old.Count && j < target.Length)
        {
            var o = old[i]; var t = target[j];
            if (o == t) { i++; j++; }
            else if (o.Id == t.Id) { ops.Add((1, j, t)); costly++; i++; j++; }
            else if (!newIds.Contains(o.Id)) { ops.Add((0, j, null)); i++; }
            else if (!oldIds.Contains(t.Id)) { ops.Add((2, j, t)); costly++; j++; }
            else return null;
        }
        for (; i < old.Count; i++) ops.Add((0, j, null));
        for (; j < target.Length; j++) { ops.Add((2, j, target[j])); costly++; }
        return costly * 2 > target.Length + 8 ? null : ops;
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
