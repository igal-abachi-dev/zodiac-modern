var epoch=DateTime.UnixEpoch;
DateTime At(int seconds)=>epoch.AddSeconds(seconds);
var known=new Dictionary<int,DateTime>{{10,At(100)}};
var current=new Dictionary<int,DateTime>{{10,At(100)},{20,At(50)},{30,At(110)},{40,At(120)}};
ProcessTree.Expand(known,new[]{new ProcessTree.Edge(40,30),new ProcessTree.Edge(20,10),new ProcessTree.Edge(30,10)},id=>current.TryGetValue(id,out var t)?t:null);
if(!known.Keys.Order().SequenceEqual(new[]{10,30,40})) throw new Exception("Stale parent-PID child included or real grandchild omitted");
// A tracked helper exits; the OS reuses its PID. Its unrelated children must not attach.
current[30]=At(200);current[50]=At(210);
ProcessTree.Expand(known,new[]{new ProcessTree.Edge(50,30)},id=>current.TryGetValue(id,out var t)?t:null);
if(known.ContainsKey(50)) throw new Exception("Reused parent identity admitted an unrelated child");
// A genuine new helper can reuse an old PID when attached through a verified live parent.
ProcessTree.Expand(known,new[]{new ProcessTree.Edge(30,10),new ProcessTree.Edge(50,30)},id=>current.TryGetValue(id,out var t)?t:null);
if(known[30]!=At(200) || known[50]!=At(210)) throw new Exception("Genuine new descendant identity not refreshed");
Console.WriteLine("PASS: stale ancestry, unordered grandchildren, live PID reuse, genuine replacement identity");
