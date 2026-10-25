"""Paired file/embedded delivery experiment; native phases, not UIA Ready or paint."""
from pathlib import Path
import argparse,hashlib,json,random,statistics,subprocess,time,shutil
HOST=Path(__file__).resolve().parents[1]
DESKTOP=HOST.parents[1]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--build',required=True);parser.add_argument('--rounds',type=int,default=10);args=parser.parse_args()
 build=Path(args.build).resolve();assets=DESKTOP/'NeutronStar-Svelte/dist';out=HOST/'.cache'/('startup-delivery-'+time.strftime('%Y%m%d-%H%M%S'));out.mkdir(parents=True)
 exes={'files':build/'neutronstar_host_runner.exe','embedded':build/'neutronstar_embedded_runner.exe'}
 header=(HOST/'include/neutronstar/host_window.hpp').read_text();enum=header.split('enum class EventKind {',1)[1].split('}',1)[0];names=[x.strip() for x in enum.split(',')]
 inputs={str(p):sha(p) for p in [*exes.values(),*assets.rglob('*')] if p.is_file()}
 for mode,exe in list(exes.items()):
  saved=out/'binaries'/exe.name;saved.parent.mkdir(exist_ok=True);shutil.copyfile(exe,saved);exes[mode]=saved
 source=out/'source';source.mkdir()
 for folder in ['src','include','examples','scripts']:
  shutil.copytree(HOST/folder,source/folder)
 (out/'freeze.json').write_text(json.dumps({'inputs':inputs,'rounds':args.rounds,'seed':24102026,'endpoint':'native NavigationCompleted success; not Svelte Ready, first paint or OS-cold startup'},indent=2))
 rows=[];rng=random.Random(24102026)
 for round in range(-2,args.rounds):
  cases=[(m,c) for m in exes for c in ['fresh','retained']];rng.shuffle(cases)
  for mode,condition in cases:
   tag=f'{round+2:02d}-{mode}-{condition}';profile=out/'profiles'/(mode+'-retained' if condition=='retained' else tag);report=out/(tag+'.jsonl')
   command=[str(exes[mode]),'--assets',str(assets),'--profile',str(profile),'--report',str(report),'--trace-assets','--background-rgb','F8FAF9','--close-at-navigation','--timeout-ms','20000']
   started=time.perf_counter();p=subprocess.run(command,timeout=45,creationflags=subprocess.CREATE_NO_WINDOW);elapsed=(time.perf_counter()-started)*1000
   events=[json.loads(line) for line in report.read_text().splitlines()]
   native={names[e['event']]:e['microseconds']/1000 for e in events if 'event' in e and names[e['event']]!='asset_loaded'}
   runtime=next(e['runtime'] for e in events if 'runtime' in e)
   if p.returncode or 'navigation_complete' not in native or any(e.get('hr',0)<0 for e in events):raise RuntimeError('Rejected attempt retained: '+tag)
   reads=[e for e in events if e.get('event')==names.index('asset_loaded')]
   row={'case':tag,'mode':mode,'profilePath':condition,'warmup':round<0,'exitCode':p.returncode,'processLifetimeMs':elapsed,'runtime':runtime,'phasesMs':native,'assetReads':len(reads),'assetReadTotalMs':sum(e['duration_us'] for e in reads)/1000,'assetBytes':sum(e['bytes'] for e in reads)};rows.append(row)
   (out/'samples.json').write_text(json.dumps(rows,indent=2))
   # Outside the timed endpoint; prevent a surviving browser from warming the next launch.
   literal=str(profile).replace("'","''")
   code="$deadline=[DateTime]::UtcNow.AddSeconds(30); do { $left=@(Get-CimInstance Win32_Process -Filter \"Name='msedgewebview2.exe'\" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('"+literal+"') }); if(-not $left.Count){exit 0}; Start-Sleep -Milliseconds 100 } while([DateTime]::UtcNow -lt $deadline); exit 1"
   if subprocess.run(['powershell.exe','-NoProfile','-Command',code],creationflags=subprocess.CREATE_NO_WINDOW).returncode:raise RuntimeError('Helper shutdown failed; no automatic replacement: '+tag)
  print('Completed paired round '+str(round),flush=True)
 if len({r['runtime'] for r in rows})!=1:raise RuntimeError('Runtime changed')
 summary=[]
 for mode in exes:
  for condition in ['fresh','retained']:
   group=[r for r in rows if r['mode']==mode and r['profilePath']==condition and not r['warmup']]
   def median(fn):return statistics.median(fn(r) for r in group)
   summary.append({'mode':mode,'profilePath':condition,'n':len(group),'startToEnvironmentMs':median(lambda r:r['phasesMs']['environment_ready']),'environmentCreationMs':median(lambda r:r['phasesMs']['environment_ready']-r['phasesMs']['environment_starting']),'controllerCreationMs':median(lambda r:r['phasesMs']['controller_ready']-r['phasesMs']['controller_starting']),'navigationMs':median(lambda r:r['phasesMs']['navigation_complete']-r['phasesMs']['navigation_starting']),'nativeNavigationCompleteMs':median(lambda r:r['phasesMs']['navigation_complete']),'assetReadTotalMs':median(lambda r:r['assetReadTotalMs'])})
 for path,digest in inputs.items():
  if sha(Path(path))!=digest:raise RuntimeError('Input changed: '+path)
 (out/'summary.json').write_text(json.dumps({'runtime':rows[0]['runtime'],'summary':summary,'attempts':len(rows),'scope':'Exploratory n=10 paired rounds; numeric native events with trace overhead; no physical paint/UIA Ready/Tauri causal claim'},indent=2))
 print(out,flush=True)
if __name__=='__main__':main()
