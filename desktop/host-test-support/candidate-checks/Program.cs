using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;
using FlaUI.Core.AutomationElements;
using FlaUI.Core.Definitions;
using FlaUI.UIA3;

internal sealed record Config(string App,string Runner,string Assets,string Profile,string Output,string[] Arguments,bool NativeUi=false,bool LayoutOnly=false,string? EngineKind=null,int SemanticTimeoutMs=30000,int UiaTimeoutSeconds=3);
internal static class CandidateChecks

{
    static readonly JsonSerializerOptions Json=new(){PropertyNamingPolicy=JsonNamingPolicy.CamelCase,WriteIndented=true};
    static readonly UIA3Automation Automation=new(){ConnectionTimeout=TimeSpan.FromSeconds(3),TransactionTimeout=TimeSpan.FromSeconds(3)};
    static nint window;
    static bool nativeUi;
    static bool flutterUi;
    static bool wxUi;
    static int semanticTimeoutMs=30000;
    static double inputAt;
    static readonly List<object> ProviderGaps=new();
    static readonly List<object> InputTargets=new();
    static T Read<T>(Func<T> query){for(int attempt=1;;attempt++)try{return query();}catch(COMException error){ProviderGaps.Add(new{atMs=Now(),hresult=error.HResult,attempt,readOnly=true});if(attempt>=10)throw;Thread.Sleep(20);}catch(TimeoutException error) when(error.Message.Contains("UIA",StringComparison.Ordinal)){ProviderGaps.Add(new{atMs=Now(),uiaTimeout=true,attempt,readOnly=true});if(attempt>=3)throw;Thread.Sleep(20);}catch(FlaUI.Core.Exceptions.ElementNotAvailableException){ProviderGaps.Add(new{atMs=Now(),unavailable=true,attempt,readOnly=true});if(attempt>=10)throw;Thread.Sleep(20);}}
    static double Now()=>Stopwatch.GetTimestamp()*1000.0/Stopwatch.Frequency;
    static void Wait(Func<bool> query,int timeout=0){double end=Now()+(timeout==0?semanticTimeoutMs:timeout);while(!Read(query)){if(Now()>end)throw new TimeoutException("Workload semantic endpoint");Thread.Sleep(5);}}
    static AutomationElement? Document(){
        if(wxUi){var root=Automation.FromHandle(window);var dialog=Automation.GetDesktop().FindFirstChild(cf=>cf.ByProcessId(root.Properties.ProcessId.Value).And(cf.ByName("About this test")));if(dialog!=null)return dialog;var work=root.FindFirstChild(cf=>cf.ByAutomationId("6000"));return work?.Properties.IsOffscreen.ValueOrDefault==false?work:root;}
        return flutterUi?Automation.FromHandle(window).FindFirstChild(cf=>cf.ByControlType(ControlType.Pane)):nativeUi?Automation.FromHandle(window):Automation.FromHandle(window).FindFirstDescendant(cf=>cf.ByControlType(ControlType.Document));
    }
    static AutomationElement? Named(string name,ControlType type){var document=Document();if(wxUi&&document?.Properties.AutomationId.ValueOrDefault=="6000")return document.FindFirstChild(cf=>cf.ByName(name).And(cf.ByControlType(type)));return nativeUi&&!flutterUi&&!wxUi&&name=="Close"?(Id("about-close")??Id("CloseButton")):document?.FindFirstDescendant(cf=>cf.ByName(name).And(cf.ByControlType(type)));}
    static AutomationElement? Id(string id){
        if(wxUi)return id switch{
            "decrypt"=>Named("Simulate decryption",ControlType.Button),
            "encrypt"=>Named("Simulate encryption",ControlType.Button),
            "workload-rows"=>Document()?.FindFirstChild(cf=>cf.ByAutomationId("6001")),
            "workload-summary"=>Document()?.FindFirstChild(cf=>cf.ByAutomationId("6002")),
            _=>Document()?.FindFirstDescendant(cf=>cf.ByAutomationId(id))};
        if(!flutterUi)return Document()?.FindFirstDescendant(cf=>cf.ByAutomationId(id));
        // Flutter 3.47 Windows does not expose Semantics.identifier as AutomationId.
        // Use its actual public names/roles, not an application test endpoint.
        return id switch{
            "decrypt"=>Named("Simulate decryption",ControlType.Button),
            "encrypt"=>Named("Simulate encryption",ControlType.Button),
            "workload-rows"=>Named("Synthetic rows",ControlType.Group),
            "workload-summary"=>Document()?.FindFirstDescendant(cf=>cf.ByName(" rows; tick ",PropertyConditionFlags.MatchSubstring).And(cf.ByControlType(ControlType.Text))),
            _=>Document()?.FindFirstDescendant(cf=>cf.ByAutomationId(id))};
    }
    static void Click(AutomationElement element)
    {
        if(!Native.Foreground(window))throw new InvalidOperationException("Foreground lost");
        if(element.Patterns.ScrollItem.IsSupported)element.Patterns.ScrollItem.Pattern.ScrollIntoView();
        // Correctness checks only: let native visibility/scroll layout reach the
        // presentation tree before using UIA's screen rectangle for real input.
        if(nativeUi)Thread.Sleep(75);
        var rect=Read(()=>element.Properties.BoundingRectangle.Value);
        InputTargets.Add(new{name=element.Name,x=rect.X,y=rect.Y,width=rect.Width,height=rect.Height});
        if(element.Properties.IsOffscreen.ValueOrDefault||rect.Width<1||rect.Height<1)throw new InvalidOperationException("Offscreen input target");
        Native.SetCursorPos((int)(rect.X+rect.Width/2),(int)(rect.Y+rect.Height/2));
        // Winit consumes CursorMoved before MouseInput; allow the independent
        // SetCursorPos message to reach the native loop before pressing. This
        // is correctness input delivery, not part of comparative timing.
        if(nativeUi)Thread.Sleep(40);
        var inputs=new[]{new Native.Input{Mouse=new Native.MouseInput{Flags=2}},new Native.Input{Mouse=new Native.MouseInput{Flags=4}}};
        inputAt=Now();if(Native.SendInput(2,inputs,Marshal.SizeOf<Native.Input>())!=2)throw new InvalidOperationException("Pointer input failed");
    }
    static void Button(string name){AutomationElement? element=null;try{Wait(()=>{element=Named(name,ControlType.Button);return element is not null&&element.Properties.IsEnabled.ValueOrDefault;});}catch(TimeoutException error){throw new InvalidOperationException("Button unavailable: "+name,error);}Click(element!);if(name=="Stop"&&element!.Properties.HelpText.ValueOrDefault=="Updates active")Wait(()=>Named("Stop",ControlType.Button)?.Properties.HelpText.ValueOrDefault=="Updates stopped");}
    static string Summary()=>nativeUi?(Id("workload-summary")?.Properties.Name.ValueOrDefault??""):string.Join("",(Id("workload-summary")?.FindAllDescendants(cf=>cf.ByControlType(ControlType.Text))??[]).Select(e=>e.Properties.Name.ValueOrDefault));
    static bool Summary(int count,int tick)=>Summary()==$"{count} rows; tick {tick}";
    static int? Tick(int count){var text=Summary();var prefix=$"{count} rows; tick ";return text.StartsWith(prefix,StringComparison.Ordinal)&&int.TryParse(text[prefix.Length..],out var tick)?tick:null;}
    static int? FirstId()
    {
        var row=wxUi?Id("workload-rows")?.FindFirstChild(cf=>cf.ByControlType(ControlType.ListItem)):nativeUi?Id("workload-rows")?.FindFirstDescendant(cf=>cf.ByControlType(ControlType.Text)):Id("workload-rows")?.FindFirstChild(cf=>cf.ByControlType(ControlType.ListItem));
        if(row is null)return null; // A reset can temporarily detach row peers.
        var text=row.Properties.Name.ValueOrDefault??"";
        if(!text.Contains("row-",StringComparison.Ordinal))text=string.Join("",row.FindAllDescendants(cf=>cf.ByControlType(ControlType.Text)).Select(e=>e.Properties.Name.ValueOrDefault));
        var first=text.IndexOf("row-",StringComparison.Ordinal);if(first<0)return null;
        first+=4;var end=first;while(end<text.Length&&char.IsAsciiDigit(text[end]))end++;return int.TryParse(text[first..end],out var id)?id:null;
    }
    [StructLayout(LayoutKind.Sequential)] struct Key {public ushort Vk,Scan;public uint Flags,Time;public nuint Extra;}
    [StructLayout(LayoutKind.Explicit,Size=40)] struct KeyInput{[FieldOffset(0)]public uint Type;[FieldOffset(8)]public Key Key;}
    [DllImport("user32.dll",EntryPoint="SendInput")]static extern uint Keys(uint count,KeyInput[] input,int size);
    [DllImport("user32.dll")]static extern uint MapVirtualKeyW(uint code,uint type);
    static void Query(string text)
    {
        var edit=Read(()=>Named("Filter synthetic rows",ControlType.Edit))??throw new InvalidOperationException("Missing filter");
        Click(edit);
        Wait(()=>edit.Properties.HasKeyboardFocus.ValueOrDefault);
        var keys=new List<KeyInput>();
        void KeyEvent(ushort vk,bool up=false)=>keys.Add(new KeyInput{Type=1,Key=new Key{Vk=vk,Scan=(ushort)MapVirtualKeyW(vk,0),Flags=up?2u:0u}});
        void Flush(){if(Keys((uint)keys.Count,keys.ToArray(),Marshal.SizeOf<KeyInput>())!=keys.Count)throw new InvalidOperationException("Selection input failed");keys.Clear();Thread.Sleep(50);}
        if(flutterUi){KeyEvent(0xA2);Flush();KeyEvent(0x41);KeyEvent(0x41,true);Flush();KeyEvent(0xA2,true);Flush();}
        else {KeyEvent(0x11);KeyEvent(0x41);KeyEvent(0x41,true);KeyEvent(0x11,true);}
        KeyEvent(8);KeyEvent(8,true);
        if(flutterUi){if(Keys((uint)keys.Count,keys.ToArray(),Marshal.SizeOf<KeyInput>())!=keys.Count)throw new InvalidOperationException("Delete input failed");keys.Clear();Thread.Sleep(50);}
        foreach(char ch in text){keys.Add(new KeyInput{Type=1,Key=new Key{Scan=ch,Flags=4}});keys.Add(new KeyInput{Type=1,Key=new Key{Scan=ch,Flags=6}});}
        inputAt=Now();if(Keys((uint)keys.Count,keys.ToArray(),Marshal.SizeOf<KeyInput>())!=keys.Count)throw new InvalidOperationException("Keyboard input failed");
    }
    [MTAThread]static int Main(string[] args)
    {
        var config=JsonSerializer.Deserialize<Config>(File.ReadAllText(args[0]),new JsonSerializerOptions{PropertyNameCaseInsensitive=true})!;
        nativeUi=config.NativeUi;wxUi=config.App=="Wx";flutterUi=config.EngineKind?.StartsWith("Flutter",StringComparison.Ordinal)==true;semanticTimeoutMs=config.SemanticTimeoutMs;Automation.TransactionTimeout=TimeSpan.FromSeconds(config.UiaTimeoutSeconds);Directory.CreateDirectory(config.Output);Native.SetProcessDpiAwarenessContext(-4);Native.GetCursorPos(out var original);
        var report=new Dictionary<string,object?>{["config"]=config,["automation"]="UIA3",["scope"]="reference feature correctness only; not comparative timing, scripting or physical paint"};
        using(var binary=File.OpenRead(config.Runner))report["runnerSha256"]=Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(binary));
        var actions=new List<object>();var known=new Dictionary<int,DateTime>();var gate=new object();bool stop=false;Process? process=null;Thread? discovery=null;int exit=1;
        bool Alive(int pid,DateTime time){try{using var p=Process.GetProcessById(pid);return !p.HasExited&&p.StartTime.ToUniversalTime()==time;}catch(ArgumentException){return false;}}
        try
        {
            var start=new ProcessStartInfo(config.Runner){UseShellExecute=false,CreateNoWindow=true,WorkingDirectory=Path.GetDirectoryName(config.Runner)!};
            foreach(var key in start.Environment.Keys.Where(k=>k.StartsWith("WEBVIEW2_",StringComparison.OrdinalIgnoreCase)).ToArray())start.Environment.Remove(key);
            foreach(var value in config.Arguments.Concat(nativeUi?Array.Empty<string>():new[]{"--profile",config.Profile}))start.ArgumentList.Add(value);
            process=Process.Start(start)??throw new InvalidOperationException("Launch failed");_=process.Handle;known[process.Id]=process.StartTime.ToUniversalTime();
            discovery=new Thread(()=>{
                while(!Volatile.Read(ref stop)){
                    DateTime? Created(int pid){try{using var p=Process.GetProcessById(pid);return p.HasExited?null:p.StartTime.ToUniversalTime();}catch{return null;}}
                    lock(gate)ProcessTree.Expand(known,Native.Processes().Select(p=>new ProcessTree.Edge((int)p.Pid,(int)p.Parent)),Created);
                    Thread.Sleep(100);
                }
            }){IsBackground=true};discovery.Start();
            Wait(()=>{window=Native.Window(process.Id);return window!=0;});
            Wait(()=>{try{Automation.FromHandle(window).FrameworkAutomationElement.SetFocus();}catch(COMException){}return Native.Foreground(window);},3000);
            Native.GetClientRect(window,out var client);Native.GetWindowRect(window,out var outer);var dpi=Native.GetDpiForWindow(window);
            if(client.Right!=960*dpi/96||client.Bottom!=640*dpi/96)Native.SetWindowPos(window,0,0,0,(int)(outer.Right-outer.Left+960*dpi/96-client.Right),(int)(outer.Bottom-outer.Top+640*dpi/96-client.Bottom),0x16);
            Wait(()=>Named("Ready",ControlType.Text)!=null);
            if(!config.LayoutOnly){
            
            Button("About this test");Wait(()=>Named("Close",ControlType.Button)!=null);
            void Escape(){var keys=new[]{new KeyInput{Type=1,Key=new Key{Vk=27}},new KeyInput{Type=1,Key=new Key{Vk=27,Flags=2}}};Keys(2,keys,Marshal.SizeOf<KeyInput>());}
            Escape();Wait(()=>Named("About this test",ControlType.Button)?.Properties.HasKeyboardFocus.ValueOrDefault==true);
            Button("About this test");Button("Close");Wait(()=>Named("About this test",ControlType.Button)?.Properties.HasKeyboardFocus.ValueOrDefault==true);
            Button("Simulate encryption");Wait(()=>Named("Simulation complete. No file was changed.",ControlType.Text)!=null);
            Button("Reset");Wait(()=>Named("Ready",ControlType.Text)!=null);
            Button("Simulate decryption");Button("Cancel");Wait(()=>Named("Simulation canceled.",ControlType.Text)!=null);
            Button("Reset");Wait(()=>Named("Ready",ControlType.Text)!=null);
            report["mainChecks"]="About Escape/Close/focus; encrypt complete; decrypt cancel; reset";
            Button("Open workbench");
            Wait(()=>Named("Workbench ready",ControlType.Text)!=null);
            var remount=Named("Remount workload",ControlType.Button)??throw new InvalidOperationException("Supplemental assets absent");
            if(remount.Patterns.ScrollItem.IsSupported)remount.Patterns.ScrollItem.Pattern.ScrollIntoView();Thread.Sleep(1000);
            void Measure(string name,Action action,Func<bool> done){double requested=Now();action();double sent=inputAt;Wait(done);actions.Add(new{name,inputToUiaObservedMs=Now()-sent,requestToUiaMs=Now()-requested});}
            Measure("replace-10000",()=>Button("10,000 rows"),()=>Summary(10000,0)&&FirstId()==1000);
            Measure("replace-1000",()=>Button("1,000 rows"),()=>Summary(1000,0)&&FirstId()==11000);
            Measure("reverse-1000",()=>Button("Reverse"),()=>FirstId()==11999);
            Measure("splice-10",()=>Button("Splice 10"),()=>FirstId()==12000);
            Measure("update-10-percent",()=>Button("Update 10%"),()=>Summary(1000,1));
            Measure("filter-to-one",()=>Query("row-12000 "),()=>Summary(1,1));
            Measure("filter-clear",()=>Query(""),()=>Summary(1000,1));
            Button("30 Hz / 2 s");
            Measure("filter-during-30hz-requested",()=>Query("row-12000 "),()=>Tick(1)>1);
            Button("Stop");report["tickAfterStop"]=Read(()=>Tick(1));
            Measure("remount",()=>Button("Remount workload"),()=>Summary(1000,0)&&FirstId()==0);
            
            foreach (var hz in new[]{10,60}) {
                Button($"{hz} Hz / 2 s"); Wait(()=>Tick(1000)>2);
                Button("Stop"); var stopped=Read(()=>Tick(1000)); Thread.Sleep(250);
                if(Read(()=>Tick(1000))!=stopped)throw new InvalidOperationException("Stop left a visible timer running");
            }
            Query("not-present");Wait(()=>Tick(0)!=null);Query("");Wait(()=>Tick(1000)!=null);
            if(config.App=="Qt"){
                Query("שלום");Wait(()=>Tick(1000)!=null);
                Query("row-0 שלום");Wait(()=>Tick(1)!=null);
                Named("Filter synthetic rows",ControlType.Edit)!.AsTextBox().Text="שלום 🌠";
                Wait(()=>Tick(0)!=null);
                Wait(()=>Named("Filter synthetic rows",ControlType.Edit)!.AsTextBox().Text=="שלום 🌠");
                Query("");Wait(()=>Tick(1000)!=null);
                report["unicodeChecks"]="real Hebrew keyboard filter/bidi exact match; accessible ValuePattern supplementary-character roundtrip updates the model; synthetic surrogate-key packets and real IME composition are separate unaccepted paths";
            }
            Button("30 Hz / 2 s");Wait(()=>Tick(1000)>2);Button("Back to main screen");
            Wait(()=>Named("Open workbench",ControlType.Button)?.Properties.HasKeyboardFocus.ValueOrDefault==true);
            Button("Open workbench");Wait(()=>Named("Workbench ready",ControlType.Text)!=null);
            Wait(()=>Summary(1000,0)&&FirstId()==0);Thread.Sleep(250);
            if(!Read(()=>Summary(1000,0)))throw new InvalidOperationException("Reopened workbench received stale ticks");
            Button("Back to main screen");
            Wait(()=>Named("Open workbench",ControlType.Button)?.Properties.HasKeyboardFocus.ValueOrDefault==true);
            Button("Simulate encryption");
            Wait(()=>Named("Simulation complete. No file was changed.",ControlType.Text)!=null);
            Button("Reset");Wait(()=>Named("Ready",ControlType.Text)!=null);
            report["extraChecks"]="10/60 Hz update and Stop; empty filter; close while burst active; fresh reopen/reset IDs and tick; focus restoration; main workflow after workbench";
            }
            void ResizeClient(int width,int height){Native.GetClientRect(window,out var c);Native.GetWindowRect(window,out var w);Native.SetWindowPos(window,0,20,20,(int)(w.Right-w.Left+width*dpi/96-c.Right),(int)(w.Bottom-w.Top+height*dpi/96-c.Bottom),0x14);Thread.Sleep(200);}
            void Capture(string name){Native.GetWindowRect(window,out var r);using var bitmap=new System.Drawing.Bitmap(r.Right-r.Left,r.Bottom-r.Top);using var graphics=System.Drawing.Graphics.FromImage(bitmap);graphics.CopyFromScreen(r.Left,r.Top,0,0,bitmap.Size);bitmap.Save(Path.Combine(config.Output,name),System.Drawing.Imaging.ImageFormat.Png);}
            Button("About this test");Wait(()=>Named("Close",ControlType.Button)?.Properties.HasKeyboardFocus.ValueOrDefault==true);
            var tab=new[]{new KeyInput{Type=1,Key=new Key{Vk=9}},new KeyInput{Type=1,Key=new Key{Vk=9,Flags=2}}};Keys(2,tab,Marshal.SizeOf<KeyInput>());
            Wait(()=>Named("Close",ControlType.Button)?.Properties.HasKeyboardFocus.ValueOrDefault==true);
            Button("Close");Wait(()=>Named("About this test",ControlType.Button)?.Properties.HasKeyboardFocus.ValueOrDefault==true);
            ResizeClient(480,640);
            if(config.App=="Qt"){
                bool reached=false;
                for(int i=0;i<16;i++){
                    Keys(2,tab,Marshal.SizeOf<KeyInput>());Thread.Sleep(40);
                    var target=Id("encrypt");
                    if(target?.Properties.HasKeyboardFocus.ValueOrDefault==true){
                        if(target.Properties.IsOffscreen.ValueOrDefault)throw new InvalidOperationException("Keyboard focus did not reveal the offscreen card");
                        reached=true;break;
                    }
                }
                if(!reached)throw new InvalidOperationException("Tab could not reach encryption in the narrow layout");
                Named("About this test",ControlType.Button)!.FrameworkAutomationElement.SetFocus();
                Wait(()=>Named("About this test",ControlType.Button)!.Properties.HasKeyboardFocus.ValueOrDefault);
                report["keyboardScroll"]="Tab reached the lower encryption button and scrolled it into view; focus restored to About";
            }
            if(config.EngineKind?.Contains("WinUI",StringComparison.Ordinal)==true){
                System.Drawing.RectangleF VisibleBounds(string id){var element=Id(id)!;element.Patterns.ScrollItem.Pattern.ScrollIntoView();System.Drawing.RectangleF rect=default;Wait(()=>{rect=element.Properties.BoundingRectangle.ValueOrDefault;return rect.Width>0&&rect.Height>0&&!element.Properties.IsOffscreen.ValueOrDefault;});return rect;}
                var scroll=Id("PageScroll")!.Patterns.Scroll.Pattern;
                var decrypt=VisibleBounds("decrypt");var before=scroll.VerticalScrollPercent.Value;
                var encrypt=VisibleBounds("encrypt");var after=scroll.VerticalScrollPercent.Value;
                report["narrowGeometry"]=new{decryptX=decrypt.X,decryptY=decrypt.Y,decryptWidth=decrypt.Width,encryptX=encrypt.X,encryptY=encrypt.Y,encryptWidth=encrypt.Width,before,after};
                if(Math.Abs(decrypt.X-encrypt.X)>2||(after<=before&&encrypt.Y<decrypt.Bottom))throw new InvalidOperationException("Narrow WinUI cards did not stack with vertical scrolling");
                scroll.SetScrollPercent(-1,0);
                Wait(()=>scroll.VerticalScrollPercent.Value<=0.1);
                Thread.Sleep(200); // Visual QA after native scroll presentation.
            }else if(config.App=="Slint"){
                // AccessKit omits fully clipped items. Bring both controls into
                // view with real wheel input before comparing screen geometry.
                void Wheel(int delta){Native.GetWindowRect(window,out var frame);Native.SetCursorPos(frame.Right-90,(frame.Top+frame.Bottom)/2);Thread.Sleep(40);var wheel=new[]{new Native.Input{Mouse=new Native.MouseInput{Data=unchecked((uint)delta),Flags=0x0800}}};if(Native.SendInput(1,wheel,Marshal.SizeOf<Native.Input>())!=1)throw new InvalidOperationException("Wheel input failed");Thread.Sleep(100);}
                int steps=0;while(Read(()=>Id("encrypt"))==null&&steps<12){Wheel(-120);steps++;}
                Wait(()=>{var d=Id("decrypt");var e=Id("encrypt");if(d==null||e==null)return false;var dr=d.Properties.BoundingRectangle.Value;var er=e.Properties.BoundingRectangle.Value;return Math.Abs(dr.X-er.X)<2&&er.Y>=dr.Bottom;});
                report["narrowGeometry"]=new{method="real wheel input; both clipped-tree controls visible",steps};
                for(int i=0;i<steps+2;i++)Wheel(120);
            }else Wait(()=>{var d=Id("decrypt");var e=Id("encrypt");return d!=null&&e!=null&&e.Properties.BoundingRectangle.Value.Y>=d.Properties.BoundingRectangle.Value.Bottom;});
            Capture("narrow.png");
            ResizeClient(960,640);Wait(()=>Named("Ready",ControlType.Text)!=null);
            report["layoutChecks"]="dialog Tab remains in content; 480 DIP two-card stacking; restored 960 DIP client width";
            report["dpi"]=dpi;
            report["engineKind"]=config.EngineKind??(nativeUi?"Avalonia/Skia":"Electron/Chromium");
            using(var host=Process.GetProcessById(process.Id))report["hostFileVersion"]=host.MainModule!.FileVersionInfo.FileVersion;
            // UIA state can precede physical paint; this is only visual QA.
            Thread.Sleep(200);
            Capture("main.png");
            report["status"]="passed";exit=0;
        }
        catch(Exception error){try{if(window!=0){Native.GetWindowRect(window,out var frame);using var snapshot=new System.Drawing.Bitmap(frame.Right-frame.Left,frame.Bottom-frame.Top);using var graphics=System.Drawing.Graphics.FromImage(snapshot);graphics.CopyFromScreen(frame.Left,frame.Top,0,0,snapshot.Size);snapshot.Save(Path.Combine(config.Output,"failure.png"),System.Drawing.Imaging.ImageFormat.Png);}}catch{}report["status"]="failed";report["error"]=error.GetType().Name+": "+error.Message;report["stack"]=error.StackTrace;try{report["lastTree"]=Document()?.FindAllDescendants().Take(120).Select(e=>new{type=e.Properties.ControlType.ValueOrDefault.ToString(),name=e.Properties.Name.ValueOrDefault,id=e.Properties.AutomationId.ValueOrDefault,enabled=e.Properties.IsEnabled.ValueOrDefault,focus=e.Properties.HasKeyboardFocus.ValueOrDefault,offscreen=e.Properties.IsOffscreen.ValueOrDefault}).ToArray();}catch{}}
        finally
        {
            if(window!=0)Native.PostMessageW(window,0x10,0,0);
            bool closed=process==null||process.WaitForExit(30000);Volatile.Write(ref stop,true);discovery?.Join(3000);
            double deadline=Now()+30000;while(Now()<deadline&&known.Any(p=>Alive(p.Key,p.Value)))Thread.Sleep(100);
            bool helpers=!known.Any(p=>Alive(p.Key,p.Value));report["hostExited"]=closed;report["helpersExited"]=helpers;report["exitCode"]=process?.HasExited==true?process.ExitCode:null;
            if(!closed||!helpers||(process!=null&&process.ExitCode!=0)){report["status"]="failed";report["cleanupFailure"]="Host/helper shutdown or exit-code failure";exit=1;}
            report["inputTargets"]=InputTargets;report["providerGaps"]=ProviderGaps;report["actions"]=actions;report["processIdentities"]=known.Select(p=>new{pid=p.Key,startUtc=p.Value}).ToArray();File.WriteAllText(Path.Combine(config.Output,"result.json"),JsonSerializer.Serialize(report,Json));
            Native.SetCursorPos(original.X,original.Y);process?.Dispose();Automation.Dispose();
        }
        Console.WriteLine(JsonSerializer.Serialize(new{config.App,status=report["status"],output=config.Output}));return exit;
    }
}
