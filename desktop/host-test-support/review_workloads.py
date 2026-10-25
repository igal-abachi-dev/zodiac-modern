"""Validate supplemental completeness, finite endpoints and frozen input identity."""
from pathlib import Path
import collections,hashlib,json,math,sys
ROOT=Path(__file__).resolve().parent.parent
EXPECTED={'replace-10000','replace-1000','reverse-1000','splice-10','update-10-percent','filter-to-one','filter-clear','filter-during-30hz-requested','remount'}
HOSTS={'cpp','rust','tauri','wails','pywebview','winui'}
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def main():
 folder=Path(sys.argv[1]);errors=[];counts=collections.Counter();gaps=collections.Counter();runtime=read(folder/'runtime.json')
 for path in (folder/'runs').glob('*/result.json'):
  r=read(path);app=r['config']['app'];tag=path.parent.name
  group='measured' if tag.startswith('measured-') else 'warmup' if tag.startswith('warmup-') else 'pilot'
  counts[app,group]+=1;gaps[app]+=len(r.get('providerGaps',[]))
  if r['status']!='passed' or not r['hostExited'] or not r['helpersExited'] or r['exitCode']!=0:errors.append(tag+': lifecycle/status')
  if r.get('runtime')!=runtime:errors.append(tag+': runtime')
  actions=r.get('actions',[])
  if len(actions)!=9 or {a['name'] for a in actions}!=EXPECTED:errors.append(tag+': action inventory')
  if any(not math.isfinite(a['inputToUiaObservedMs']) or a['inputToUiaObservedMs']<0 for a in actions):errors.append(tag+': invalid duration')
  if not isinstance(r.get('tickAfterStop'),int) or r['tickAfterStop']<2:errors.append(tag+': timer not observed active')
 for app in HOSTS:
  for group,n in [('pilot',1),('warmup',3),('measured',20)]:
   if counts[app,group]!=n:errors.append(f'{app}/{group}: expected {n}, got {counts[app,group]}')
 if set(a for a,g in counts)!=HOSTS:errors.append('Unexpected host inventory')
 for relative,item in read(folder/'freeze.json')['files'].items():
  p=ROOT/relative
  if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=item['sha256']:errors.append('Frozen input mismatch: '+relative)
 report={'valid':not errors,'errors':errors,'counts':{f'{a}/{g}':n for (a,g),n in sorted(counts.items())},'providerQueryGaps':dict(gaps),'runtime':runtime,'scope':'Independent post-collection completeness/integrity review; semantic assertions reside in frozen collector; not physical paint/accessibility acceptance'}
 (folder/'independent-review.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps(report,indent=2));return 0 if report['valid'] else 1
if __name__=='__main__':raise SystemExit(main())
