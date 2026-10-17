using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Threading;
using System.Windows.Automation;

// Supplemental assets only. No JS injection, DevTools or privileged host API.
internal static class Workloads {
    static double Now()=>Stopwatch.GetTimestamp()*1000.0/Stopwatch.Frequency;
    static readonly JsonSerializerOptions Json=new(){WriteIndented=true,PropertyNamingPolicy=JsonNamingPolicy.CamelCase};
    static IntPtr window;
    static readonly List<object> ProviderGaps=new();
    static T Read<T>(Func<T> query) {
        for(int retry=1;;retry++) try { return query(); }
        catch(COMException error) {
            ProviderGaps.Add(new{atMs=Now(),hresult=error.HResult,retry,readOnly=true}); if(retry>=10) throw; Thread.Sleep(20);
        } catch(ElementNotAvailableException) {
            ProviderGaps.Add(new{atMs=Now(),unavailable=true,retry,readOnly=true}); if(retry>=10) throw; Thread.Sleep(20);
        }
    }
    static AutomationElement? Document()=>AutomationElement.FromHandle(window).FindFirst(TreeScope.Descendants,
        new PropertyCondition(AutomationElement.ControlTypeProperty,ControlType.Document));
    static AutomationElement? Named(string name,ControlType type)=>Document()?.FindFirst(TreeScope.Descendants,
        new AndCondition(new PropertyCondition(AutomationElement.NameProperty,name),new PropertyCondition(AutomationElement.ControlTypeProperty,type)));
    static void Wait(Func<bool> condition,int timeout=10000) {
        double deadline=Now()+timeout; int failures=0;
        while(true) {
            try { if(condition()) return; failures=0; }
            catch(COMException error) {
                ProviderGaps.Add(new{atMs=Now(),hresult=error.HResult,retry=failures+1}); if(++failures>=10) throw;
            } catch(ElementNotAvailableException) {
                ProviderGaps.Add(new{atMs=Now(),unavailable=true,retry=failures+1}); if(++failures>=10) throw;
            }
            if(Now()>deadline) throw new TimeoutException("Supplemental UIA condition"); Thread.Sleep(5);
        }
    }
    static void Click(AutomationElement element) {
        if(!Native.Foreground(window)) throw new InvalidOperationException("Foreground lost");
        if(element.TryGetCurrentPattern(ScrollItemPattern.Pattern,out object scroll)) ((ScrollItemPattern)scroll).ScrollIntoView();
        var r=Read(()=>element.Current.BoundingRectangle);
        if(Read(()=>element.Current.IsOffscreen) || r.Width<1 || r.Height<1) throw new InvalidOperationException("Input target offscreen");
        Native.SetCursorPos((int)(r.X+r.Width/2),(int)(r.Y+r.Height/2));
        var inputs=new[]{new Native.Input{Mouse=new Native.MouseInput{Flags=2}},new Native.Input{Mouse=new Native.MouseInput{Flags=4}}};
        if(Native.SendInput(2,inputs,Marshal.SizeOf<Native.Input>())!=2) throw new InvalidOperationException("Input dispatch failed");
    }
    static double Button(string name) {
        var element=Read(()=>Named(name,ControlType.Button))??throw new InvalidOperationException("Missing button: "+name);
        double sent=Now(); Click(element); return sent;
    }
    static AutomationElement? Id(string id)=>Document()?.FindFirst(TreeScope.Descendants,new PropertyCondition(AutomationElement.AutomationIdProperty,id));
    static string SummaryText() {
        var summary=Id("workload-summary"); if(summary==null) return "";
        var cache=new CacheRequest(); cache.Add(AutomationElement.NameProperty);
        AutomationElementCollection words;
        using(cache.Activate()) words=summary.FindAll(TreeScope.Descendants,new PropertyCondition(AutomationElement.ControlTypeProperty,ControlType.Text));
        return string.Join("",words.Cast<AutomationElement>().Select(x=>x.Cached.Name));
    }
    static bool Summary(int count,int tick)=>SummaryText()==$"{count} rows; tick {tick}";
    static int? SummaryTick(int count) {
        string text=SummaryText(),prefix=$"{count} rows; tick ";
        return text.StartsWith(prefix,StringComparison.Ordinal) && int.TryParse(text[prefix.Length..],out int tick)?tick:null;
    }
    static int FirstId() {
        var container=Id("workload-rows");
        if(container!=null) {
            var item=container.FindFirst(TreeScope.Children,new PropertyCondition(AutomationElement.ControlTypeProperty,ControlType.ListItem));
            if(item==null) throw new InvalidOperationException("First row missing");
            string text=item.Current.Name;
            if(!text.Contains("row-",StringComparison.Ordinal)) {
                var words=item.FindAll(TreeScope.Descendants,new PropertyCondition(AutomationElement.ControlTypeProperty,ControlType.Text));
                text=string.Join("",words.Cast<AutomationElement>().Select(x=>x.Current.Name));
            }
            int began=text.IndexOf("row-",StringComparison.Ordinal);
            if(began<0) throw new InvalidOperationException("Keyed row label missing");
            began+=4; int end=began; while(end<text.Length && char.IsAsciiDigit(text[end])) end++;
            return int.Parse(text[began..end]);
        }
        throw new InvalidOperationException("First keyed row not observable through UIA");
    }
    [StructLayout(LayoutKind.Sequential)] struct Keyboard { public ushort Key,Scan; public uint Flags,Time; public UIntPtr Extra; }
    [StructLayout(LayoutKind.Explicit,Size=40)] struct KeyInput { [FieldOffset(0)] public uint Type; [FieldOffset(8)] public Keyboard Key; }
    [DllImport("user32.dll",EntryPoint="SendInput",SetLastError=true)] static extern uint Keys(uint count,KeyInput[] input,int size);
    static void TypeQuery(string text) {
        var field=Named("Filter synthetic rows",ControlType.Edit)??throw new InvalidOperationException("Filter field missing");
        Click(field);
        var keys=new List<KeyInput>();
        void Key(ushort key,bool up=false)=>keys.Add(new KeyInput{Type=1,Key=new Keyboard{Key=key,Flags=up?2u:0u}});
        Key(0x11); Key(0x41); Key(0x41,true); Key(0x11,true); Key(8); Key(8,true);
        foreach(char ch in text) {
            keys.Add(new KeyInput{Type=1,Key=new Keyboard{Scan=ch,Flags=4}});
            keys.Add(new KeyInput{Type=1,Key=new Keyboard{Scan=ch,Flags=6}});
        }
        if(Keys((uint)keys.Count,keys.ToArray(),Marshal.SizeOf<KeyInput>())!=keys.Count) throw new InvalidOperationException("Keyboard input dispatch failed");
    }
    [MTAThread] static int Main(string[] args) {
        if(args.Length!=4) { Console.Error.WriteLine("runner assets output repeats"); return 2; }
        string output=Path.GetFullPath(args[2]); Directory.CreateDirectory(output);
        int repeats=int.Parse(args[3]); if(repeats<1 || repeats>20) return 2;
        Native.SetProcessDpiAwarenessContext(new IntPtr(-4)); Native.GetCursorPos(out var original);
        Process? process=null; var owned=new Dictionary<int,DateTime>();
        var results=new List<object>(); var report=new Dictionary<string,object?>(); int exit=1;
        try {
            var launch=new ProcessStartInfo(Path.GetFullPath(args[0])){UseShellExecute=false,CreateNoWindow=true};
            foreach(string value in new[]{"--assets",Path.GetFullPath(args[1]),"--profile",Path.Combine(output,"profile"),"--report",Path.Combine(output,"host.jsonl")}) launch.ArgumentList.Add(value);
            process=Process.Start(launch)!;
            void Discover() {
                DateTime? Created(int pid) { try { using var p=Process.GetProcessById(pid); return p.HasExited?null:p.StartTime.ToUniversalTime(); } catch { return null; } }
                if(!owned.ContainsKey(process.Id)) owned[process.Id]=process.StartTime.ToUniversalTime();
                ProcessTree.Expand(owned,Native.Processes().Select(p=>new ProcessTree.Edge((int)p.Pid,(int)p.Parent)),Created);
            }
            Wait(()=> { Discover(); window=Native.Window(process.Id); return window!=IntPtr.Zero; });
            if(!Native.Foreground(window)) throw new InvalidOperationException("Cannot focus workload window");
            Wait(()=>Named("Ready",ControlType.Text)!=null,30000);
            // Put the shared workload toolbar and filter at the top of the client viewport.
            var remount=Named("Remount workload",ControlType.Button)??throw new InvalidOperationException("Supplemental assets missing");
            if(remount.TryGetCurrentPattern(ScrollItemPattern.Pattern,out object pattern)) ((ScrollItemPattern)pattern).ScrollIntoView();
            else throw new InvalidOperationException("Workload scroll endpoint unsupported");
            Thread.Sleep(1000);
            int nextId=1000;
            void Measure(string name,int iteration,Func<double> action,Func<bool> done) {
                double requested=Now(),sent=action(); Wait(done); double observed=Now();
                results.Add(new{name,iteration,requestToUiaMs=observed-requested,inputAndUiaMs=observed-sent,
                    endpoint="semantic UIA observation; includes dispatch/provider cost; not physical paint"});
            }
            for(int i=0;i<repeats;i++) {
                int first=nextId; nextId+=10000;
                Measure("replace-10000",i,()=>Button("10,000 rows"),()=>Summary(10000,0)&&FirstId()==first);
                first=nextId; nextId+=1000;
                Measure("replace-1000",i,()=>Button("1,000 rows"),()=>Summary(1000,0)&&FirstId()==first);
                int reversed=first+999;
                Measure("reverse-1000",i,()=>Button("Reverse"),()=>FirstId()==reversed);
                first=nextId; nextId+=10;
                Measure("splice-10",i,()=>Button("Splice 10"),()=>FirstId()==first);
                Measure("update-10-percent",i,()=>Button("Update 10%"),()=>Summary(1000,1));
                Measure("filter-to-one",i,()=>{ double t=Now(); TypeQuery($"row-{first} "); return t; },()=>Summary(1,1));
                Measure("filter-clear",i,()=>{ double t=Now(); TypeQuery(""); return t; },()=>Summary(1000,1));
                Button("30 Hz / 2 s");
                Measure("filter-during-30hz-requested",i,()=>{ double t=Now(); TypeQuery($"row-{first} "); return t; },()=>SummaryTick(1)>1);
                Button("Stop"); int? burstTick=Read(()=>SummaryTick(1));
                results.Add(new{name="burst-observation",iteration=i,tickAfterStop=burstTick,
                    interpretation="30Hz is requested scheduling, not measured frame rate; filtering and UIA perturb the workload"});
                Measure("remount",i,()=>Button("Remount workload"),()=>Summary(1000,0)&&FirstId()==0);
                nextId=1000; Discover();
            }
            report["status"]="passed"; exit=0;
        } catch(Exception error) {
            report["status"]="failed"; report["error"]=error.GetType().Name+": "+error.Message; report["stack"]=error.StackTrace;
            try {
                var doc=Document();
                var cache=new CacheRequest(); cache.Add(AutomationElement.NameProperty); cache.Add(AutomationElement.AutomationIdProperty); cache.Add(AutomationElement.ControlTypeProperty);
                AutomationElementCollection? elements;
                using(cache.Activate()) elements=doc?.FindAll(TreeScope.Descendants,Condition.TrueCondition);
                report["syntheticUiaSnapshot"]=elements?.Cast<AutomationElement>().Take(100).Select(e=>new{name=e.Cached.Name,id=e.Cached.AutomationId,type=e.Cached.ControlType.ProgrammaticName}).ToArray();
            } catch(Exception captureError) { report["snapshotError"]=captureError.Message; }
        }
        finally {
            if(window!=IntPtr.Zero) Native.PostMessageW(window,0x10,IntPtr.Zero,IntPtr.Zero);
            bool closed=process==null || process.WaitForExit(30000); double deadline=Now()+30000;
            bool Alive(int id,DateTime time) { try { using var p=Process.GetProcessById(id); return !p.HasExited && p.StartTime.ToUniversalTime()==time; } catch(ArgumentException) { return false; } }
            while(Now()<deadline && owned.Any(p=>Alive(p.Key,p.Value))) Thread.Sleep(100);
            bool helpers= !owned.Any(p=>Alive(p.Key,p.Value));
            report["hostExited"]=closed; report["helpersExited"]=helpers;
            if(!closed || !helpers) { report["status"]="failed"; report["cleanupFailure"]="Owned processes did not exit"; exit=1; }
            report["actions"]=results; report["repeatsRequested"]=repeats;
            report["providerGaps"]=ProviderGaps;
            report["limits"]="Supplemental build, real input and UIA semantic endpoint. No physical paint, browser timing, frame pacing or throughput inference. UIA traversal overhead grows with tree size. Single lifetime per app.";
            File.WriteAllText(Path.Combine(output,"result.json"),JsonSerializer.Serialize(report,Json));
            Native.SetCursorPos(original.X,original.Y); process?.Dispose();
        }
        Console.WriteLine(JsonSerializer.Serialize(report,Json)); return exit;
    }
}
