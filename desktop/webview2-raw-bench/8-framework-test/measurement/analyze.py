"""Analyze retained raw measurements without treating correlated idle samples as replications."""
import argparse
import csv
import hashlib
import json
import math
from pathlib import Path
import random
import statistics as stats

def percentile(values, q):
    values = sorted(values)
    return values[max(0, math.ceil(q * len(values))-1)] if values else None

def distribution(values):
    return {'n':len(values), 'median':stats.median(values) if values else None,
            'mean':stats.mean(values) if values else None,
            'p95':percentile(values,.95), 'min':min(values) if values else None,
            'max':max(values) if values else None, 'stdev':stats.stdev(values) if len(values)>1 else None}

def paired_interval(differences):
    if len(differences)<2:
        return None
    rng=random.Random(17092026)
    draws=[stats.median(rng.choices(differences,k=len(differences))) for _ in range(2000)]
    return [percentile(draws,.025),percentile(draws,.975)]

def read(path): return json.loads(Path(path).read_text(encoding='utf-8-sig'))

def visual_summary(frames):
    valid=[f for f in frames if 'startMs' in f]
    intervals=[]
    for frame in valid:
        kind=frame['classification']
        if kind not in ('near-black','near-white'):
            continue
        if intervals and intervals[-1]['classification']==kind and intervals[-1]['lastIndex']==frame['index']-1:
            intervals[-1].update(lastIndex=frame['index'],lastObservedMs=frame['capturedMs'])
        else:
            intervals.append({'classification':kind,'firstIndex':frame['index'],'lastIndex':frame['index'],
                              'firstObservedMs':frame['capturedMs'],'lastObservedMs':frame['capturedMs']})
    for interval in intervals:
        interval['observedSpanMs']=interval['lastObservedMs']-interval['firstObservedMs']
    first_content=next((f['capturedMs'] for f in valid if f['classification']=='accent-content'),None)
    return {'captureIntervalMs':distribution([b['startMs']-a['startMs'] for a,b in zip(valid,valid[1:])]),
            'firstAccentObservedMs':first_content,'nearUniformIntervals':intervals,
            'nearUniformAfterAccentCount':sum(f['classification'] in ('near-black','near-white') and first_content is not None and f['capturedMs']>first_content for f in valid),
            'interpretation':'Pixel heuristics, not semantic blank detection; observed spans exclude unknown inter-frame boundaries. A single frame has zero observed span, not zero actual duration.'}

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('folder'); args=parser.parse_args()
    root=Path(args.folder).resolve(); results=[read(path) for path in sorted((root/'runs').glob('*/result.json'))]
    startups={}; resources=[]; action_groups={}; failures=[]; pairs=[]; visuals=[]
    for result in results:
        config=result['config']; tag=Path(config['output']).name
        if result.get('status')!='passed': failures.append({'sample':tag,'error':result.get('error')}); continue
        app=config['app']
        if tag.startswith('measured-'):
            condition='fresh' if tag.endswith('-fresh') else 'retained'
            key=(app,config['launch'],condition)
            startups.setdefault(key,[]).append((int(tag.split('-')[1]),result))
            visuals.append({'sample':tag,'app':app,**visual_summary(read(Path(config['output'])/'frames.json'))})
        if tag.startswith('pair-'):
            pairs.append({'sample':tag,'app':app,'launch':config['launch'],'hostToReadyMs':result['hostToReadyMs'],'launchToReadyMs':result['launchToReadyMs']})
        if config['scenario']=='idle' and not tag.startswith('pilot-'):
            samples=read(Path(config['output'])/'resources.json')
            for state in ['visible','unfocused','occluded','minimized','restored']:
                rows=[s for s in samples if s.get('state')==state and s.get('complete')]
                cpu=[]
                for before,after in zip(rows,rows[1:]):
                    elapsed=(after['atMs']-before['atMs'])/1000
                    old={p['pid']:p for p in before['processes']}
                    delta=sum(max(0,p['cpuSeconds']-old[p['pid']]['cpuSeconds']) for p in after['processes'] if p['pid'] in old and old[p['pid']]['startUtc']==p['startUtc'])
                    if elapsed>0: cpu.append(delta/elapsed*100)
                resources.append({'app':app,'state':state,'samples':len(rows),
                    'privateWorkingSetMiB':distribution([s['privateWorkingSetBytes']/2**20 for s in rows if s.get('privateWorkingSetBytes') is not None]),
                    'privateCommitMiB':distribution([s['privateBytes']/2**20 for s in rows]),
                    'summedWorkingSetMiB':distribution([s['totalWorkingSetBytes']/2**20 for s in rows]),
                    'cpuPercentOneCore':distribution(cpu),
                    'note':'One process lifetime per app; per-second samples are correlated, not independent launch replications.'})
        if config['scenario']=='actions' and not tag.startswith('pilot-'):
            for action in read(Path(config['output'])/'actions.json'):
                action_groups.setdefault((app,action['name']),[]).append(action['inputToUiaObservedMs'])
    rows=[]
    for (app,launch,condition),values in sorted(startups.items()):
        baseline={i:r['hostToReadyMs'] for i,r in startups.get(('vanilla',launch,condition),[])}
        differences=[r['hostToReadyMs']-baseline[i] for i,r in values if i in baseline]
        rows.append({'app':app,'launch':launch,'profileCondition':condition,
            'hostToReadyMs':distribution([r['hostToReadyMs'] for _,r in values]),
            'launchToReadyMs':distribution([r['launchToReadyMs'] for _,r in values]),
            'hostToWindowObservedMs':distribution([r['hostToWindowMs'] for _,r in values]),
            'hostToContentUiaMs':distribution([r['uia']['contentAt']-r['hostStartMsFromUtcAnchor'] for _,r in values if r['uia'].get('contentAt') is not None]),
            'launchToStableProxyMs':distribution([r['stableCompleteObservedMs']-r['launchRequestedMs'] for _,r in values]),
            'launchToHostMs':distribution([r['hostStartMsFromUtcAnchor']-r['launchRequestedMs'] for _,r in values]),
            'collectorCpuMsThroughCollection':distribution([r['collectorCpuMsThroughCollection'] for _,r in values]),
            'pairedMedianDeltaVsVanillaMs':stats.median(differences) if differences else None,
            'pairedBootstrapMedianDelta95IntervalMs':paired_interval(differences)})
    report={'startup':rows,'idle':resources,'actions':[{'app':a,'action':name,'inputToUiaObservedMs':distribution(v)} for (a,name),v in sorted(action_groups.items())],
            'firstRepeatPairs':pairs,'visuals':visuals,'failedAttempts':failures,'runtime':read(root/'runtime.json') if (root/'runtime.json').exists() else None,
            'analysisSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            'limits':['UIA readiness and input response are semantic observations, not physical display latency.',
                      'Foreground client-area GDI frames have measured variable intervals; sub-frame flashes may be missed.',
                      'Process V2 private resident set and private commit differ; summed working set double-counts shared pages.',
                      'Fresh path is not OS-cold; controlled PowerShell is not an Explorer gesture.',
                      'Post-restart, GPU attribution and physical AT/IME validation are not included.']}
    (root/'analysis.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    with (root/'startup.csv').open('w',newline='',encoding='utf8') as file:
        writer=csv.writer(file); writer.writerow(['app','launch','profile','n','host_ready_median_ms','host_ready_p95_ms','launch_ready_median_ms','paired_delta_vs_vanilla_ms'])
        for row in rows: writer.writerow([row['app'],row['launch'],row['profileCondition'],row['hostToReadyMs']['n'],row['hostToReadyMs']['median'],row['hostToReadyMs']['p95'],row['launchToReadyMs']['median'],row['pairedMedianDeltaVsVanillaMs']])
    lines=['# NeutronStar external measurements','',f'Runtime: {report["runtime"]}. Failed retained attempts: {len(failures)}.','',
           'Observed lab results; no physical presentation or universal framework score.','',
           '| App | Launch | Profile | n | Host → UIA Ready median / p95 ms | Launch → Ready median ms |',
           '| --- | --- | --- | ---: | ---: | ---: |']
    for row in rows:
        d=row['hostToReadyMs']; lines.append(f'| {row["app"]} | {row["launch"]} | {row["profileCondition"]} | {d["n"]} | {d["median"]:.1f} / {d["p95"]:.1f} | {row["launchToReadyMs"]["median"]:.1f} |')
    lines+=['','## One-lifetime idle samples','','| App | State | Samples | Private resident median MiB | Private commit median MiB | CPU mean / p95 % of one core |','| --- | --- | ---: | ---: | ---: | ---: |']
    for row in resources:
        def fmt(value): return f'{value:.2f}' if value is not None else 'unsupported'
        cpu=row['cpuPercentOneCore']
        lines.append(f'| {row["app"]} | {row["state"]} | {row["samples"]} | {fmt(row["privateWorkingSetMiB"]["median"])} | {fmt(row["privateCommitMiB"]["median"])} | {fmt(cpu["mean"])} / {fmt(cpu["p95"])} |')
    lines+=['','## Limits','']+['- '+limit for limit in report['limits']]
    (root/'RESULTS.md').write_text('\n'.join(lines)+'\n',encoding='utf8')
    print(f'Analyzed {len(results)} retained attempts, {len(rows)} startup conditions, {len(resources)} idle conditions.')

if __name__=='__main__': main()
