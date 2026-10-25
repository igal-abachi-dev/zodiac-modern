"""Finish missing preplanned cases; preserve the explicitly reviewed rejection."""
from pathlib import Path
import hashlib,json,random,subprocess,sys
ROOT=Path(__file__).resolve().parent.parent
FOLDER=ROOT/'host-test-support/.cache/six-host-actions-20261024-i'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,indent=2),encoding='utf8')
def main():
 freeze=read(FOLDER/'freeze.json');reviewed=read(FOLDER/'reviewed-rejections.json')['rejections'];collector=ROOT/'host-test-support/.cache/action-measurement-bin/Measurement.dll'
 # This amendment changes scheduling only. All measurement binaries/inputs stay frozen.
 for relative,item in freeze['files'].items():
  path=ROOT/relative
  if hashlib.sha256(path.read_bytes()).hexdigest()!=item['sha256']:raise RuntimeError('Frozen input changed: '+relative)
 write(FOLDER/'schedule-completion-amendment.json',{'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'policy':'Same preplanned order and frozen collector; skip only existing results, including reviewed failures; no replacements','reviewedRejections':reviewed})
 template=read(next((FOLDER/'runs').glob('actions-*/config.json')));hosts=freeze['hosts'];rng=random.Random(23102026)
 for index in range(23):
  order=list(hosts);rng.shuffle(order)
  for app in order:
   tag=f'{"action-warmup" if index<3 else "actions"}-{index:02d}-{app}';out=FOLDER/'runs'/tag
   if (out/'result.json').exists():
    if read(out/'result.json').get('status')!='passed' and tag not in reviewed:raise RuntimeError('Unreviewed rejection: '+tag)
    continue
   config={**template,'app':app,'runner':str(ROOT/hosts[app][0]),'profile':str(FOLDER/'profiles'/tag),'output':str(out),'arguments':['--assets',str(ROOT/'NeutronStar-Svelte/dist')] if hosts[app][2] else []}
   write(out/'config.json',config);write(FOLDER/'progress.json',{'phase':'actions-reviewed-continuation','running':tag})
   p=subprocess.run(['dotnet',str(collector),str(out/'config.json')],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,creationflags=subprocess.CREATE_NO_WINDOW,timeout=600);(out/'collector.log').write_text(p.stdout,encoding='utf8')
   if not (out/'result.json').exists():write(out/'result.json',{'config':config,'status':'failed','error':'Collector exited without final report'})
   r=read(out/'result.json');print(tag+': '+r.get('status','missing'),flush=True)
   if p.returncode or r.get('status')!='passed':raise RuntimeError('New rejection retained: '+tag+' '+str(r.get('error')))
   if r['runtime']!=read(FOLDER/'runtime.json'):raise RuntimeError('Runtime changed')
 for relative,item in freeze['files'].items():
  if hashlib.sha256((ROOT/relative).read_bytes()).hexdigest()!=item['sha256']:raise RuntimeError('Frozen input changed')
 write(FOLDER/'progress.json',{'phase':'actions-reviewed-continuation','status':'complete with one retained failed planned attempt'})
if __name__=='__main__':main()
