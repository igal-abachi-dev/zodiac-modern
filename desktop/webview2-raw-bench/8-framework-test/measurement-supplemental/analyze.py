"""Summarize semantic workload observations, excluding warmups and pilots."""
import argparse
import importlib.util
import json
from pathlib import Path

spec=importlib.util.spec_from_file_location('primary_analysis',Path(__file__).parents[1]/'measurement/analyze.py')
analysis=importlib.util.module_from_spec(spec);spec.loader.exec_module(analysis)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('folder');args=parser.parse_args()
    root=Path(args.folder).resolve();groups={};failures=[]
    for path in sorted(root.glob('*/result.json')):
        record=json.loads(path.read_text())
        if record['status']!='passed': failures.append({'sample':path.parent.name,'error':record.get('error')});continue
        if not path.parent.name.startswith('measured-'):continue
        app=path.parent.name.split('-',2)[2];round_id=int(path.parent.name.split('-')[1])
        for action in record['actions']:
            if 'inputAndUiaMs' in action:groups.setdefault((app,action['name']),[]).append((round_id,action['inputAndUiaMs']))
    rows=[]
    for (app,name),values in sorted(groups.items()):
        base=dict(groups.get(('vanilla',name),[]));diff=[v-base[i] for i,v in values if i in base]
        rows.append({'app':app,'action':name,'semanticResponseMs':analysis.distribution([v for _,v in values]),
                     'pairedDeltaVsVanillaMs':analysis.distribution(diff),
                     'pairedBootstrapMedianDelta95IntervalMs':analysis.paired_interval(diff)})
    report={'rows':rows,'failures':failures,'limit':'Real-input dispatch plus UIA semantic response; includes accessibility overhead. Not physical paint, pure rendering time, INP or frame rate.'}
    (root/'analysis.json').write_text(json.dumps(report,indent=2))
    lines=['# Supplemental semantic workload observations','',report['limit'],'',
           '| App | Operation | n | Median ms | p95 ms |','| --- | --- | ---: | ---: | ---: |']
    for row in rows:
        d=row['semanticResponseMs'];lines.append(f'| {row["app"]} | {row["action"]} | {d["n"]} | {d["median"]:.1f} | {d["p95"]:.1f} |')
    (root/'RESULTS.md').write_text('\n'.join(lines)+'\n')
    print(f'{len(rows)} operation groups; {len(failures)} failed attempts retained.')

if __name__=='__main__':main()
