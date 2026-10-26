using Microsoft.UI.Reactor;
using Microsoft.UI.Reactor.Core;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using static Microsoft.UI.Reactor.Factories;
using NeutronStar.ReactorBench.Domain;
using W = Microsoft.UI.Xaml.Controls;
namespace NeutronStar.ReactorBench;

public sealed class BenchRoot : Component
{
    internal const string Font = "ms-appx:///Assets/Fonts/inter-latin-400-normal.ttf#Inter, ms-appx:///Assets/Fonts/noto-sans-hebrew-hebrew-400-normal.ttf#Noto Sans Hebrew, Segoe UI Emoji";
    internal static TextBlockElement T(string text, double size = 14) => TextBlock(text).FontSize(size).FontFamily(Font).Foreground("#171A18");
    internal static Element Card(Element child) => Border(child).Padding(16).Background("#FFFFFF").WithBorder("#DCE3DE", 1).CornerRadius(8);
    internal static Element Icon(string name) => Image("ms-appx:///Assets/Icons/" + name + ".svg").AccessibilityHidden().Width(16).Height(16).Set(image => { if (image.Source is not SvgImageSource) image.Source = new SvgImageSource(new Uri("ms-appx:///Assets/Icons/" + name + ".svg")); });
    internal static ButtonElement B(string text, Action click, string? id = null, bool enabled = true, string styleKey = "BaseButton") => Button(text, click).IsEnabled(enabled).AutomationName(text).AutomationId(id ?? text).ApplyStyle(styleKey);
    public override Element Render()
    {
        var (s, dispatch) = UseReducer<Flow, FlowAction>(Reducers.Flow, new Flow());
        var (open, setOpen) = UseState(false);
        var timer = UseMemo(() => new Pulse());
        var (width, _) = UseWindowSize(Shell.Window);
        // Window.Bounds/SizeChanged use device pixels for this desktop host.
        bool narrow = Shell.ClientWidth < 620;
        UseEffect((Func<Action>)(() => { int frames = 0; EventHandler<object>? handler = null; handler = (_, _) => { if (++frames < 2) return; CompositionTarget.Rendering -= handler; dispatch(new Loaded()); }; CompositionTarget.Rendering += handler; return () => { CompositionTarget.Rendering -= handler; timer.Dispose(); }; }));
        void StartFlow(string op)
        {
            if (!s.Loaded || s.Status == "running")
                return;
            int token = timer.Start(10, (id, elapsed) => dispatch(new Advance(id, elapsed)), true);
            dispatch(new Start(op, token));
        }
        Element Operation(string title, string icon, string label, string op, bool primary)
        {
            var button = B(label, () => StartFlow(op), op, s.Loaded && s.Status != "running", primary ? "PrimaryAction" : "ActionButton").Height(40).HAlign(HorizontalAlignment.Stretch);
            if(primary)button=button.Background("#047857").Foreground("#FFFFFF").WithBorder("#047857",1);
            return Card(VStack(0, HStack(8, Icon(icon), T(title, 16).Bold()), T("SYNTHETIC INPUT", 10).Foreground("#5D6660").Margin(0, 20, 0, 9), Border(VStack(5, T(op == "encrypt" ? Reducers.Fixture : "Synthetic sample: starlight.nsx"), op == "decrypt" ? T("No disk file is opened.", 12).Foreground("#5D6660") : null)).Padding(13).MinHeight(94).Background("#F1F4F2").WithBorder("#DCE3DE", 1).CornerRadius(6), button.Margin(0, 16, 0, 0)));
        }
        var decrypt = Operation("Decrypt", "unlock-keyhole", "Simulate decryption", "decrypt", false);
        var encrypt = Operation("Encrypt", "lock-keyhole", "Simulate encryption", "encrypt", true);
        var header = VStack(8, HStack(12, Icon("orbit").Width(40).Height(40), T("NeutronStar GUI Bench", 24).Bold()), T("A UI-only simulation for comparing desktop frontends.").Foreground("#5D6660"));
        var (showAbout, setAbout) = UseState(false);
        var about = B("About this test", () => setAbout(true), "about-trigger", !showAbout);
        Element headerLayout = narrow ? VStack(12, header, about) : Grid(columns: [GridSize.Star(), GridSize.Auto], rows: [GridSize.Auto], header, about.Grid(row: 0, column: 1));
        Element cardsLayout = narrow ? VStack(20, decrypt, encrypt) : (Grid(columns: [GridSize.Star(), GridSize.Star()], rows: [GridSize.Auto], decrypt, encrypt.Grid(row: 0, column: 1)) with
        {
            ColumnSpacing = 20
        });
        var openButton = B("Open workbench", () => { setOpen(true); Shell.IntoWorkbench(); }, "open-workbench", s.Loaded && s.Status != "running");
        var privacy = T("Local interface. Synthetic data. Nothing is encrypted or decrypted.", 11).Set(t => t.TextWrapping = TextWrapping.Wrap);
        var renderer = T("CONTROLLED RENDERER · LOCAL STATE", 9).Width(130).Set(t => t.TextWrapping = TextWrapping.Wrap);
        Element footer = narrow ? VStack(10, openButton, privacy, renderer) : (Grid(columns: [GridSize.Auto, GridSize.Star(), GridSize.Auto], rows: [GridSize.Auto], openButton, privacy.Grid(row: 0, column: 1), renderer.Grid(row: 0, column: 2)) with
        {
            ColumnSpacing = 16
        });
        return ScrollViewer(VStack(20, headerLayout, Border(HStack(7, Icon("shield-check"), T("SIMULATION · NO FILES OR CRYPTOGRAPHY.", 10))).Padding(9, 7).Background("#F1F4F2").WithBorder("#DCE3DE", 1).CornerRadius(6).HAlign(HorizontalAlignment.Left),
        cardsLayout,
        Card(VStack(16, HStack(12, T(Reducers.Status(s)).AutomationId("status"), s.Status == "running" ? B("Cancel", () => { timer.Stop(); dispatch(new Cancel()); }) : null, B("Reset", () => { timer.Stop(); dispatch(new Reset()); }, enabled: s.Loaded)), Progress(s.Progress).Height(6).AutomationName("Simulation progress").Set(p => p.Foreground = new SolidColorBrush(Windows.UI.Color.FromArgb(255, 4, 120, 87))), HStack(8, T("Simulation progress", 11), T($"{s.Progress}%", 11)))),
        footer,
        ContentDialog("About this test", T("Actions are UI-only simulations. No files, cryptography, Go CLI, network or native bridge are involved."), "") with
        {
            IsOpen = showAbout,
            CloseButtonText = "Close",
            DefaultButton = W.ContentDialogButton.Close,
            OnClosed = _ => { setAbout(false); Shell.FocusAbout(); }
        },
        open ? Component<Workbench, WorkbenchProps>(new(() => { setOpen(false); Shell.Back(); })).WithKey("workbench") : null).Padding(28).MaxWidth(1100)).AutomationId("PageScroll").Background("#F8FAF9").Set(scroll => scroll.HorizontalScrollBarVisibility = W.ScrollBarVisibility.Disabled);
    }
}
public sealed record WorkbenchProps(Action Back);
public sealed class Workbench : Component<WorkbenchProps>
{
    public override Element Render()
    {
        var (s, dispatch) = UseReducer<Rows, RowAction>(Reducers.List, Reducers.List(Rows.Empty, new Replace(1000)));
        var timer = UseMemo(() => new Pulse());
        UseEffect((Func<Action>)(() => () => timer.Dispose()));
        var rows = Reducers.Visible(s);
        void ReplaceRows(int count)
        {
            timer.Stop();
            dispatch(new Replace(count));
        }
        void Burst(int hz)
        {
            int id = timer.Start(hz, (token, _) => dispatch(new Update(token)), ended: () => dispatch(new Stop()));
            dispatch(new BeginBurst(id));
        }
        var controls = new List<Element?> { BenchRoot.B("1,000 rows", () => ReplaceRows(1000)), BenchRoot.B("10,000 rows", () => ReplaceRows(10000)), BenchRoot.B("Reverse", () => dispatch(new Reverse())), BenchRoot.B("Splice 10", () => dispatch(new Splice())), BenchRoot.B("Update 10%", () => dispatch(new Update())) };
        foreach (int hz in new[] { 10, 30, 60 })
            controls.Add(BenchRoot.B($"{hz} Hz / 2 s", () => Burst(hz)));
        controls.Add(BenchRoot.B("Stop", () => { timer.Stop(); dispatch(new Stop()); }).HelpText(s.Token < 0 ? "Updates stopped" : "Updates active"));
        controls.Add(BenchRoot.B("Remount workload", () => { timer.Stop(); dispatch(new Remount()); }));
        return VStack(16, BenchRoot.T("List and filter workbench", 20).Bold(), BenchRoot.T("Deterministic synthetic rows. No files, network, cryptography or native commands.", 12), BenchRoot.B("Back to main screen", Props.Back), BenchRoot.T("Workbench ready"), FlexRow(controls.ToArray()) with
        {
            Wrap = Microsoft.UI.Reactor.Layout.FlexWrap.Wrap,
            ColumnGap = 8,
            RowGap = 8
        },
        BenchRoot.Card(VStack(10, BenchRoot.T("Filter synthetic rows"), TextBox(s.Query, text => dispatch(new Query(text))).AutomationName("Filter synthetic rows").AutomationId("workload-query"), BenchRoot.T($"{rows.Length} rows; tick {s.Tick}").AutomationId("workload-summary"))),
        VStack(0, rows.Select(r => Border(BenchRoot.T($"{r.Label}: {r.Value}")).Padding(12, 6).Background("#FFFFFF").WithBorder("#DCE3DE", 1).WithKey(r.Id.ToString())).ToArray<Element?>()).Semantics(role: "group").AutomationName("Synthetic rows").AutomationId("workload-rows")).AutomationId("workbench");
    }
}
