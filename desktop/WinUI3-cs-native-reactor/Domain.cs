namespace NeutronStar.ReactorBench.Domain;
public sealed record Flow(bool Loaded=false,string Status="ready",string? Operation=null,int Progress=0,int Token=-1);
public abstract record FlowAction;
public sealed record Loaded:FlowAction;
public sealed record Start(string Operation,int Token):FlowAction;
public sealed record Advance(int Token,double Elapsed):FlowAction;
public sealed record Cancel:FlowAction;
public sealed record Reset:FlowAction;
public sealed record Row(int Id,string Label,int Value);
public sealed record Rows(IReadOnlyList<Row> Items,int Next=0,string Query="",int Tick=0,int Token=-1){public static Rows Empty=>new(Array.Empty<Row>());}
public abstract record RowAction;
public sealed record Replace(int Count):RowAction;
public sealed record Reverse:RowAction;
public sealed record Splice:RowAction;
public sealed record Update(int? Token=null):RowAction;
public sealed record Query(string Value):RowAction;
public sealed record BeginBurst(int Token):RowAction;
public sealed record Stop:RowAction;
public sealed record Remount:RowAction;
public static class Reducers
{
 public const string Fixture="Zodiac GUI benchmark — שלום — 🌠";
 public static Flow Flow(Flow s,FlowAction a)=>a switch{
  Loaded=>s with{Loaded=true},Start x when s.Loaded&&s.Status!="running"=>s with{Status="running",Operation=x.Operation,Progress=0,Token=x.Token},
  Advance x when s.Status=="running"&&s.Token==x.Token&&double.IsFinite(x.Elapsed)=>s with{Progress=Math.Max(s.Progress,Math.Clamp((int)(x.Elapsed/20),0,100)),Status=x.Elapsed>=2000?"success":"running"},
  Cancel when s.Status=="running"=>s with{Status="canceled",Token=-1},Reset=>s with{Status="ready",Operation=null,Progress=0,Token=-1},_=>s};
 public static string Status(Flow s)=>!s.Loaded?"Loading local interface…":s.Status switch{"running"=>$"Simulating {(s.Operation=="encrypt"?"encryption":"decryption")}…","success"=>"Simulation complete. No file was changed.","canceled"=>"Simulation canceled.",_=>"Ready"};
 private static Row[] Create(int count,int start)=>Enumerable.Range(start,count).Select(id=>new Row(id,$"row-{id} שלום",0)).ToArray();
 public static Rows List(Rows s,RowAction a)=>a switch{
  Replace x when x.Count>=0&&x.Count<=10000=>new(Create(x.Count,s.Next),s.Next+x.Count),Replace=>throw new ArgumentOutOfRangeException(nameof(a)),
  Reverse=>s with{Items=s.Items.Reverse().ToArray()},Splice=>s with{Items=Create(10,s.Next).Concat(s.Items.Skip(10)).ToArray(),Next=s.Next+10},
  Update x when x.Token is null||x.Token==s.Token=>s with{Tick=s.Tick+1,Items=s.Items.Select((r,i)=>i%10==0?r with{Value=r.Value+1}:r).ToArray()},
  Query x=>s with{Query=x.Value},BeginBurst x=>s with{Token=x.Token},Stop=>s with{Token=-1},Remount=>new(Create(1000,0),1000),_=>s};
 public static Row[] Visible(Rows s)=>s.Items.Where(r=>r.Label.Contains(s.Query,StringComparison.Ordinal)).ToArray();
}
