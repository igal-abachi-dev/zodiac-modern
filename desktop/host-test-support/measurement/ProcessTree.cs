using System;
using System.Collections.Generic;
using System.Linq;

// Toolhelp parent PIDs are historical identifiers, not live parent identities.
internal static class ProcessTree {
    internal readonly record struct Edge(int Pid,int Parent);
    internal static void Expand(Dictionary<int,DateTime> known,IEnumerable<Edge> snapshot,Func<int,DateTime?> created) {
        var live=known.Where(p=>created(p.Key)==p.Value).ToDictionary(p=>p.Key,p=>p.Value);
        var edges=snapshot.ToArray(); bool changed;
        do {
            changed=false;
            foreach(var edge in edges) if(!live.ContainsKey(edge.Pid) && live.TryGetValue(edge.Parent,out DateTime parentTime)) {
                DateTime? childTime=created(edge.Pid);
                if(childTime==null || childTime.Value<parentTime || created(edge.Parent)!=parentTime) continue;
                live[edge.Pid]=childTime.Value;known[edge.Pid]=childTime.Value;changed=true;
            }
        } while(changed);
    }
}
