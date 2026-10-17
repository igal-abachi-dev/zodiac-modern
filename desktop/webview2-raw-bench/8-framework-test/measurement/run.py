"""Serial, restartable Windows measurement orchestration; standard library only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import random
import statistics
import subprocess
import sys
import time
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
APPS = ['vanilla', 'svelte', 'react', 'vue', 'solid', 'lit', 'preact', 'alpine', 'htmx']
RUNNER = ROOT.parent / 'NeutronStar-Host/out/clang-cl-ninja-x64/Release/neutronstar_host_runner.exe'
COLLECTOR = ROOT / '.cache/measurement-bin/Measurement.dll'

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def write(path, data):
    path = Path(path)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf8')
    temporary.replace(path)

def freeze():
    files = [RUNNER, COLLECTOR, ROOT / 'Run.ps1', ROOT / 'pnpm-lock.yaml', Path(__file__),
             ROOT / 'measurement/Measurement.csproj', ROOT / 'measurement/NuGet.Config']
    files += list((ROOT / 'measurement').glob('*.cs'))
    for app in APPS:
        files += sorted((ROOT / 'apps' / app / 'dist').rglob('*'))
    return {str(p.relative_to(ROOT) if p.is_relative_to(ROOT) else p): digest(p)
            for p in files if p.is_file()}

def summarize(folder):
    records = []
    for path in sorted((folder / 'runs').glob('*/result.json')):
        r = json.loads(path.read_text(encoding='utf-8-sig'))
        records.append(r)
    groups = {}
    for r in records:
        c = r['config']
        if r.get('status') != 'passed' or c.get('scenario') != 'startup':
            continue
        tag = Path(c['output']).name
        if not tag.startswith('measured-'):
            continue
        condition = 'fresh' if '-fresh-' in tag else 'retained'
        key = '|'.join([c['app'], c['launch'], condition])
        groups.setdefault(key, []).append(r)
    rows = []
    for key, values in sorted(groups.items()):
        times = sorted(r['hostToReadyMs'] for r in values)
        # Nearest-rank p95: deliberately no p99 from 20 samples.
        p95 = times[max(0, __import__('math').ceil(.95 * len(times)) - 1)]
        frames = []
        for r in values:
            data = json.loads((Path(r['config']['output']) / 'frames.json').read_text())
            frames.extend(b['startMs']-a['startMs'] for a,b in zip(data,data[1:]) if 'startMs' in a and 'startMs' in b)
        rows.append({'condition': key, 'n': len(times), 'hostToReadyMedianMs': statistics.median(times),
                     'hostToReadyP95Ms': p95, 'minimumMs': min(times), 'maximumMs': max(times),
                     'sampleStdDevMs': statistics.stdev(times) if len(times)>1 else None,
                     'launchToReadyMedianMs': statistics.median(r['launchToReadyMs'] for r in values),
                     'captureIntervalMedianMs': statistics.median(frames) if frames else None})
    write(folder/'summary.json', {'totalAttempts':len(records), 'passed':sum(r.get('status')=='passed' for r in records),
          'failed':sum(r.get('status')!='passed' for r in records), 'startup':rows,
          'interpretation':'Instrumented lab observations. UIA readiness is not physical presentation. See raw records and limits.'})
    return records

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('phase', choices=['pilot','startup','resources','actions','summarize'])
    parser.add_argument('--folder', required=True)
    args = parser.parse_args()
    folder = Path(args.folder).resolve()
    folder.mkdir(parents=True, exist_ok=True)
    (folder/'runs').mkdir(exist_ok=True)
    current = freeze()
    freeze_path = folder/'freeze.json'
    if freeze_path.exists():
        if json.loads(freeze_path.read_text())['files'] != current:
            raise SystemExit('Frozen source/host/assets/collector changed; use a new cohort')
    else:
        write(freeze_path, {'createdUtc':datetime.now(timezone.utc).isoformat(), 'files':current,
              'policy':{'bridge':False,'decorated':True,'memoryTarget':'normal','captureHzRequested':20,
                        'profile':'InPrivate; fresh paths versus retained paths, not proof of browser cache retention'},
              'unavailable':['physical panel scan-out','Explorer right-click gesture timing','GPU allocations','post-reboot OS-cold control'],
              'python':sys.version, 'platform':sys.platform})
    runtime_file=folder/'runtime.json'
    expected_runtime=json.loads(runtime_file.read_text()) if runtime_file.exists() else None
    def run(app, launch, condition, tag, scenario='startup', idle=60, repeats=20):
        nonlocal expected_runtime
        output=folder/'runs'/tag
        if (output/'result.json').exists():
            old=json.loads((output/'result.json').read_text(encoding='utf-8-sig'))
            if old.get('status')!='passed': raise RuntimeError('Prior failed sample retained; review before resume: '+tag)
            return old
        output.mkdir(exist_ok=True)
        profile=folder/'profiles'/(app+'-'+launch if condition=='retained' else tag)
        config={'app':app,'assets':str(ROOT/'apps'/app/'dist'),'runner':str(RUNNER),'launcher':str(ROOT/'Run.ps1'),
                'profile':str(profile),'output':str(output),'launch':launch,'scenario':scenario,
                'idleSeconds':idle,'actionRepeats':repeats,'captureHz':20}
        write(output/'config.json',config)
        write(folder/'progress.json',{'phase':args.phase,'running':tag,'utc':datetime.now(timezone.utc).isoformat()})
        completed=subprocess.run(['dotnet',str(COLLECTOR),str(output/'config.json')],cwd=ROOT,
                                 stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,
                                 creationflags=subprocess.CREATE_NO_WINDOW,timeout=600)
        (output/'collector.log').write_text(completed.stdout,encoding='utf8')
        result=json.loads((output/'result.json').read_text(encoding='utf-8-sig'))
        print(tag+': '+result.get('status','missing'),flush=True)
        if completed.returncode or result.get('status')!='passed':
            summarize(folder)
            raise RuntimeError('Measurement sample failed; retained without replacement: '+tag+' '+str(result.get('error')))
        if expected_runtime is None:
            expected_runtime=result.get('runtime'); write(runtime_file,expected_runtime)
        if not expected_runtime or result.get('runtime') != expected_runtime:
            raise RuntimeError('Runtime cohort changed; stop and split results')
        if freeze()!=current: raise RuntimeError('Frozen files changed during cohort')
        return result
    if args.phase=='pilot':
        for app in ['vanilla','svelte','react']:
            for launch in ['direct','powershell']:
                for n in range(2):
                    run(app,launch,'retained',f'pilot-{app}-{launch}-pair{n+1}')
                    if n==0: time.sleep(5)
            run(app,'direct','fresh',f'pilot-{app}-idle','idle',idle=5)
            run(app,'direct','fresh',f'pilot-{app}-actions','actions',repeats=2)
        records=summarize(folder)
        write(folder/'pilot-complete.json',{'status':'awaiting visual/evidence review','attempts':len(records)})
    elif args.phase=='startup':
        if not (folder/'pilot-accepted.json').exists(): raise RuntimeError('Pilot acceptance record required')
        rng=random.Random(17092026)
        # First/repeat pairs are retained separately and are not warmups.
        for app in APPS:
            for launch in ['direct','powershell']:
                for n in range(2):
                    run(app,launch,'retained',f'pair-{app}-{launch}-{n+1}')
                    if n==0: time.sleep(5)
        for index in range(23):
            cases=[(a,l,c) for a in APPS for l in ['direct','powershell'] for c in ['fresh','retained']]
            rng.shuffle(cases)
            for app,launch,condition in cases:
                kind='warmup' if index<3 else 'measured'
                run(app,launch,condition,f'{kind}-{index:02d}-{app}-{launch}-{condition}')
            summarize(folder)
    elif args.phase in ['resources','actions']:
        if not (folder/'pilot-accepted.json').exists(): raise RuntimeError('Pilot acceptance record required')
        order=APPS.copy(); random.Random(17092026).shuffle(order)
        for app in order:
            run(app,'direct','fresh',f'{args.phase}-{app}', 'idle' if args.phase=='resources' else 'actions')
            summarize(folder)
    summarize(folder)
    write(folder/'progress.json',{'phase':args.phase,'status':'phase complete','utc':datetime.now(timezone.utc).isoformat()})

if __name__=='__main__':
    main()
