using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;

internal static partial class Program
{
    /// <summary>
    /// Pipeline floor: a synthetic window flips colour on mouse-down; we measure injected input -> first presented frame
    /// that shows the change. This bounds what the pixel endpoint can resolve and is not a toolkit result.
    /// </summary>
    static int Calibrate(Config config, Duplicator duplicator, Dictionary<string, object?> result)
    {
        Form? form = null; var ready = new ManualResetEventSlim(); bool flip = false;
        var thread = new Thread(() =>
        {
            form = new Form { Text = "NeutronStar calibration fixture", FormBorderStyle = FormBorderStyle.FixedSingle, StartPosition = FormStartPosition.Manual, Location = new Point(40, 40), BackColor = Color.White };
            form.Load += (_, _) => { uint dpi = Native.GetDpiForWindow(form.Handle); form.ClientSize = new Size((int)(960 * dpi / 96), (int)(640 * dpi / 96)); ready.Set(); };
            form.MouseDown += (_, _) => { flip = !flip; form.BackColor = flip ? Color.FromArgb(4, 120, 87) : Color.White; };
            Application.Run(form);
        }) { IsBackground = true, Name = "calibration-form" };
        thread.SetApartmentState(ApartmentState.STA); thread.Start();
        if (!ready.Wait(10000)) throw new TimeoutException("Fixture window did not open");
        IntPtr hwnd = IntPtr.Zero; form!.Invoke(() => hwnd = form.Handle);
        form.Invoke(() => { form.Activate(); form.TopMost = true; });
        Thread.Sleep(500); Native.Foreground(hwnd);
        duplicator.SetRegion(ClientScreenRect(hwnd));
        var rect = ClientScreenRect(hwnd); int cx = rect.X + rect.Width / 2, cy = rect.Y + rect.Height / 2;
        Thread.Sleep(800);
        var samples = new List<object>(); var latency = new List<double>(); var arrival = new List<double>();
        for (int i = 0; i < config.Repeats + 5; i++)
        {
            Thread.Sleep(450);
            var baseline = duplicator.Latest ?? throw new InvalidOperationException("No baseline frame");
            Native.SetCursorPos(cx, cy); Thread.Sleep(40);
            var inputs = new[] { new Native.Input { Mouse = new Native.MouseInput { Flags = 2 } }, new Native.Input { Mouse = new Native.MouseInput { Flags = 4 } } };
            double sent = Now();
            if (Native.SendInput(2, inputs, Marshal.SizeOf<Native.Input>()) != 2) throw new InvalidOperationException("Input dispatch failed");
            Frame? changed = null; double deadline = Now() + 2000;
            while (changed == null && Now() < deadline)
            {
                changed = duplicator.Snapshot().FirstOrDefault(f => f.PresentMs >= sent && Duplicator.Diff(f.Grid, baseline.Grid) > 20);
                if (changed == null) Thread.Sleep(2);
            }
            if (changed == null) throw new InvalidOperationException("Colour flip never presented");
            bool warmup = i < 5;
            samples.Add(new { i, warmup, inputToPresentMs = changed.PresentMs - sent, presentToArrivalMs = changed.ArrivedMs - changed.PresentMs });
            if (!warmup) { latency.Add(changed.PresentMs - sent); arrival.Add(changed.ArrivedMs - changed.PresentMs); }
        }
        form.Invoke(() => form.Close());
        latency.Sort(); arrival.Sort();
        double P(List<double> v, double q) => v[Math.Min(v.Count - 1, (int)Math.Ceiling(q * v.Count) - 1)];
        result["inputToPresentMs"] = new { n = latency.Count, median = P(latency, .5), p95 = P(latency, .95), min = latency[0], max = latency[^1] };
        result["presentToArrivalMs"] = new { median = P(arrival, .5), p95 = P(arrival, .95) };
        result["samples"] = samples; result["status"] = "passed";
        return 0;
    }
}
