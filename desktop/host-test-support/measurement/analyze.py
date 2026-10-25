"""Summarize six-host raw observations; independent lifetimes stay independent."""
from pathlib import Path
import json, math, random, statistics as s, sys
def read(p): return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def dist(v):
 v=sorted(v)
 return {'n':len(v),'median':s.median(v),'p95':v[math.ceil(.95*len(v))-1],'min':v[0],'max':v[-1]} if v else {'n':0}
def interval(v):
 if len(v)<2:return None
 rng=random.Random(23102026); x=sorted(s.median(rng.choices(v,k=len(v))) for _ in range(2000))
 return [x[49],x[1949]]
def analyze(folder):
 folder=Path(folder); results=[read(p) for p in sorted((folder/'runs').glob('*/result.json'))]
 startup={}; actions={}; idle={}; errors=[]; frames=[]
 for r in results:
  c=r['config']; tag=Path(c['output']).name; app=c['app']
  if r.get('status')!='passed':errors.append({'sample':tag,'error':r.get('error') or r.get('cleanupFailure')});continue
  if tag.startswith('measured-'):
   key=(app,c['launch'],'fresh' if tag.endswith('-fresh') else 'retained')
   startup.setdefault(key,{})[int(tag.split('-')[1])]=r
   fs=read(Path(c['output'])/'frames.json'); valid=[f for f in fs if 'capturedMs' in f]
   frames.append({'sample':tag,'intervalMs':dist([b['capturedMs']-a['capturedMs'] for a,b in zip(valid,valid[1:])]),'blackFrames':sum(f['classification']=='near-black' for f in valid),'whiteFrames':sum(f['classification']=='near-white' for f in valid),'firstAccentMs':next((f['capturedMs'] for f in valid if f['classification']=='accent-content'),None)})
  if tag.startswith('actions-'):
   for a in read(Path(c['output'])/'actions.json'):actions.setdefault((app,a['name']),[]).append(a['inputToUiaObservedMs'])
  if tag.startswith('resources-'):
   rs=read(Path(c['output'])/'resources.json')
   for state in c['idleOrder']:
    rows=[x for x in rs if x['state']==state]
    if len(rows)!=c['idleSeconds'] or any(not x['complete'] for x in rows): errors.append({'sample':tag,'error':'Incomplete idle samples: '+state});continue
    cpu=[]
    for a,b in zip(rows,rows[1:]):
     previous={(p['pid'],p['startUtc']):p for p in a['processes']}
     delta=sum(max(0,p['cpuSeconds']-previous[(p['pid'],p['startUtc'])]['cpuSeconds']) for p in b['processes'] if (p['pid'],p['startUtc']) in previous)
     cpu.append(100*delta/((b['atMs']-a['atMs'])/1000))
    idle.setdefault((app,state),[]).append({'lifetime':int(tag.split('-')[1]),'privateResidentMiB':s.median(x['privateWorkingSetBytes']/2**20 for x in rows),'privateCommitMiB':s.median(x['privateBytes']/2**20 for x in rows),'cpuPercentOneCore':s.median(cpu),'processCount':s.median(len(x['processes']) for x in rows)})
 rows=[]
 for (app,launch,condition),values in sorted(startup.items()):
  base=startup.get(('cpp',launch,condition),{}); delta=[r['launchToReadyMs']-base[i]['launchToReadyMs'] for i,r in values.items() if i in base]
  rows.append({'app':app,'launch':launch,'profileCondition':condition,'launchToReadyMs':dist([r['launchToReadyMs'] for r in values.values()]),'hostToReadyMs':dist([r['hostToReadyMs'] for r in values.values()]),'hostToWindowMs':dist([r['hostToWindowMs'] for r in values.values()]),'launchToStableMs':dist([r['stableCompleteObservedMs']-r['launchRequestedMs'] for r in values.values()]),'pairedMedianDeltaVsCppMs':s.median(delta) if delta else None,'pairedBootstrap95IntervalMs':interval(delta)})
 report={'totalAttempts':len(results),'passed':sum(r.get('status')=='passed' for r in results),'failed':errors,'runtime':read(folder/'runtime.json') if (folder/'runtime.json').exists() else None,'startup':rows,
  'idle':[{'app':a,'state':state,'lifetimes':v,**{k:dist([x[k] for x in v]) for k in ['privateResidentMiB','privateCommitMiB','cpuPercentOneCore','processCount']}} for (a,state),v in sorted(idle.items())],
  'actions':[{'app':a,'action':n,'inputToUiaObservedMs':dist(v)} for (a,n),v in sorted(actions.items())],'visuals':frames}
 (folder/'summary.json').write_text(json.dumps(report,indent=2),encoding='utf8')
 return report
if __name__=='__main__': analyze(Path(sys.argv[1]))
