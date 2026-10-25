"""Isolated six-host supplemental workload cohort; real input, no script injection."""
from pathlib import Path
import hashlib,json,random,subprocess,sys,argparse
ROOT=Path(__file__).resolve().parents[2]; HERE=Path(__file__).resolve().parent
STAGE=ROOT/'host-test-support/.cache/workload-hosts-20261023'; ASSETS=STAGE/'NeutronStar-Svelte/dist'
COLLECTOR=ROOT/'host-test-support/.cache/workload-bin/Workloads.dll'
sys.path.insert(0,str(ROOT/'host-test-support/measurement'))
from analyze import dist,interval
def read(p):return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def write(p,d):p=Path(p);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,indent=2),encoding='utf8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
HOSTS={
 'cpp':ROOT/'webview2-raw-bench/NeutronStar-Host/out/clang-cl-ninja-x64/Release/neutronstar_host_runner.exe',
 'rust':ROOT/'webview2-com/target/x86_64-pc-windows-msvc/release/neutronstar-rust-host.exe',
 'tauri':STAGE/'Tauri-v2-Test/src-tauri/target/x86_64-pc-windows-msvc/release/neutronstar-tauri.exe',
 'wails':STAGE/'Wails/build/bin/neutronstar-wails.exe',
 'pywebview':STAGE/'pywebview/neutronstar-pywebview.exe',
 'winui':STAGE/'winui/neutronstar-winui-webview2.exe'}
def analyze(folder):
 results=[read(p) for p in (folder/'runs').glob('*/result.json')];groups={};errors=[]
 for r in results:
  tag=Path(r['config']['output']).name
  if r.get('status')!='passed':errors.append({'case':tag,'error':r.get('error') or r.get('cleanupFailure')});continue
  if not tag.startswith('measured-'):continue
  for a in r['actions']:groups.setdefault((r['config']['app'],a['name']),{})[int(tag.split('-')[1])]=a['inputToUiaObservedMs']
 rows=[]
 for (app,name),values in sorted(groups.items()):
  base=groups.get(('cpp',name),{});delta=[v-base[i] for i,v in values.items() if i in base]
  rows.append({'app':app,'action':name,'inputToUiaObservedMs':dist(list(values.values())),'pairedMedianDeltaVsCppMs':__import__('statistics').median(delta) if delta else None,'pairedBootstrap95IntervalMs':interval(delta)})
 write(folder/'summary.json',{'attempts':len(results),'failed':errors,'actions':rows})
def main():
 parser=argparse.ArgumentParser();parser.add_argument('phase',choices=['pilot','measure','summarize']);parser.add_argument('--folder',required=True);args=parser.parse_args();folder=Path(args.folder).resolve();folder.mkdir(parents=True,exist_ok=True)
 if args.phase=='summarize':analyze(folder);return
 sys.path.insert(0,str(ROOT/'host-test-support'));from verify_assets import verify
 manifest=read(STAGE/'NeutronStar-Svelte/.cache/frontend-manifest.json')
 for assets in [ASSETS,STAGE/'winui/Frontend',STAGE/'pywebview/_internal/frontend',STAGE/'Wails/frontend/dist']:verify(assets,manifest)
 files=list(HOSTS.values())+list(ASSETS.rglob('*'))+list(COLLECTOR.parent.glob('*'))+list(HERE.glob('*.cs'))+list(HERE.glob('*.py'))+[HERE/'Workloads.csproj',HERE/'packages.lock.json',HERE/'global.json',HERE/'NuGet.Config',ROOT/'host-test-support/measurement/Native.cs',ROOT/'host-test-support/measurement/ProcessTree.cs']
 for name in ['winui','pywebview']:files+=list((STAGE/name).rglob('*'))
 files=sorted(set(p for p in files if p.is_file()));freeze={str(p.relative_to(ROOT)):{'sha256':sha(p),'bytes':p.stat().st_size,'mtimeNs':p.stat().st_mtime_ns} for p in files}
 if (folder/'freeze.json').exists() and read(folder/'freeze.json')['files']!=freeze:raise RuntimeError('Supplemental freeze changed')
 write(folder/'freeze.json',{'files':freeze,'scope':'Same supplemental Svelte payload; no production replacement','rounds':20,'warmups':3})
 runtime=read(folder/'runtime.json') if (folder/'runtime.json').exists() else None
 def run(app,tag):
  nonlocal runtime
  out=folder/'runs'/tag
  if (out/'result.json').exists():
   if read(out/'result.json').get('status')!='passed':raise RuntimeError('Prior rejected attempt: '+tag)
   return
  out.mkdir(parents=True,exist_ok=True)
  config={'app':app,'runner':str(HOSTS[app]),'assets':str(ASSETS),'profile':str(out/'profile'),'output':str(out),'arguments':['--assets',str(ASSETS)] if app in ['cpp','rust'] else []};write(out/'config.json',config);write(folder/'progress.json',{'running':tag})
  p=subprocess.run(['dotnet',str(COLLECTOR),str(out/'config.json')],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,creationflags=subprocess.CREATE_NO_WINDOW,timeout=300);(out/'collector.log').write_text(p.stdout,encoding='utf8')
  if not (out/'result.json').exists():write(out/'result.json',{'config':config,'status':'failed','error':'Collector exited without final report'})
  r=read(out/'result.json');print(tag+': '+r.get('status','missing'),flush=True)
  if p.returncode or r.get('status')!='passed':raise RuntimeError('Rejected supplemental attempt: '+tag+' '+str(r.get('error')))
  if runtime is None:runtime=r['runtime'];write(folder/'runtime.json',runtime)
  if r['runtime']!=runtime:raise RuntimeError('Runtime changed')
  for file in files:
   stat=file.stat();old=freeze[str(file.relative_to(ROOT))]
   if stat.st_size!=old['bytes'] or stat.st_mtime_ns!=old['mtimeNs']:raise RuntimeError('Frozen artifact changed')
 if args.phase=='pilot':
  for app in HOSTS:run(app,'pilot-'+app)
 else:
  if not (folder/'pilot-accepted.json').exists():raise RuntimeError('Reviewed supplemental pilot required')
  rng=random.Random(24102026)
  for index in range(23):
   order=list(HOSTS);rng.shuffle(order)
   for app in order:run(app,f'{"warmup" if index<3 else "measured"}-{index:02d}-{app}')
 for file in files:
  if sha(file)!=freeze[str(file.relative_to(ROOT))]['sha256']:raise RuntimeError('Final supplemental hash mismatch')
 analyze(folder);write(folder/'progress.json',{'phase':args.phase,'status':'complete'})
if __name__=='__main__':main()
