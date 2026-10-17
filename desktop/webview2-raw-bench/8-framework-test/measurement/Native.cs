using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;

internal static class Native {
    [StructLayout(LayoutKind.Sequential)] internal struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] internal struct Point { public int X,Y; }
    [StructLayout(LayoutKind.Sequential)] internal struct MouseInput { public int X,Y; public uint Data,Flags,Time; public UIntPtr Extra; }
    [StructLayout(LayoutKind.Sequential)] internal struct Input { public uint Type; public MouseInput Mouse; }
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] internal struct ProcEntry {
        public uint Size, Usage, Pid; public UIntPtr Heap; public uint Module, Threads, Parent; public int Priority; public uint Flags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst=260)] public string Exe;
    }
    [StructLayout(LayoutKind.Sequential)] internal struct Memory {
        public uint Size, Faults; public UIntPtr PeakWorkingSet, WorkingSet, PeakPaged, Paged, PeakNonPaged, NonPaged, Pagefile, PeakPagefile, Private;
    }
    [StructLayout(LayoutKind.Sequential)] internal struct CounterValue { public uint Status; public double Value; }
    [StructLayout(LayoutKind.Sequential)] internal struct CounterItem { public IntPtr Name; public CounterValue Value; }
    [DllImport("kernel32.dll", SetLastError=true)] internal static extern IntPtr CreateToolhelp32Snapshot(uint flags,uint pid);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] internal static extern bool Process32FirstW(IntPtr snapshot, ref ProcEntry entry);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] internal static extern bool Process32NextW(IntPtr snapshot, ref ProcEntry entry);
    [DllImport("kernel32.dll")] internal static extern bool CloseHandle(IntPtr handle);
    [DllImport("psapi.dll", SetLastError=true)] internal static extern bool GetProcessMemoryInfo(IntPtr process, ref Memory memory, uint size);
    [DllImport("user32.dll")] internal static extern bool EnumWindows(EnumWindow callback, IntPtr data);
    internal delegate bool EnumWindow(IntPtr window, IntPtr data);
    [DllImport("user32.dll")] internal static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
    [DllImport("user32.dll")] internal static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] internal static extern bool GetWindowRect(IntPtr window, out Rect rect);
    [DllImport("user32.dll")] internal static extern bool GetClientRect(IntPtr window, out Rect rect);
    [DllImport("user32.dll")] internal static extern bool ClientToScreen(IntPtr window, ref Point point);
    [DllImport("user32.dll")] internal static extern bool SetCursorPos(int x,int y);
    [DllImport("user32.dll")] internal static extern bool GetCursorPos(out Point point);
    [DllImport("user32.dll",SetLastError=true)] internal static extern uint SendInput(uint count,Input[] input,int size);
    [DllImport("user32.dll")] internal static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] internal static extern IntPtr GetAncestor(IntPtr window, uint flags);
    [DllImport("user32.dll")] internal static extern bool SetForegroundWindow(IntPtr window);
    [DllImport("kernel32.dll")] internal static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] internal static extern bool AttachThreadInput(uint first,uint second,bool attach);
    [DllImport("user32.dll")] internal static extern bool BringWindowToTop(IntPtr window);
    [DllImport("user32.dll")] internal static extern IntPtr SetFocus(IntPtr window);
    [DllImport("user32.dll")] internal static extern bool ShowWindow(IntPtr window, int command);
    [DllImport("user32.dll")] internal static extern bool PostMessageW(IntPtr window,uint message,IntPtr wparam,IntPtr lparam);
    [DllImport("user32.dll")] internal static extern bool SetProcessDpiAwarenessContext(IntPtr context);
    [DllImport("user32.dll")] internal static extern uint GetDpiForWindow(IntPtr window);
    [DllImport("pdh.dll", CharSet=CharSet.Unicode)] internal static extern uint PdhOpenQueryW(string? source,UIntPtr data,out IntPtr query);
    [DllImport("pdh.dll", CharSet=CharSet.Unicode)] internal static extern uint PdhAddEnglishCounterW(IntPtr query,string path,UIntPtr data,out IntPtr counter);
    [DllImport("pdh.dll")] internal static extern uint PdhCollectQueryData(IntPtr query);
    [DllImport("pdh.dll", CharSet=CharSet.Unicode)] internal static extern uint PdhGetFormattedCounterArrayW(IntPtr counter,uint format,ref uint size,out uint count,IntPtr items);
    [DllImport("pdh.dll")] internal static extern uint PdhCloseQuery(IntPtr query);

    internal static List<ProcEntry> Processes() {
        var list=new List<ProcEntry>(); var snapshot=CreateToolhelp32Snapshot(2,0);
        if(snapshot==new IntPtr(-1)) throw new InvalidOperationException("Process snapshot failed");
        try { var entry=new ProcEntry { Size=(uint)Marshal.SizeOf<ProcEntry>() };
            if(Process32FirstW(snapshot,ref entry)) do { list.Add(entry); } while(Process32NextW(snapshot,ref entry));
        } finally { CloseHandle(snapshot); } return list;
    }
    internal static IntPtr Window(int pid) {
        IntPtr found=IntPtr.Zero;
        EnumWindows((window,_)=>{ GetWindowThreadProcessId(window,out uint owner);
            if(owner==(uint)pid && IsWindowVisible(window)) { found=window; return false; } return true;
        },IntPtr.Zero); return found;
    }
    internal static bool Foreground(IntPtr window) {
        uint own=GetCurrentThreadId(), foreground=GetWindowThreadProcessId(GetForegroundWindow(),out _), target=GetWindowThreadProcessId(window,out _);
        bool linkedForeground=own!=foreground && AttachThreadInput(own,foreground,true);
        bool linkedTarget=own!=target && target!=foreground && AttachThreadInput(own,target,true);
        try { BringWindowToTop(window); SetForegroundWindow(window); SetFocus(window); }
        finally { if(linkedTarget) AttachThreadInput(own,target,false); if(linkedForeground) AttachThreadInput(own,foreground,false); }
        return GetAncestor(GetForegroundWindow(),2)==window;
    }
}

internal sealed class PrivateWorkingSet : IDisposable {
    private IntPtr query, ids, working;
    public PrivateWorkingSet() {
        Check(Native.PdhOpenQueryW(null,UIntPtr.Zero,out query));
        try {
            Check(Native.PdhAddEnglishCounterW(query,@"\Process V2(*)\Process ID",UIntPtr.Zero,out ids));
            Check(Native.PdhAddEnglishCounterW(query,@"\Process V2(*)\Working Set - Private",UIntPtr.Zero,out working));
        } catch { Dispose(); throw; }
    }
    static void Check(uint code) { if(code!=0) throw new InvalidOperationException("PDH status 0x"+code.ToString("X")); }
    static Dictionary<string,double> Values(IntPtr counter) {
        uint size=0; uint code=Native.PdhGetFormattedCounterArrayW(counter,0x200,ref size,out _,IntPtr.Zero);
        if(code!=0x800007D2 && code!=0) throw new InvalidOperationException("PDH array status "+code);
        var values=new Dictionary<string,double>(); if(size==0) return values;
        IntPtr memory=Marshal.AllocHGlobal((int)size);
        try {
            Check(Native.PdhGetFormattedCounterArrayW(counter,0x200,ref size,out uint count,memory));
            int stride=Marshal.SizeOf<Native.CounterItem>();
            for(int i=0;i<count;i++) {
                var item=Marshal.PtrToStructure<Native.CounterItem>(IntPtr.Add(memory,i*stride));
                if(item.Value.Status<=1 && !values.TryAdd(Marshal.PtrToStringUni(item.Name)!,item.Value.Value))
                    throw new InvalidOperationException("Duplicate performance-counter instance; attribution is ambiguous");
            }
        } finally { Marshal.FreeHGlobal(memory); } return values;
    }
    internal Dictionary<int,long> Sample() {
        Check(Native.PdhCollectQueryData(query)); var pids=Values(ids); var bytes=Values(working);
        var result=new Dictionary<int,long>();
        foreach(var pair in pids) if(pair.Value>0 && bytes.TryGetValue(pair.Key,out double value)) result[(int)pair.Value]=(long)value;
        return result;
    }
    public void Dispose() { if(query!=IntPtr.Zero) { Native.PdhCloseQuery(query); query=IntPtr.Zero; } }
}
