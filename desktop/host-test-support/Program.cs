using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Windows.Automation;

// Correctness only: no performance sampling, screenshots or framework ranking.
internal static class Program
{
    private delegate bool EnumWindowsProc(nint hwnd,nint data);
    [DllImport("user32.dll")] private static extern bool EnumWindows(EnumWindowsProc callback,nint data);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(nint hwnd,out uint pid);
    [DllImport("user32.dll")] private static extern bool PostMessageW(nint hwnd,uint msg,nuint wp,nint lp);
    [DllImport("user32.dll")] private static extern bool ShowWindow(nint hwnd,int command);

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
        Until(()=>root.FindFirst(TreeScope.Descendants,type is null
            ?new PropertyCondition(AutomationElement.NameProperty,name)
            :new AndCondition(new PropertyCondition(AutomationElement.NameProperty,name),new PropertyCondition(AutomationElement.ControlTypeProperty,type))),name);
    private static void Click(AutomationElement document,string name)
    {
        var button=Named(document,name,ControlType.Button);
        Until(()=>button.Current.IsEnabled?button:null,"enabled "+name);
        ((InvokePattern)button.GetCurrentPattern(InvokePattern.Pattern)).Invoke();
    }
    private static int Main(string[] args)
    {
        if(args.Length<3){Console.Error.WriteLine("NativeSmoke <exe> <profile-directory> <report.json> [extra application args...]");return 2;}
        var start=new ProcessStartInfo(Path.GetFullPath(args[0])){UseShellExecute=false,WorkingDirectory=Path.GetDirectoryName(Path.GetFullPath(args[0]))!,WindowStyle=ProcessWindowStyle.Hidden};
        start.ArgumentList.Add("--profile");start.ArgumentList.Add(Path.GetFullPath(args[1]));
        foreach(var value in args.Skip(3))start.ArgumentList.Add(value);
        using var process=Process.Start(start)??throw new InvalidOperationException("Launch failed");
        nint window=0;bool passed=false;string? failure=null;
        try
        {
            var root=Until(()=>{
                if(process.HasExited)throw new InvalidOperationException("App exited during startup");
                EnumWindows((hwnd,_)=>{GetWindowThreadProcessId(hwnd,out var pid);if(pid==(uint)process.Id)window=hwnd;return true;},0);
                return window==0?null:AutomationElement.FromHandle(window);
            },"application window");
            // Show only the task-owned application so controls are exercised visibly.
            ShowWindow(window,5);
            var document=Until(()=>root.FindFirst(TreeScope.Descendants,new PropertyCondition(AutomationElement.ControlTypeProperty,ControlType.Document)),"document");
            Named(document,"Ready");
            Click(document,"About this test");Named(document,"Close",ControlType.Button);Click(document,"Close");
            Click(document,"Simulate encryption");Named(document,"Simulation complete. No file was changed.");
            Click(document,"Reset");Named(document,"Ready");
            Click(document,"Simulate decryption");Click(document,"Cancel");Named(document,"Simulation canceled.");
            Click(document,"Reset");Named(document,"Ready");passed=true;
        }
        catch(Exception error){failure=error.GetType().Name+": "+error.Message;}
        finally
        {
            if(window!=0)PostMessageW(window,0x10,0,0);
            if(!process.WaitForExit(15000)){passed=false;failure="Host did not exit after WM_CLOSE";process.Kill();process.WaitForExit();}
            if(process.ExitCode!=0){passed=false;failure??="Nonzero host exit";}
            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(args[2]))!);
            File.WriteAllText(args[2],JsonSerializer.Serialize(new {passed,failure,exitCode=process.ExitCode,scope="production UIA correctness only; helper tree, accessibility and performance not accepted"},new JsonSerializerOptions{WriteIndented=true}));
        }
        Console.WriteLine(passed?"PASS production UIA workflow":"FAIL "+failure);
        return passed?0:1;
    }
}
