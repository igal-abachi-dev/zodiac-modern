"""One user-authorized interference retry; preserve the failed trial unchanged."""
from pathlib import Path
import hashlib,json,subprocess,sys
ROOT=Path(__file__).resolve().parent.parent
ORIGINAL=ROOT/'host-test-support/.cache/six-host-actions-20261024-i'
FOLDER=ROOT/'host-test-support/.cache/six-host-actions-20261024-i-interference-retry'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,indent=2),encoding='utf8')
def main():
 freeze=read(ORIGINAL/'freeze.json')
 for name,item in freeze['files'].items():
  if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=item['sha256']:raise RuntimeError('Frozen input changed: '+name)
 source=ORIGINAL/'runs/actions-19-winui'
 if read(source/'result.json')['status']!='failed':raise RuntimeError('Expected original failed trial')
 write(FOLDER/'amendment.json',{'original':str(source),'originalResultSha256':hashlib.sha256((source/'result.json').read_bytes()).hexdigest(),'userStatement':'you can retry the failed winui try , as i accidently click on a mouse on other window','policy':'Exclude the original trial for reported external input interference; retain it unchanged. Exactly one authorized retry with the same frozen collector/hosts/assets. Not a new randomized round.'})
 out=FOLDER/'runs/actions-19-winui'
 if not (out/'result.json').exists():
  config={**read(source/'config.json'),'profile':str(FOLDER/'profiles/actions-19-winui'),'output':str(out)};write(out/'config.json',config)
  p=subprocess.run(['dotnet',str(ROOT/'host-test-support/.cache/action-measurement-bin/Measurement.dll'),str(out/'config.json')],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,creationflags=subprocess.CREATE_NO_WINDOW,timeout=600)
  (out/'collector.log').write_text(p.stdout,encoding='utf8')
  if p.returncode:raise RuntimeError('Authorized retry failed; preserve it without another automatic retry')
 result=read(out/'result.json')
 if result['status']!='passed' or result['runtime']!=read(ORIGINAL/'runtime.json'):raise RuntimeError('Retry rejected or runtime changed')
 write(FOLDER/'runtime.json',result['runtime'])
 subprocess.run([sys.executable,str(ROOT/'host-test-support/review_measurements.py'),str(FOLDER)],check=True,cwd=ROOT)
 sys.path.insert(0,str(ROOT/'host-test-support/measurement'));from analyze import dist
 selected=read(ORIGINAL/'summary.json');values={}
 for path in list((ORIGINAL/'runs').glob('actions-*/result.json'))+[out/'result.json']:
  r=read(path)
  if r['status']!='passed':continue
  for a in read(path.parent/'actions.json'):values.setdefault((r['config']['app'],a['name']),[]).append(a['inputToUiaObservedMs'])
 selected['actions']=[{'app':app,'action':action,'inputToUiaObservedMs':dist(v)} for (app,action),v in sorted(values.items())]
 if any(r['inputToUiaObservedMs']['n']!=20 for r in selected['actions']):raise RuntimeError('Expected twenty usable trials per host/action')
 selected['selection']={'sourceCohort':str(ORIGINAL),'retryCohort':str(FOLDER),'excludedOriginal':'actions-19-winui','reason':'User reported accidental click in another window; original failure preserved','rawAttemptsIncludingRetry':145,'usableMeasuredLifetimes':120,'unresolvedMeasuredFailures':0,'caution':'Retry is outside original randomized order; no causal proof of original timeout mechanism'}
 write(FOLDER/'selected-summary.json',selected)
 for name,item in freeze['files'].items():
  if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=item['sha256']:raise RuntimeError('Final frozen input changed: '+name)
 print('Authorized WinUI retry passed; twenty usable trials per host. Original rejection preserved.',flush=True)
if __name__=='__main__':main()
