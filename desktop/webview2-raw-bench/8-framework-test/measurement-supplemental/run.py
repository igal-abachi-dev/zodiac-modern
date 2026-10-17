"""Separate supplemental cohort; never mix with primary startup timings."""
import argparse
import hashlib
import json
from pathlib import Path
import random
import subprocess

ROOT=Path(__file__).resolve().parents[1]
APPS=['vanilla','svelte','react','vue','solid','lit','preact','alpine','htmx']
RUNNER=ROOT.parent/'NeutronStar-Host/out/clang-cl-ninja-x64/Release/neutronstar_host_runner.exe'
DLL=ROOT/'.cache/workload-measurement-bin/Workloads.dll'

def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,data): p.write_text(json.dumps(data,indent=2),encoding='utf8')
def freeze():
    paths=[RUNNER,DLL,Path(__file__),ROOT/'measurement-supplemental/Workloads.cs',ROOT/'measurement-supplemental/Workloads.csproj',ROOT/'measurement/Native.cs',ROOT/'measurement/ProcessTree.cs']
    for app in APPS: paths+=sorted((ROOT/'apps'/app/'dist-workload').rglob('*'))
    return {str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths if p.is_file()}

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('phase',choices=['pilot','measure']);parser.add_argument('--folder',required=True)
    args=parser.parse_args(); folder=Path(args.folder).resolve();folder.mkdir(parents=True,exist_ok=True)
    frozen=freeze(); manifest=folder/'freeze.json'
    if manifest.exists():
        if read(manifest)!=frozen: raise RuntimeError('Supplemental freeze changed; new folder required')
    else: write(manifest,frozen)
    def run(app,tag):
        output=folder/tag
        if (output/'result.json').exists():
            if read(output/'result.json')['status']!='passed': raise RuntimeError('Failed attempt retained: '+tag)
            return
        output.mkdir(exist_ok=True)
        write(folder/'progress.json',{'running':tag})
        command=['dotnet',str(DLL),str(RUNNER),str(ROOT/'apps'/app/'dist-workload'),str(output),'1']
        completed=subprocess.run(command,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,
                                 creationflags=subprocess.CREATE_NO_WINDOW,timeout=180)
        (output/'collector.log').write_text(completed.stdout,encoding='utf8')
        result=read(output/'result.json'); print(tag+': '+result['status'],flush=True)
        if completed.returncode or result['status']!='passed': raise RuntimeError('Failed attempt retained: '+tag)
        runtime=[json.loads(line)['runtime'] for line in (output/'host.jsonl').read_text().splitlines() if '"runtime"' in line]
        expected=folder/'runtime.json'
        if expected.exists():
            if read(expected)!=runtime: raise RuntimeError('Runtime changed')
        else: write(expected,runtime)
        if freeze()!=frozen: raise RuntimeError('Frozen files changed')
    if args.phase=='pilot':
        for app in ['vanilla','react','htmx']: run(app,'pilot-'+app)
    else:
        if not (folder/'pilot-accepted.json').exists(): raise RuntimeError('Pilot review required')
        rng=random.Random(17092026)
        for index in range(23):
            order=APPS.copy();rng.shuffle(order)
            for app in order: run(app,f'{"warmup" if index<3 else "measured"}-{index:02d}-{app}')
    write(folder/'progress.json',{'phase':args.phase,'status':'complete'})

if __name__=='__main__': main()
