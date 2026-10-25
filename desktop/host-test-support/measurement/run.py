"""Six-host serial collection. Failed attempts stop; no silent replacements."""
from pathlib import Path
import argparse, hashlib, json, os, random, subprocess, sys, time
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
COLLECTOR = ROOT / 'host-test-support/.cache/measurement-bin/Measurement.dll'
ASSETS = ROOT / 'NeutronStar-Svelte/dist'
HOSTS = {
 'cpp': ('webview2-raw-bench/NeutronStar-Host/out/clang-cl-ninja-x64/Release/neutronstar_host_runner.exe', 'raw-inprivate', True),
 'rust': ('webview2-com/target/x86_64-pc-windows-msvc/release/neutronstar-rust-host.exe', 'raw-inprivate', True),
 'tauri': ('Tauri-v2-Test/src-tauri/target/x86_64-pc-windows-msvc/release/neutronstar-tauri.exe', 'framework-inprivate', False),
 'wails': ('Wails/build/bin/neutronstar-wails.exe', 'framework-persistent-permission-difference', False),
 'pywebview': ('PyWebView/dist/neutronstar-pywebview/neutronstar-pywebview.exe', 'loopback-private-cleanup', False),
 'winui': ('WinUI3-webview2/out/win-x64/neutronstar-winui-webview2.exe', 'winui-inprivate', False),
}
def read(p): return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def write(p, data):
 p = Path(p); p.parent.mkdir(parents=True, exist_ok=True)
 tmp = p.with_suffix(p.suffix + '.tmp'); tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf8'); tmp.replace(p)
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def artifacts():
 files = list(HERE.glob('*.cs')) + list(HERE.glob('*.py')) + list(HERE.glob('*.ps1')) + list(HERE.glob('*.json')) + [HERE/'Measurement.csproj', HERE/'NuGet.Config']
 files += list(COLLECTOR.parent.glob('*'))
 files += list((ROOT/'host-test-support/uia3').glob('*.cs')) + [ROOT/'host-test-support/uia3/packages.lock.json', ROOT/'host-test-support/.cache/uia3/UIA3Probe.dll']
 files += list(ASSETS.rglob('*')) + [ROOT/'NeutronStar-Svelte/.cache/frontend-manifest.json', ROOT/'NeutronStar-Svelte/pnpm-lock.yaml']
 for _, (exe, _, _) in HOSTS.items(): files.append(ROOT/exe)
 for folder in ['WinUI3-webview2/out/win-x64','PyWebView/dist/neutronstar-pywebview']:
  files += list((ROOT/folder).rglob('*'))
 for folder in ['Tauri-v2-Test','Wails','PyWebView','webview2-com','WinUI3-webview2']:
  for name in ['.cache/build-receipt.json','Cargo.lock','go.sum','requirements.lock','packages.lock.json']:
   p=ROOT/folder/name
   if p.is_file(): files.append(p)
 files.append(ROOT/'Tauri-v2-Test/src-tauri/Cargo.lock')
 return sorted(set(p for p in files if p.is_file()))
def snapshot(files): return {str(p.relative_to(ROOT)): {'sha256':sha(p),'bytes':p.stat().st_size,'mtimeNs':p.stat().st_mtime_ns} for p in files}
def validate_assets():
 sys.path.insert(0,str(ROOT/'host-test-support'))
 from verify_assets import verify
 manifest = read(ROOT/'NeutronStar-Svelte/.cache/frontend-manifest.json')
 verify(ASSETS,manifest)
 for staged in ['Wails/frontend/dist','PyWebView/dist/neutronstar-pywebview/_internal/frontend','WinUI3-webview2/out/win-x64/Frontend']:
  verify(ROOT/staged,manifest)
 for folder, key in [('Tauri-v2-Test','executableSha256'),('Wails','executableSha256')]:
  receipt=read(ROOT/folder/'.cache/build-receipt.json')
  host='tauri' if folder.startswith('Tauri') else 'wails'
  if receipt[key].lower()!=sha(ROOT/HOSTS[host][0]): raise RuntimeError('Embedded host differs from build receipt')
  manifest_key='frontendManifestSha256'
  if receipt[manifest_key].lower()!=sha(ROOT/'NeutronStar-Svelte/.cache/frontend-manifest.json'): raise RuntimeError('Embedded frontend identity differs')
 return manifest

def main():
 global COLLECTOR
 parser=argparse.ArgumentParser(); parser.add_argument('phase',choices=['correctness','earlyclose','pilot','actionpilot','startup','resources','actions','all','summarize']); parser.add_argument('--folder',required=True); parser.add_argument('--hosts',nargs='+',choices=list(HOSTS)); parser.add_argument('--collector',default=str(COLLECTOR)); args=parser.parse_args()
 COLLECTOR=Path(args.collector).resolve()
 folder=Path(args.folder).resolve(); folder.mkdir(parents=True,exist_ok=True)
 if args.phase=='summarize':
  subprocess.run([sys.executable,str(HERE/'analyze.py'),str(folder)],check=True); return
 manifest=validate_assets(); files=artifacts(); current=snapshot(files)
 freeze=folder/'freeze.json'
 if freeze.exists():
  if read(freeze)['files']!=current: raise RuntimeError('Frozen artifacts changed; use a new cohort')
 else:
  write(freeze,{'createdUtc':datetime.now(timezone.utc).isoformat(),'files':current,'hosts':HOSTS,'fixture':manifest['fixture'],
   'protocol':{'automation':'UIA3 for all','clientDips':[960,640],'captureHz':20,'startupWarmups':3,'startupRounds':20,'idleLifetimes':5,'samplesPerStatePerLifetime':12,'actionLifetimes':20,
    'profile':'fresh and retained directory paths; actual cache/private behavior differs by host','notMeasured':['physical scanout','Explorer gesture','GPU/energy','post-reboot cold start','physical assistive technology']}})
 runtime=read(folder/'runtime.json') if (folder/'runtime.json').exists() else None
 def integrity():
  if set(artifacts())!=set(files): raise RuntimeError('Frozen artifact file set changed')
  for p in files:
   stat=p.stat(); old=current[str(p.relative_to(ROOT))]
   if stat.st_size!=old['bytes'] or stat.st_mtime_ns!=old['mtimeNs']: raise RuntimeError('Frozen file changed: '+str(p))
 def run(app,launch,condition,tag,scenario='startup',idle=12,repeats=1,order=None):
  nonlocal runtime
  output=folder/'runs'/tag; result_path=output/'result.json'
  if result_path.exists():
   old=read(result_path)
   if old.get('status')!='passed': raise RuntimeError('Rejected attempt retained: '+tag)
   return old
  output.mkdir(parents=True,exist_ok=True)
  profile=folder/'profiles'/(app+'-'+launch+'-retained' if condition=='retained' else tag)
  exe,group,external=HOSTS[app]
  config={'app':app,'assets':str(ASSETS),'runner':str(ROOT/exe),'launcher':str(HERE/'Launch.ps1'),'profile':str(profile),'output':str(output),
   'launch':launch,'scenario':scenario,'idleSeconds':idle,'actionRepeats':repeats,'captureHz':20,'arguments':['--assets',str(ASSETS)] if external else [],
   'idleOrder':order or ['visible','unfocused','occluded','minimized','restored']}
  write(output/'config.json',config); write(folder/'progress.json',{'phase':args.phase,'running':tag,'utc':datetime.now(timezone.utc).isoformat()})
  integrity()
  completed=subprocess.run(['dotnet',str(COLLECTOR),str(output/'config.json')],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,creationflags=subprocess.CREATE_NO_WINDOW,timeout=600)
  (output/'collector.log').write_text(completed.stdout,encoding='utf8')
  if not result_path.exists():
   write(result_path,{'status':'failed','config':config,'error':'Collector exited without a final report; see collector.log','collectorExitCode':completed.returncode})
  result=read(result_path); print(tag+': '+result.get('status','missing'),flush=True)
  if completed.returncode or result.get('status')!='passed': raise RuntimeError('Rejected attempt: '+tag+' '+str(result.get('error') or result.get('cleanupFailure')))
  if scenario!='earlyclose':
   if runtime is None: runtime=result['runtime']; write(folder/'runtime.json',runtime)
   if result['runtime']!=runtime: raise RuntimeError('Runtime changed; split cohort')
  integrity(); return result
 if args.phase=='correctness':
  for app,(exe,_,external) in HOSTS.items():
   report=folder/f'correctness-{app}.json'
   if report.exists() and read(report).get('passed'): continue
   command=['dotnet',str(ROOT/'host-test-support/.cache/uia3/UIA3Probe.dll'),str(ROOT/exe),str(folder/'profiles'/('correctness-'+app)),str(report)]
   if external: command+=['--assets',str(ASSETS)]
   p=subprocess.run(command,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,creationflags=subprocess.CREATE_NO_WINDOW,timeout=90)
   print(app+': '+p.stdout.strip(),flush=True)
   if p.returncode or not read(report).get('passed'): raise RuntimeError('Correctness failed: '+app)
 elif args.phase=='earlyclose':
  for app in HOSTS:
   for index in range(3):run(app,'direct','fresh',f'earlyclose-{index}-{app}','earlyclose')
 elif args.phase=='actionpilot':
  for app in HOSTS:run(app,'direct','fresh',f'pilot-actions-{app}','actions',repeats=2)
  write(folder/'pilot-complete.json',{'status':'awaiting action evidence review','runs':6,'hosts':list(HOSTS)})
 elif args.phase=='pilot':
  for app in args.hosts or HOSTS:
   for launch in ['direct','powershell']:
    for n in range(2): run(app,launch,'retained',f'pilot-{app}-{launch}-pair{n+1}')
   run(app,'direct','fresh',f'pilot-{app}-idle','idle',idle=3)
   run(app,'direct','fresh',f'pilot-{app}-actions','actions',repeats=2)
  write(folder/'pilot-complete.json',{'status':'awaiting evidence review','runs':6*len(args.hosts or HOSTS),'hosts':args.hosts or list(HOSTS)})
 elif args.phase in ['startup','resources','actions','all']:
  if not (folder/'pilot-accepted.json').exists(): raise RuntimeError('Reviewed pilot acceptance required')
  phases=['startup','resources','actions'] if args.phase=='all' else [args.phase]
  for phase in phases:
   rng=random.Random(23102026)
   if phase=='startup':
    for app in HOSTS:
     for launch in ['direct','powershell']:
      for n in range(2): run(app,launch,'retained',f'pair-{app}-{launch}-{n+1}')
    for index in range(23):
     cases=[(a,l,c) for a in HOSTS for l in ['direct','powershell'] for c in ['fresh','retained']]; rng.shuffle(cases)
     for app,launch,condition in cases: run(app,launch,condition,f'{"warmup" if index<3 else "measured"}-{index:02d}-{app}-{launch}-{condition}')
   elif phase=='resources':
    states=['visible','unfocused','occluded','minimized','restored']
    for lifetime in range(5):
     apps=list(HOSTS); rng.shuffle(apps)
     order=states[lifetime:]+states[:lifetime]
     for app in apps: run(app,'direct','fresh',f'resources-{lifetime}-{app}','idle',order=order)
   elif phase=='actions':
    for lifetime in range(23):
     apps=list(HOSTS); rng.shuffle(apps)
     for app in apps: run(app,'direct','fresh',f'{"action-warmup" if lifetime<3 else "actions"}-{lifetime:02d}-{app}','actions')
 if snapshot(files)!=current: raise RuntimeError('Final hash verification failed')
 write(folder/'progress.json',{'phase':args.phase,'status':'phase complete','utc':datetime.now(timezone.utc).isoformat()})
if __name__=='__main__': main()
