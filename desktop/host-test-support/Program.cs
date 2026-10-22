using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Windows.Automation;

// Correctness only: no performance sampling, screenshots or framework ranking.
internal static class Program
{
    private delegate bool EnumWindowsProc(nint hwnd,nint data);
    [DllImport("user32.dll")] private static extern bool EnumWindows(EnumWindowsProc callback,nint data);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(nint hwnd,out uint pid);
    [DllImport("user32.dll",CharSet=CharSet.Unicode)] private static extern int GetWindowTextW(nint hwnd,StringBuilder text,int count);
    [DllImport("user32.dll")] private static extern bool PostMessageW(nint hwnd,uint msg,nuint wp,nint lp);
    [DllImport("user32.dll")] private static extern bool ShowWindow(nint hwnd,int command);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(nint hwnd);
    [DllImport("user32.dll")] private static extern bool SetForegroundWindow(nint hwnd);
    [DllImport("user32.dll")] private static extern nint GetForegroundWindow();
    [DllImport("user32.dll")] private static extern nint GetAncestor(nint hwnd,uint flags);
    [DllImport("kernel32.dll")] private static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] private static extern bool AttachThreadInput(uint first,uint second,bool attach);
    [DllImport("user32.dll")] private static extern bool BringWindowToTop(nint hwnd);
    [DllImport("user32.dll")] private static extern nint SetFocus(nint hwnd);
    [DllImport("user32.dll")] private static extern bool SetCursorPos(int x,int y);
    [DllImport("user32.dll")] private static extern bool SetProcessDpiAwarenessContext(nint context);
    [StructLayout(LayoutKind.Sequential)] private struct MouseInput {public int X,Y;public uint Data,Flags,Time;public nuint Extra;}
    [StructLayout(LayoutKind.Explicit,Size=40)] private struct Input { [FieldOffset(0)] public uint Type;[FieldOffset(8)] public MouseInput Mouse; }
    [DllImport("user32.dll")] private static extern uint SendInput(uint count,Input[] input,int size);
    private static nint currentWindow;
    private static bool Foreground(nint window)
    {
        uint own=GetCurrentThreadId(),foreground=GetWindowThreadProcessId(GetForegroundWindow(),out _),target=GetWindowThreadProcessId(window,out _);
        bool linkedForeground=own!=foreground&&AttachThreadInput(own,foreground,true);
        bool linkedTarget=own!=target&&target!=foreground&&AttachThreadInput(own,target,true);
        try {BringWindowToTop(window);SetForegroundWindow(window);SetFocus(window);}
        finally {if(linkedTarget)AttachThreadInput(own,target,false);if(linkedForeground)AttachThreadInput(own,foreground,false);}
        return GetAncestor(GetForegroundWindow(),2)==window;
    }

    private static T Until<T>(Func<T?> query,string label) where T:class
    {
        var until=Stopwatch.StartNew();
        while(until.Elapsed<TimeSpan.FromSeconds(30))
        {
            try { if(query() is T value)return value; }
            catch(ElementNotAvailableException){}
            catch(COMException){}
            Thread.Sleep(100);
        }
        throw new InvalidOperationException("Timed out: "+label);
    }
    private static AutomationElement Named(AutomationElement root,string name,ControlType? type=null)=>
        Until(()=>root.FindFirst(TreeScope.Descendants,new AndCondition(new PropertyCondition(AutomationElement.IsOffscreenProperty,false),type is null
            ?new PropertyCondition(AutomationElement.NameProperty,name)
            :new AndCondition(new PropertyCondition(AutomationElement.NameProperty,name),new PropertyCondition(AutomationElement.ControlTypeProperty,type)))),name);
    private static void Click(AutomationElement document,string name)
    {
        var button=Named(document,name,ControlType.Button);
        Until(()=>button.Current.IsEnabled?button:null,"enabled "+name);
        Until(()=>Foreground(currentWindow)?button:null,"foreground");
        var rect=button.Current.BoundingRectangle;
        if(rect.Width<1 || rect.Height<1 || !SetCursorPos((int)(rect.X+rect.Width/2),(int)(rect.Y+rect.Height/2)))throw new InvalidOperationException("Invalid button bounds");
        var input=new[]{new Input{Mouse=new MouseInput{Flags=2}},new Input{Mouse=new MouseInput{Flags=4}}};
        if(SendInput(2,input,Marshal.SizeOf<Input>())!=2)throw new InvalidOperationException("Input dispatch failed");
    }
    private static int Main(string[] args)
    {
        if(args.Length<3){Console.Error.WriteLine("NativeSmoke <exe> <profile-directory> <report.json> [extra application args...]");return 2;}
        SetProcessDpiAwarenessContext(-4);
        var start=new ProcessStartInfo(Path.GetFullPath(args[0])){UseShellExecute=false,WorkingDirectory=Path.GetDirectoryName(Path.GetFullPath(args[0]))!,WindowStyle=ProcessWindowStyle.Normal};
        // Keep the tested child independent of automation-session browser overrides.
        // Do not modify the caller's or machine's environment, or print values.
        var removed=start.Environment.Keys.Where(key=>key.StartsWith("WEBVIEW2_",StringComparison.OrdinalIgnoreCase)).ToArray();
        foreach(var key in removed)start.Environment.Remove(key);
        Console.WriteLine("Child WebView2 override names removed: "+string.Join(", ",removed));
        start.ArgumentList.Add("--profile");start.ArgumentList.Add(Path.GetFullPath(args[1]));
        foreach(var value in args.Skip(3))start.ArgumentList.Add(value);
        using var process=Process.Start(start)??throw new InvalidOperationException("Launch failed");
        nint window=0;bool passed=false;string? failure=null;var observedNames=new List<string>();
        try
        {
            var root=Until(()=>{
                if(process.HasExited)throw new InvalidOperationException("App exited during startup");
                EnumWindows((hwnd,_)=>{
                    GetWindowThreadProcessId(hwnd,out var pid);
                    if(pid!=(uint)process.Id || !IsWindowVisible(hwnd))return true;
                    var title=new StringBuilder(256);GetWindowTextW(hwnd,title,title.Capacity);
                    if(!title.ToString().StartsWith("NeutronStar",StringComparison.Ordinal))return true;
                    window=hwnd;return false;
                },0);
                return window==0?null:AutomationElement.FromHandle(window);
            },"application window");
            // Show only the task-owned application so controls are exercised visibly.
            ShowWindow(window,5);
            currentWindow=window;
            // Frameworks may expose about:blank before replacing the document.
            // Do not retain that provisional UIA document while waiting for Ready.
            var document=Until(()=>{
                // WinUI can publish its HWND before its XAML/UIA provider is
                // attached. Reacquire the root as well as the web document.
                root=AutomationElement.FromHandle(window);
                foreach(AutomationElement candidate in root.FindAll(TreeScope.Descendants,new PropertyCondition(AutomationElement.ControlTypeProperty,ControlType.Document)))
                    if(candidate.FindFirst(TreeScope.Descendants,new AndCondition(new PropertyCondition(AutomationElement.NameProperty,"Ready"),new PropertyCondition(AutomationElement.IsOffscreenProperty,false))) is not null)return candidate;
                return null;
            },"ready document");
            Named(document,"Ready");
            Click(document,"About this test");Named(document,"Close",ControlType.Button);Click(document,"Close");
            Click(document,"Simulate encryption");Named(document,"Simulation complete. No file was changed.");
            Click(document,"Reset");Named(document,"Ready");
            Click(document,"Simulate decryption");Click(document,"Cancel");Named(document,"Simulation canceled.");
            Click(document,"Reset");Named(document,"Ready");passed=true;
        }
        catch(Exception error){
            failure=error.GetType().Name+": "+error.Message;
            try {if(window!=0)foreach(AutomationElement item in AutomationElement.FromHandle(window).FindAll(TreeScope.Descendants,Condition.TrueCondition)){
                var name=item.Current.Name;if(name.Length>0)observedNames.Add(name[..Math.Min(name.Length,4096)]);if(observedNames.Count>=80)break;
            }}catch(ElementNotAvailableException){}catch(COMException){}
        }
        finally
        {
            if(window!=0)PostMessageW(window,0x10,0,0);
            if(!process.WaitForExit(15000)){passed=false;failure="Host did not exit after WM_CLOSE";process.Kill();process.WaitForExit();}
            if(process.ExitCode!=0){passed=false;failure??="Nonzero host exit";}
            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(args[2]))!);
            File.WriteAllText(args[2],JsonSerializer.Serialize(new {passed,failure,exitCode=process.ExitCode,observedNames,removedWebView2Overrides=removed,scope="production UIA correctness only; helper tree, accessibility and performance not accepted"},new JsonSerializerOptions{WriteIndented=true}));
        }
        Console.WriteLine(passed?"PASS production UIA workflow":"FAIL "+failure);
        return passed?0:1;
    }
}
