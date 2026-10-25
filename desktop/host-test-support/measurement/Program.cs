using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading;
using FlaUI.Core.AutomationElements;
using FlaUI.Core.Definitions;
using FlaUI.UIA3;

internal sealed record Config(string App,string Assets,string Runner,string Launcher,string Profile,string Output,
    string Launch="direct",string Scenario="startup",int IdleSeconds=60,int ActionRepeats=20,int CaptureHz=20,
    string[]? Arguments=null,string[]? IdleOrder=null);
internal sealed class UiState {
    internal readonly object Gate=new();
    internal bool Ready; internal double? ReadyAt,ContentAt,LoadingAt;
    internal double MaxPollMs; internal int Polls; internal string? Error;
    internal readonly List<object> Trace=new();
}
internal static class Program {
    static readonly JsonSerializerOptions Json=new(){PropertyNamingPolicy=JsonNamingPolicy.CamelCase,WriteIndented=true};
    static readonly long Frequency=Stopwatch.Frequency;
    static double Now()=>Stopwatch.GetTimestamp()*1000.0/Frequency;
    static void Save(string path,object data)=>File.WriteAllText(path,JsonSerializer.Serialize(data,Json));
    static string Hash(string path)=>Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path))).ToLowerInvariant();
    static volatile bool stopUi;
    static readonly BlockingCollection<(Bitmap image,string path)> ImageQueue=new(32);
    static readonly List<string> ImageErrors=new();
    static int actionFrame=100000;
    static double lastInputSent;
    static readonly List<object> ActionProviderGaps=new();
    static T ReadAction<T>(Func<T> query) {
        for(int attempt=1;;attempt++)try{return query();}
        catch(System.Runtime.InteropServices.COMException error){ActionProviderGaps.Add(new{atMs=Now(),hresult=error.HResult,attempt,readOnly=true});if(attempt>=10)throw;Thread.Sleep(20);}
        catch(FlaUI.Core.Exceptions.ElementNotAvailableException){ActionProviderGaps.Add(new{atMs=Now(),unavailable=true,attempt,readOnly=true});if(attempt>=10)throw;Thread.Sleep(20);}
    }
    sealed class EarlyCloseProbe : Exception { }
    static readonly ThreadLocal<UIA3Automation> Automation=new(()=>new UIA3Automation {ConnectionTimeout=TimeSpan.FromSeconds(3),TransactionTimeout=TimeSpan.FromSeconds(3)});

    [MTAThread] static int Main(string[] args) {
        if(args.Length!=1) { Console.Error.WriteLine("One measurement-config JSON path required"); return 2; }
        Config config=JsonSerializer.Deserialize<Config>(File.ReadAllText(args[0]),new JsonSerializerOptions{PropertyNameCaseInsensitive=true})!;
        Directory.CreateDirectory(config.Output);
        var imageWriter=new Thread(()=> { foreach(var job in ImageQueue.GetConsumingEnumerable()) {
            using(job.image) try { job.image.Save(job.path,ImageFormat.Png); } catch(Exception error) { lock(ImageErrors) ImageErrors.Add(error.Message); }
        } }){IsBackground=true,Name="PNG-evidence-writer"}; imageWriter.Start();
        Native.SetProcessDpiAwarenessContext(new IntPtr(-4));
        Native.GetCursorPos(out var originalCursor);
        var result=new Dictionary<string,object?> { ["schema"]="neutronstar.six-host-measurement.v1",["config"]=config,["automationBackend"]="FlaUI.UIA3 5.0.0",
            ["captureMethod"]="GDI foreground client-area desktop copy; caption/borders excluded; not hardware scan-out",["physicalPresentationMs"]=null,
            ["explorerGestureMs"]=null,["hostSha256"]=Hash(config.Runner),["collectorPid"]=Environment.ProcessId,
            ["collectorSha256"]=Hash(typeof(Program).Assembly.Location),["qpcFrequency"]=Frequency };
        Process? host=null, launcher=null; IntPtr window=IntPtr.Zero;
        var identities=new Dictionary<int,DateTime>();
        var samples=new List<object>(); var frames=new List<object>(); var actions=new List<object>();
        var ui=new UiState(); Thread? uiThread=null;
        double start=Now(); long utcTicks=DateTime.UtcNow.Ticks; double afterUtc=Now();
        result["clockAnchor"]=new {qpcBeforeMs=start,qpcAfterMs=afterUtc,utcTicks,uncertaintyMs=afterUtc-start};
        string report=Path.Combine(config.Output,"host.jsonl"), receipt=Path.Combine(config.Output,"launch-receipt.json");
        int code=1;
        try {
            if(config.CaptureHz<1 || config.CaptureHz>60 || config.IdleSeconds<1 || config.IdleSeconds>120 || config.ActionRepeats<1 || config.ActionRepeats>30)
                throw new InvalidOperationException("Invalid bounded measurement configuration");
            using var pdh=new PrivateWorkingSet(); // Fail explicitly if private working-set counters are unavailable.
            pdh.Sample();
            var before=Native.Processes();
            result["prelaunchWebViewPids"]=before.Where(p=>p.Exe.Equals("msedgewebview2.exe",StringComparison.OrdinalIgnoreCase)).Select(p=>p.Pid).ToArray();
            var launchInfo=new ProcessStartInfo {UseShellExecute=false,CreateNoWindow=true};
            if(config.Launch=="powershell") {
                launchInfo.FileName=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),@"WindowsPowerShell\v1.0\powershell.exe");
                foreach(string arg in new[]{"-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-File",config.Launcher,"-ConfigPath",Path.GetFullPath(args[0]),"-ReceiptPath",receipt}) launchInfo.ArgumentList.Add(arg);
            } else if(config.Launch=="direct") {
                launchInfo.FileName=config.Runner;
                foreach(string arg in (config.Arguments??Array.Empty<string>()).Concat(new[]{"--profile",config.Profile})) launchInfo.ArgumentList.Add(arg);
            } else throw new InvalidOperationException("Unknown launch lane");
            foreach(string key in launchInfo.Environment.Keys.Where(key=>key.StartsWith("WEBVIEW2_",StringComparison.OrdinalIgnoreCase)).ToArray()) launchInfo.Environment.Remove(key);
            launchInfo.WorkingDirectory=Path.GetDirectoryName(config.Runner)!;
            double requested=Now(); launcher=Process.Start(launchInfo)!; double startReturned=Now();
            result["launchRequestedMs"]=requested-start;
            result["startCallMs"]=startReturned-requested;
            result["launcherStartUtc"]=launcher.StartTime.ToUniversalTime();
            int pid=config.Launch=="direct" ? launcher.Id : 0;
            if(pid!=0) host=launcher;
            double? windowAt=null; int frame=0,stableFrames=0; double? stableAt=null; string? previousFingerprint=null;
            double nextCapture=Now(),nextProcess=Now(),nextSample=Now();
            double? readyObserved=null;
            double collectorCpuStart=Process.GetCurrentProcess().TotalProcessorTime.TotalMilliseconds;
            while(Now()-requested<30000) {
                if(pid==0 && File.Exists(receipt)) {
                    using var data=JsonDocument.Parse(File.ReadAllText(receipt)); pid=data.RootElement.GetProperty("pid").GetInt32();
                    host=Process.GetProcessById(pid); _=host.Handle; result["powerShellReceipt"]=data.RootElement.Clone();
                    result["powerShellScriptStartMs"]=data.RootElement.GetProperty("scriptStartedQpc").GetInt64()*1000.0/Frequency-start;
                }
                if(pid!=0 && window==IntPtr.Zero) {
                    window=Native.Window(pid);
                    if(window!=IntPtr.Zero) {
                        windowAt=Now()-start;
                        var focusAttempts=new List<object>(); double focusDeadline=Now()+2000;
                        bool focused;
                        do {
                            try { Automation.Value!.FromHandle(window).FrameworkAutomationElement.SetFocus(); } catch(System.Runtime.InteropServices.COMException) { }
                            focused=Native.Foreground(window); focusAttempts.Add(new{atMs=Now()-start,focused,detail=Native.LastFocus}); if(!focused)Thread.Sleep(50);
                        }while(!focused&&Now()<focusDeadline);
                        result["foregroundEstablished"]=focused; result["foregroundAttempts"]=focusAttempts;
                        if(!focused) throw new InvalidOperationException("Foreground activation deadline failed");
                        result["windowFirstVisibleObservedMs"]=windowAt;
                        Native.GetClientRect(window,out var client); result["initialClientPixels"]=new{width=client.Right,height=client.Bottom};
                        result["dpi"]=Native.GetDpiForWindow(window);
                        int desiredWidth=(int)(960*Native.GetDpiForWindow(window)/96),desiredHeight=(int)(640*Native.GetDpiForWindow(window)/96);
                        Native.GetWindowRect(window,out var outer);
                        bool resized=client.Right!=desiredWidth||client.Bottom!=desiredHeight;
                        if(resized && !Native.SetWindowPos(window,IntPtr.Zero,0,0,outer.Right-outer.Left+desiredWidth-client.Right,outer.Bottom-outer.Top+desiredHeight-client.Bottom,0x16))
                            throw new InvalidOperationException("Client calibration failed");
                        result["clientCalibration"]=new{resized,desiredWidth,desiredHeight,requestedAtMs=Now()-start};
                        if(config.Scenario=="earlyclose") {Discover(pid,identities); result["closeStage"]="first visible HWND after calibration; before readiness polling"; throw new EarlyCloseProbe();}
                        var capturedWindow=window;
                        uiThread=new Thread(()=>PollUi(capturedWindow,ui,start)){IsBackground=true,Name="UIA-readiness"};
                        uiThread.SetApartmentState(ApartmentState.MTA); uiThread.Start();
                    }
                }
                if(pid!=0 && Now()>=nextProcess) {
                    Discover(pid,identities); nextProcess=Now()+100;
                }
                if(pid!=0 && Now()>=nextSample) {
                    samples.Add(ResourceSample(identities,pdh,"startup",start)); nextSample=Now()+1000;
                }
                if(window!=IntPtr.Zero && Now()>=nextCapture) {
                    bool ready; lock(ui.Gate) ready=ui.Ready;
                    var capture=Capture(window,config.Output,frame++,start,ready);
                    frames.Add(capture.record);
                    if(ready && capture.content) { stableFrames=capture.fingerprint==previousFingerprint?stableFrames+1:1; if(stableFrames==3) stableAt??=Now()-start; }
                    else stableFrames=0;
                    previousFingerprint=capture.fingerprint;
                    nextCapture=Now()+1000.0/config.CaptureHz;
                }
                lock(ui.Gate) if(ui.Ready && readyObserved==null) readyObserved=ui.ReadyAt;
                if(readyObserved!=null && Now()-start-readyObserved.Value>=1000 && stableAt!=null && stableFrames>=3) break;
                if(host!=null && host.HasExited) throw new InvalidOperationException("Host exited before readiness");
                Thread.Sleep(5);
            }
            stopUi=true;
            if(uiThread!=null && !uiThread.Join(5000)) throw new InvalidOperationException("UIA worker did not finish");
            if(host==null || window==IntPtr.Zero || readyObserved==null || stableAt==null) throw new InvalidOperationException("Visible/UIA readiness deadline failed");
            if(ui.Error!=null) throw new InvalidOperationException("UIA worker failed: "+ui.Error);
            Native.GetClientRect(window,out var actualClient); result["clientPixels"]=new{width=actualClient.Right,height=actualClient.Bottom};
            if(actualClient.Right!=(int)(960*Native.GetDpiForWindow(window)/96)||actualClient.Bottom!=(int)(640*Native.GetDpiForWindow(window)/96)) throw new InvalidOperationException("Client area mismatch");
            Discover(host.Id,identities);
            var browserProcesses=identities.Where(p=>Alive(p.Key,p.Value)).Select(p=>Process.GetProcessById(p.Key)).Where(p=>p.ProcessName.Equals("msedgewebview2",StringComparison.OrdinalIgnoreCase)).ToArray();
            var versions=browserProcesses.Select(p=>p.MainModule!.FileVersionInfo.FileVersion).Distinct().ToArray();
            foreach(var process in browserProcesses)process.Dispose();
            if(versions.Length!=1 || versions[0]==null)throw new InvalidOperationException("Ambiguous WebView2 runtime");
            result["runtime"]=versions[0];
            var processEvidence=new List<object>();
            foreach(var identity in identities) if(Alive(identity.Key,identity.Value)) {
                using var search=new System.Management.ManagementObjectSearcher("SELECT ProcessId,ParentProcessId,ExecutablePath,CommandLine FROM Win32_Process WHERE ProcessId="+identity.Key);
                foreach(System.Management.ManagementObject item in search.Get())processEvidence.Add(new{pid=identity.Key,path=item["ExecutablePath"],commandLine=item["CommandLine"]});
            }
            Save(Path.Combine(config.Output,"process-evidence.json"),processEvidence);
            result["hostPid"]=host.Id; result["hostStartUtc"]=host.StartTime.ToUniversalTime();
            double hostStartMs=(host.StartTime.ToUniversalTime().Ticks-utcTicks)/10000.0+(afterUtc-start)/2;
            result["hostStartMsFromUtcAnchor"]=hostStartMs; result["readyMs"]=readyObserved;
            result["hostToReadyMs"]=readyObserved-hostStartMs; result["launchToReadyMs"]=readyObserved-(requested-start);
            result["hostToWindowMs"]=windowAt-hostStartMs; result["stableCompleteObservedMs"]=stableAt;
            result["uia"]=new{ui.ReadyAt,ui.ContentAt,ui.LoadingAt,ui.Polls,ui.MaxPollMs,ui.Error,trace=ui.Trace.ToArray()};
            if(config.Scenario=="idle") {
                foreach(string state in config.IdleOrder??new[]{"visible","unfocused","occluded","minimized","restored"}) {
                    System.Windows.Forms.Form? anchor=null;
                    if(state=="unfocused" || state=="occluded") {
                        Native.GetWindowRect(window,out var bounds);
                        var screen=System.Windows.Forms.Screen.FromHandle(window).WorkingArea;
                        var region=state=="occluded" ? new Rectangle(bounds.Left,bounds.Top,bounds.Right-bounds.Left,bounds.Bottom-bounds.Top) : new Rectangle(screen.Right-150,screen.Bottom-70,145,60);
                        if(state=="unfocused" && region.IntersectsWith(new Rectangle(bounds.Left,bounds.Top,bounds.Right-bounds.Left,bounds.Bottom-bounds.Top)))
                            throw new InvalidOperationException("No unoccluded focus-anchor placement available");
                        anchor=new System.Windows.Forms.Form {Text="NeutronStar measurement fixture",ShowInTaskbar=false,TopMost=state=="occluded",
                            FormBorderStyle=System.Windows.Forms.FormBorderStyle.None,StartPosition=System.Windows.Forms.FormStartPosition.Manual,Bounds=region,BackColor=Color.DimGray};
                        anchor.Show(); System.Windows.Forms.Application.DoEvents();
                        if(!Native.Foreground(anchor.Handle)) throw new InvalidOperationException("Unable to activate owned focus fixture");
                    }
                    if(state=="minimized") Native.ShowWindow(window,6);
                    if(state=="restored") { Native.ShowWindow(window,6); Thread.Sleep(500); double restoreAt=Now(); Native.ShowWindow(window,9); Native.Foreground(window); Wait(()=>Has(window,"Ready",false),5000); actions.Add(new{name="restore-ready",inputToUiaObservedMs=Now()-restoreAt}); }
                    if(state=="visible") {Native.ShowWindow(window,9); Native.Foreground(window);}
                    Thread.Sleep(1000);
                    for(int i=0;i<config.IdleSeconds;i++) {
                        Discover(host.Id,identities); samples.Add(ResourceSample(identities,pdh,state,start)); System.Windows.Forms.Application.DoEvents(); Thread.Sleep(1000);
                    }
                    if(anchor!=null) { anchor.Close(); anchor.Dispose(); System.Windows.Forms.Application.DoEvents(); Native.Foreground(window); }
                }
            } else if(config.Scenario=="actions") {
                stopUi=true;
                for(int i=0;i<config.ActionRepeats;i++) {
                    actions.Add(MeasureAction(window,"about-open",()=>Invoke(window,"About this test"),()=>Has(window,"Close",true),config.Output,i,start));
                    actions.Add(MeasureAction(window,"about-close",()=>Invoke(window,"Close"),()=>!Has(window,"Close",true),config.Output,i,start));
                    actions.Add(MeasureAction(window,"encrypt-start",()=>Invoke(window,"Simulate encryption"),()=>Has(window,"Cancel",true),config.Output,i,start));
                    Thread.Sleep(150);
                    actions.Add(MeasureAction(window,"cancel",()=>Invoke(window,"Cancel"),()=>Has(window,"Simulation canceled.",false),config.Output,i,start));
                    actions.Add(MeasureAction(window,"reset",()=>Invoke(window,"Reset"),()=>Has(window,"Ready",false),config.Output,i,start));
                    actions.Add(MeasureAction(window,"decrypt-start",()=>Invoke(window,"Simulate decryption"),()=>Has(window,"Cancel",true),config.Output,i,start));
                    Wait(()=>Has(window,"Simulation complete. No file was changed.",false),5000);
                    Invoke(window,"Reset"); Wait(()=>Has(window,"Ready",false),3000);
                }
            }
            result["collectorCpuMsThroughCollection"]=Process.GetCurrentProcess().TotalProcessorTime.TotalMilliseconds-collectorCpuStart;
            result["status"]="passed"; code=0;
        } catch(EarlyCloseProbe) {result["status"]="passed"; code=0;}
        catch(Exception error) { result["status"]="failed"; result["error"]=error.GetType().Name+": "+error.Message; }
        finally {
            stopUi=true;
            lock(ui.Gate) result["uia"]=new{ui.ReadyAt,ui.ContentAt,ui.LoadingAt,ui.Polls,ui.MaxPollMs,ui.Error,trace=ui.Trace.ToArray()};
            if(window!=IntPtr.Zero) Native.PostMessageW(window,0x10,IntPtr.Zero,IntPtr.Zero);
            bool hostExit=host==null || host.WaitForExit(30000);
            double exitDeadline=Now()+30000;
            while(Now()<exitDeadline && identities.Any(pair=>Alive(pair.Key,pair.Value))) Thread.Sleep(100);
            bool helpersExited=!identities.Any(pair=>Alive(pair.Key,pair.Value));
            result["hostExited"]=hostExit; result["helpersExited"]=helpersExited;
            int? exitCode=null;
            try {if(host?.HasExited==true)exitCode=host.ExitCode;}
            catch(InvalidOperationException error) {result["exitCodeObservationError"]=error.Message;}
            result["hostExitCode"]=exitCode;
            if(host!=null && exitCode!=0) {result["status"]="failed"; result["cleanupFailure"]="Host exit code nonzero or unavailable"; code=1;}
            if(!hostExit || !helpersExited) { result["status"]="failed"; result["cleanupFailure"]="Run-owned processes did not exit; no forced kill counted as success"; code=1; }
            ImageQueue.CompleteAdding(); bool imagesDone=imageWriter.Join(30000);
            if(!imagesDone || ImageErrors.Count>0) { result["status"]="failed"; result["imageErrors"]=ImageErrors.ToArray(); code=1; }
            result["durationMs"]=Now()-start; result["processIdentities"]=identities.Select(pair=>new{pid=pair.Key,startUtc=pair.Value}).ToArray();
            result["actionProviderGaps"]=ActionProviderGaps;
            Save(Path.Combine(config.Output,"resources.json"),samples); Save(Path.Combine(config.Output,"frames.json"),frames);
            Save(Path.Combine(config.Output,"actions.json"),actions); Save(Path.Combine(config.Output,"result.json"),result);
            host?.Dispose(); if(!ReferenceEquals(host,launcher)) launcher?.Dispose();
            Native.SetCursorPos(originalCursor.X,originalCursor.Y);
        }
        Console.WriteLine(JsonSerializer.Serialize(new{config.App,config.Launch,config.Scenario,status=result["status"],output=config.Output})); return code;
    }

    static bool Alive(int pid,DateTime created) { try { using var p=Process.GetProcessById(pid); return !p.HasExited && p.StartTime.ToUniversalTime()==created; } catch { return false; } }
    static void Discover(int root,Dictionary<int,DateTime> identities) {
        DateTime? Created(int pid) { try { using var p=Process.GetProcessById(pid); return p.HasExited?null:p.StartTime.ToUniversalTime(); } catch { return null; } }
        if(!identities.ContainsKey(root)) { var time=Created(root); if(time==null) return; identities[root]=time.Value; }
        ProcessTree.Expand(identities,Native.Processes().Select(p=>new ProcessTree.Edge((int)p.Pid,(int)p.Parent)),Created);
    }
    static object ResourceSample(Dictionary<int,DateTime> identities,PrivateWorkingSet pdh,string state,double start) {
        double began=Now(); var privateWs=pdh.Sample(); var rows=new List<object>(); long privateTotal=0,workingTotal=0,privateResidentTotal=0; double cpu=0; bool complete=true;
        foreach(var pair in identities) try {
            if(!Alive(pair.Key,pair.Value)) continue;
            using var process=Process.GetProcessById(pair.Key); if(process.StartTime.ToUniversalTime()!=pair.Value || process.HasExited) continue;
            var memory=new Native.Memory{Size=(uint)System.Runtime.InteropServices.Marshal.SizeOf<Native.Memory>()};
            if(!Native.GetProcessMemoryInfo(process.Handle,ref memory,memory.Size)) throw new InvalidOperationException("GetProcessMemoryInfo failed");
            long resident=privateWs.TryGetValue(pair.Key,out long value)?value:-1; if(resident<0) complete=false;
            double seconds=process.TotalProcessorTime.TotalSeconds; privateTotal+=(long)memory.Private.ToUInt64(); workingTotal+=(long)memory.WorkingSet.ToUInt64(); cpu+=seconds; if(resident>=0) privateResidentTotal+=resident;
            rows.Add(new{pid=pair.Key,name=process.ProcessName,startUtc=pair.Value,privateBytes=memory.Private.ToUInt64(),workingSetBytes=memory.WorkingSet.ToUInt64(),privateWorkingSetBytes=resident<0?(long?)null:resident,cpuSeconds=seconds});
        } catch { complete=false; }
        return new{atMs=began-start,state,processes=rows,privateBytes=privateTotal,totalWorkingSetBytes=workingTotal,
            privateWorkingSetBytes=complete?(long?)privateResidentTotal:null,cpuSeconds=cpu,complete,collectionMs=Now()-began};
    }
    static void PollUi(IntPtr window,UiState state,double start) {
        try {
        var automation=Automation.Value!;
            int consecutiveProviderFailures=0;
            while(!stopUi) {
                double began=Now();
                try {
                var root=automation.FromHandle(window);
                var elements=root.FindAllDescendants(cf=>cf.ByControlType(ControlType.Text).Or(cf.ByControlType(ControlType.Button)));
                bool ready=false,encrypt=false,decrypt=false,heading=false,loading=false,fixture=false;
                foreach(AutomationElement element in elements) {
                    if(element.Properties.IsOffscreen.ValueOrDefault) continue;
                    string name=element.Properties.Name.ValueOrDefault??""; bool enabled=element.Properties.IsEnabled.ValueOrDefault;
                    ready|=name=="Ready"; heading|=name=="NeutronStar GUI Bench"; loading|=name.StartsWith("Loading local interface",StringComparison.Ordinal)||name.StartsWith("Starting WebView2",StringComparison.Ordinal);
                    fixture|=name.Contains("Zodiac GUI benchmark",StringComparison.Ordinal);
                    encrypt|=name=="Simulate encryption" && enabled; decrypt|=name=="Simulate decryption" && enabled;
                }
                double ended=Now(); lock(state.Gate) {
                    state.Polls++; state.MaxPollMs=Math.Max(state.MaxPollMs,ended-began);
                    state.Trace.Add(new{startMs=began-start,endMs=ended-start,ready,heading,fixture,loading,encrypt,decrypt});
                    if(loading && state.LoadingAt==null) state.LoadingAt=ended-start;
                    if(heading&&fixture && state.ContentAt==null) state.ContentAt=ended-start;
                    if(ready&&encrypt&&decrypt&&heading&&fixture) { state.Ready=true; state.ReadyAt??=ended-start; }
                }
                consecutiveProviderFailures=0;
                } catch(System.Runtime.InteropServices.COMException error) {
                    lock(state.Gate) state.Trace.Add(new{startMs=began-start,endMs=Now()-start,
                        providerFailureHresult=error.HResult,retry=consecutiveProviderFailures+1});
                    // Accessibility providers can detach while WebView2 replaces its initial document.
                    // Retain every gap; do not infer readiness or restart the measured application.
                    if(++consecutiveProviderFailures>=10) throw;
                } catch(FlaUI.Core.Exceptions.ElementNotAvailableException) {
                    lock(state.Gate) state.Trace.Add(new{startMs=began-start,endMs=Now()-start,
                        providerUnavailable=true,retry=consecutiveProviderFailures+1});
                    if(++consecutiveProviderFailures>=10) throw;
                }
                Thread.Sleep(50);
            }
        } catch(Exception error) { lock(state.Gate) state.Error=error.GetType().Name+": "+error.Message; }
    }
    static (object record,bool content,string? fingerprint) Capture(IntPtr window,string output,int index,double start,bool ready) {
        double began=Now(); Native.GetClientRect(window,out var client);
        var origin=new Native.Point(); Native.ClientToScreen(window,ref origin);
        var rect=new Native.Rect{Left=origin.X,Top=origin.Y,Right=origin.X+client.Right,Bottom=origin.Y+client.Bottom};
        bool foreground=Native.GetAncestor(Native.GetForegroundWindow(),2)==window;
        if(!foreground || rect.Right<=rect.Left || rect.Bottom<=rect.Top) return (new{atMs=began-start,index,skipped="not-foreground-or-invalid"},false,null);
        var bitmap=new Bitmap(rect.Right-rect.Left,rect.Bottom-rect.Top,PixelFormat.Format24bppRgb);
        using(var graphics=Graphics.FromImage(bitmap)) graphics.CopyFromScreen(rect.Left,rect.Top,0,0,bitmap.Size,CopyPixelOperation.SourceCopy);
        double captured=Now(); long dark=0,light=0,green=0,count=0; ulong fingerprint=14695981039346656037;
        // Client-region samples exclude titlebar/borders; no optical text inference.
        int border=0,top=0;
        for(int y=top;y<bitmap.Height-border;y+=8) for(int x=border;x<bitmap.Width-border;x+=8) {
            var c=bitmap.GetPixel(x,y); int luminance=(c.R+c.G+c.B)/3; count++;
            if(luminance<32) dark++; if(luminance>232) light++; if(c.G>c.R*1.35 && c.G>c.B*1.1 && c.G>70) green++;
            fingerprint=(fingerprint^(uint)((c.R/16)*256+(c.G/16)*16+c.B/16))*1099511628211;
        }
        double darkRatio=(double)dark/Math.Max(1,count),lightRatio=(double)light/Math.Max(1,count),greenRatio=(double)green/Math.Max(1,count);
        string classification=darkRatio>.98?"near-black":lightRatio>.995?"near-white":greenRatio>.01?"accent-content":"other-content";
        string name="frame-"+index.ToString("D6")+".png";
        if(!ImageQueue.TryAdd((bitmap,Path.Combine(output,name)))) { bitmap.Dispose(); throw new InvalidOperationException("Image queue overflow; sample invalid"); }
        return (new{index,startMs=began-start,capturedMs=captured-start,endMs=Now()-start,classification,darkRatio,lightRatio,greenRatio,readyObserved=ready,fingerprint=fingerprint.ToString("X"),file=name,
            bounds=new{rect.Left,rect.Top,rect.Right,rect.Bottom}},classification=="accent-content",fingerprint.ToString("X"));
    }
    static AutomationElement? Element(IntPtr window,string name,bool button) {
        var document=Automation.Value!.FromHandle(window).FindFirstDescendant(cf=>cf.ByControlType(ControlType.Document));
        if(document==null) return null;
        return document.FindAllDescendants(cf=>cf.ByName(name).And(cf.ByControlType(button?ControlType.Button:ControlType.Text)))
            .FirstOrDefault(e=>!e.Properties.IsOffscreen.ValueOrDefault);
    }
    static bool Has(IntPtr window,string name,bool button)=>ReadAction(()=>Element(window,name,button)!=null);
    static void Invoke(IntPtr window,string name) {
        if(Native.GetAncestor(Native.GetForegroundWindow(),2)!=window) throw new InvalidOperationException("Foreground lost before input");
        var bounds=ReadAction(()=>{
            var element=Element(window,name,true)??throw new InvalidOperationException("Missing visible action: "+name);
            return element.Properties.BoundingRectangle.Value;
        });
        if(bounds.Width<1 || bounds.Height<1 || !Native.SetCursorPos((int)(bounds.X+bounds.Width/2),(int)(bounds.Y+bounds.Height/2)))
            throw new InvalidOperationException("Invalid input target bounds");
        lastInputSent=Now();
        var input=new[]{new Native.Input{Mouse=new Native.MouseInput{Flags=2}},new Native.Input{Mouse=new Native.MouseInput{Flags=4}}};
        if(Native.SendInput(2,input,System.Runtime.InteropServices.Marshal.SizeOf<Native.Input>())!=2)
            throw new InvalidOperationException("Mouse input dispatch failed");
    }
    static void Wait(Func<bool> condition,int timeout) { double until=Now()+timeout; while(!condition()) { if(Now()>until) throw new TimeoutException("UIA condition deadline"); Thread.Sleep(5); } }
    static object MeasureAction(IntPtr window,string name,Action action,Func<bool> condition,string output,int index,double start) {
        double began=Now(); action(); double inputAt=lastInputSent; Wait(condition,5000); double observed=Now();
        var frame=Capture(window,output,actionFrame++,start,true);
        return new{name,index,requestedMs=began-start,uiaObservedMs=observed-start,uiaObservedLatencyMs=observed-began,
            inputSentMs=inputAt-start,inputToUiaObservedMs=observed-inputAt,lookupAndDispatchMs=inputAt-began,
            frame=frame.record,physicalPresentationMs=(double?)null};
    }
}
