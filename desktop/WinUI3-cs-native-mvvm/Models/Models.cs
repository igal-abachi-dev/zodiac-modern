using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
namespace NeutronStar.WinUINative.Models;

public interface IClock { double Now {get;} IDisposable Repeat(Action callback,double periodMs); }
public sealed partial class MainModel:ObservableObject,IDisposable
{
 private readonly IClock clock;private IDisposable? task;private int generation;private bool disposed;
 [ObservableProperty] private bool loaded;
 [ObservableProperty] private bool running;
 [ObservableProperty] private bool workbenchOpen;
 [ObservableProperty] private int progress;
 [ObservableProperty] private string status="Loading local interface…";
 [ObservableProperty] private WorkbenchModel workbench;
 public string Sample=>"Zodiac GUI benchmark — שלום — 🌠";
 public string Percent=>$"{Progress}%";
 public IRelayCommand EncryptCommand{get;}public IRelayCommand DecryptCommand{get;}public IRelayCommand CancelCommand{get;}public IRelayCommand ResetCommand{get;}public IRelayCommand OpenCommand{get;}public IRelayCommand BackCommand{get;}
 public MainModel(IClock clock){this.clock=clock;workbench=new(clock);EncryptCommand=new RelayCommand(()=>Start(true),CanStart);DecryptCommand=new RelayCommand(()=>Start(false),CanStart);CancelCommand=new RelayCommand(Cancel,()=>Running);ResetCommand=new RelayCommand(Reset,()=>Loaded&&!disposed);OpenCommand=new RelayCommand(Open,CanStart);BackCommand=new RelayCommand(Back);}
 private bool CanStart()=>Loaded&&!Running&&!disposed;
 partial void OnLoadedChanged(bool value)=>CommandsChanged();
 partial void OnRunningChanged(bool value)=>CommandsChanged();
 partial void OnProgressChanged(int value)=>OnPropertyChanged(nameof(Percent));
 private void CommandsChanged(){EncryptCommand.NotifyCanExecuteChanged();DecryptCommand.NotifyCanExecuteChanged();CancelCommand.NotifyCanExecuteChanged();ResetCommand.NotifyCanExecuteChanged();OpenCommand.NotifyCanExecuteChanged();}
 public void Ready(){if(disposed)return;Loaded=true;Status="Ready";}
 private void Stop(){generation++;task?.Dispose();task=null;}
 public void Start(bool encrypt){if(!CanStart())return;Stop();int current=generation;double start=clock.Now;Progress=0;Running=true;Status=encrypt?"Simulating encryption…":"Simulating decryption…";if(disposed||generation!=current||!Running)return;task=clock.Repeat(()=>{if(disposed||generation!=current)return;Progress=Math.Max(Progress,Math.Clamp((int)((clock.Now-start)/20),0,100));if(Progress==100){Stop();Running=false;Status="Simulation complete. No file was changed.";}},100);}
 public void Cancel(){Stop();if(Running){Running=false;Status="Simulation canceled.";}}
 public void Reset(){Stop();if(disposed)return;Running=false;Progress=0;Status=Loaded?"Ready":"Loading local interface…";}
 public void Open(){if(!CanStart()||WorkbenchOpen)return;Workbench.Dispose();Workbench=new(clock);Workbench.Replace(1000);WorkbenchOpen=true;}
 public void Back(){Workbench.Dispose();WorkbenchOpen=false;}
 public void Dispose(){Stop();Workbench.Dispose();disposed=true;CommandsChanged();}
}
public sealed record Row(int Id,string Label,int Value){public string Display=>$"{Label}: {Value}";}
public sealed partial class WorkbenchModel:ObservableObject,IDisposable
{
 private readonly IClock clock;private IReadOnlyList<Row> all=Array.Empty<Row>();private IDisposable? timer;private int nextId,generation;private bool disposed;
 [ObservableProperty] private IReadOnlyList<Row> rows=Array.Empty<Row>();
 [ObservableProperty] private string query="";
 [ObservableProperty] private int tick;
 public string Summary=>$"{Rows.Count} rows; tick {Tick}";
 public IRelayCommand ThousandCommand{get;}public IRelayCommand TenThousandCommand{get;}public IRelayCommand ReverseCommand{get;}public IRelayCommand SpliceCommand{get;}public IRelayCommand UpdateCommand{get;}public IRelayCommand TenHzCommand{get;}public IRelayCommand ThirtyHzCommand{get;}public IRelayCommand SixtyHzCommand{get;}public IRelayCommand StopCommand{get;}public IRelayCommand RemountCommand{get;}
 public WorkbenchModel(IClock clock){this.clock=clock;ThousandCommand=new RelayCommand(()=>Replace(1000));TenThousandCommand=new RelayCommand(()=>Replace(10000));ReverseCommand=new RelayCommand(Reverse);SpliceCommand=new RelayCommand(Splice);UpdateCommand=new RelayCommand(Update);TenHzCommand=new RelayCommand(()=>Burst(10));ThirtyHzCommand=new RelayCommand(()=>Burst(30));SixtyHzCommand=new RelayCommand(()=>Burst(60));StopCommand=new RelayCommand(Stop);RemountCommand=new RelayCommand(Remount);}
 partial void OnQueryChanged(string value)=>Filter();partial void OnTickChanged(int value)=>OnPropertyChanged(nameof(Summary));partial void OnRowsChanged(IReadOnlyList<Row> value)=>OnPropertyChanged(nameof(Summary));
 private void Filter(){if(!disposed)Rows=all.Where(r=>r.Label.Contains(Query,StringComparison.Ordinal)).ToArray();}
 private Row[] CreateRows(int count)=>Enumerable.Range(0,count).Select(_=>{int id=nextId++;return new Row(id,$"row-{id} שלום",0);}).ToArray();
 public void Replace(int count){if(disposed)return;if(count<0||count>10000)throw new ArgumentOutOfRangeException(nameof(count));Stop();all=CreateRows(count);Query="";Tick=0;Filter();}
 public void Reverse(){if(disposed)return;all=all.Reverse().ToArray();Filter();}
 public void Splice(){if(disposed)return;all=CreateRows(10).Concat(all.Skip(10)).ToArray();Filter();}
 public void Update(){if(disposed)return;all=all.Select((r,i)=>i%10==0?r with{Value=r.Value+1}:r).ToArray();Tick++;Filter();}
 public void Burst(int hz){if(disposed)return;if(hz!=10&&hz!=30&&hz!=60)throw new ArgumentOutOfRangeException(nameof(hz));Stop();int current=generation;double until=clock.Now+2000;timer=clock.Repeat(()=>{if(disposed||generation!=current)return;if(clock.Now>=until){Stop();return;}Update();},1000.0/hz);}
 public void Stop(){generation++;timer?.Dispose();timer=null;}
 public void Remount(){if(disposed)return;nextId=0;Replace(1000);}
 public void Dispose(){Stop();disposed=true;}
}
