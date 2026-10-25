"""Visible loading-surface check using the accepted external collector, not a new benchmark cohort."""
from pathlib import Path
import json,subprocess,time
HOST=Path(__file__).resolve().parents[1];ROOT=HOST.parents[1]
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def main():
 out=HOST/'.cache'/('visual-continuity-'+time.strftime('%Y%m%d-%H%M%S'));out.mkdir(parents=True)
 build=HOST/'out/clang-cl-ninja-x64-lifecycle-20261024/Release'
 collector=ROOT/'host-test-support/.cache/action-measurement-bin/Measurement.dll'
 template=read(ROOT/'host-test-support/.cache/six-host-20261024-h/runs/pilot-cpp-direct-pair2/config.json')
 results=[]
 for mode,exe,reveal in [('immediate-files','neutronstar_host_runner.exe','--show-browser-immediately'),('held-files','neutronstar_host_runner.exe','--reveal-after-navigation'),('immediate-embedded','neutronstar_embedded_runner.exe','--show-browser-immediately'),('held-embedded','neutronstar_embedded_runner.exe','--reveal-after-navigation')]:
  for index in range(2):
   case=out/f'{mode}-{index}';case.mkdir()
   arguments=['--assets',str(ROOT/'NeutronStar-Svelte/dist'),'--report',str(case/'native.jsonl'),'--background-rgb','F8FAF9','--color-scheme','light',reveal]
   config={**template,'runner':str(build/exe),'output':str(case),'profile':str(case/'profile'),'arguments':arguments,'scenario':'startup','launch':'direct'}
   (case/'config.json').write_text(json.dumps(config,indent=2))
   p=subprocess.run(['dotnet',str(collector),str(case/'config.json')],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,creationflags=subprocess.CREATE_NO_WINDOW,timeout=120)
   (case/'collector.log').write_text(p.stdout)
   r=read(case/'result.json')
   if p.returncode or r['status']!='passed' or r['hostExitCode']!=0 or not r['helpersExited']:raise RuntimeError('Visual check failed, retained: '+str(case))
   frames=[f for f in read(case/'frames.json') if 'capturedMs' in f]
   results.append({'case':case.name,'status':r['status'],'runtime':r['runtime'],'nearBlackSamples':sum(f['classification']=='near-black' for f in frames),'lastFrame':frames[-1]['file'],'scope':'sampled GDI client frames; not physical presentation or guaranteed flash absence'})
 (out/'summary.json').write_text(json.dumps(results,indent=2));print(out)
if __name__=='__main__':main()
