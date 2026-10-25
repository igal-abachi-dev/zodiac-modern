"""Independent raw-attempt validation; does not rewrite collector results."""
from pathlib import Path
import argparse,json
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def review(folder,scenarios=None,reviewed=None):
 folder=Path(folder);errors=[];runtimes=set();counts={};frames=[];retained=[]
 for path in sorted((folder/'runs').glob('*/result.json')):
  r=read(path);c=r['config'];tag=path.parent.name
  if scenarios and c['scenario'] not in scenarios:continue
  counts[c['scenario']]=counts.get(c['scenario'],0)+1
  if r.get('status')!='passed':
   if reviewed and tag in reviewed:retained.append({'sample':tag,'error':r.get('error'),'review':reviewed[tag]})
   else:errors.append(tag+': collector rejection')
   continue
  if r.get('hostExitCode')!=0 or not r.get('helpersExited'):errors.append(tag+': lifecycle evidence missing')
  if c['scenario']=='earlyclose':continue
  runtimes.add(r.get('runtime'))
  if r.get('clientPixels')!={'width':960*r['dpi']//96,'height':640*r['dpi']//96}:errors.append(tag+': client geometry mismatch')
  if r['uia'].get('error') or r['uia'].get('readyAt') is None:errors.append(tag+': UIA evidence missing')
  captures=[f for f in read(path.parent/'frames.json') if 'file' in f]
  if len(captures)<3 or captures[-1]['classification']!='accent-content':errors.append(tag+': content evidence missing')
  elif tag.startswith('pilot-') and '-direct-pair2' in tag:frames.append(str(path.parent/captures[-1]['file']))
  if c['scenario']=='idle':
   rows=read(path.parent/'resources.json')
   for state in c['idleOrder']:
    samples=[x for x in rows if x['state']==state]
    if len(samples)!=c['idleSeconds']:errors.append(tag+': sample count '+state)
    for row in samples:
     if not row['complete']:errors.append(tag+': incomplete counters '+state)
     if not any(p['pid']==r['hostPid'] and p['startUtc']==r['hostStartUtc'] for p in row['processes']):errors.append(tag+': missing live root identity '+state)
  if c['scenario']=='actions' and len(read(path.parent/'actions.json'))!=6*c['actionRepeats']:errors.append(tag+': action count')
 if len(runtimes)!=1 or None in runtimes:errors.append('Missing/mixed runtime version')
 report={'valid':not errors,'errors':errors,'runtime':list(runtimes),'counts':counts,'pilotFramesForReview':frames,'scenarioSelection':scenarios,'reviewedRejections':retained,'scope':'Validates completed observations; reviewed failures remain failures and reduce usable sample counts.'}
 name='independent-review-selected.json' if scenarios else 'independent-review.json'
 (folder/name).write_text(json.dumps(report,indent=2),encoding='utf8');return report
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('folder');parser.add_argument('--scenarios',nargs='+');parser.add_argument('--reviewed');args=parser.parse_args();rejections=read(Path(args.reviewed))['rejections'] if args.reviewed else None;r=review(args.folder,args.scenarios,rejections);print(json.dumps(r,indent=2));raise SystemExit(0 if r['valid'] else 1)
