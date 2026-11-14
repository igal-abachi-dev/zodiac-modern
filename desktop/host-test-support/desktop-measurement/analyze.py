"""Summarize desktop-measurement runs. Independent process lifetimes stay independent units; no composite score."""
from pathlib import Path
import json, math, random, statistics as s, sys

def read(p): return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def dist(v):
    v = sorted(x for x in v if x is not None)
    if not v: return {'n': 0}
    return {'n': len(v), 'median': s.median(v), 'p95': v[math.ceil(.95 * len(v)) - 1], 'min': v[0], 'max': v[-1]}
def interval(v):
    if len(v) < 2: return None
    rng = random.Random(14112026); x = sorted(s.median(rng.choices(v, k=len(v))) for _ in range(2000))
    return [x[49], x[1949]]

def lifetimes(folder, prefix):
    rows = {}
    for p in sorted((folder / 'runs').glob(prefix + '-measured-*/result.json')):
        r = read(p)
        if r.get('status') != 'passed': continue
        _, _, n, variant = p.parent.name.split('-', 3)
        rows.setdefault(variant, {})[int(n)] = (p.parent, r)
    return rows

def idle(folder):
    """Per variant and idle state: private working set, private bytes, CPU (percent of one core) and GPU, medians over independent lifetimes."""
    out = []
    for variant, runs in sorted(lifetimes(folder, 'idle').items()):
        per = {}
        for n, (path, _) in runs.items():
            f = path / 'resources.json'
            if not f.exists(): continue
            for state in {x['state'] for x in read(f)}:
                xs = [x for x in read(f) if x['state'] == state]
                if len(xs) < 2: continue
                span = (xs[-1]['atMs'] - xs[0]['atMs']) / 1000
                cpu = (xs[-1]['cpuSeconds'] - xs[0]['cpuSeconds']) / span * 100 if span > 0 else None
                pws = [x['privateWorkingSetBytes'] for x in xs if x.get('privateWorkingSetBytes') is not None]
                gpu = [x['gpu']['engineUtilizationPercentSum'] for x in xs if x.get('gpu')]
                gmem = [x['gpu']['dedicatedBytes'] for x in xs if x.get('gpu')]
                per.setdefault(state, []).append({'cpuPercent': cpu, 'privateWorkingSetMiB': s.median(pws) / 1048576 if pws else None,
                                                  'privateMiB': s.median([x['privateBytes'] for x in xs]) / 1048576, 'processes': max(len(x['processes']) for x in xs),
                                                  'gpuEnginePercent': s.median(gpu) if gpu else None, 'gpuDedicatedMiB': s.median(gmem) / 1048576 if gmem else None})
        entry = {'variant': variant, 'lifetimes': len(runs), 'states': {}}
        for state, items in per.items():
            entry['states'][state] = {k: dist([i[k] for i in items]) for k in ('cpuPercent', 'privateWorkingSetMiB', 'privateMiB', 'processes', 'gpuEnginePercent', 'gpuDedicatedMiB')}
        out.append(entry)
    return out

def interact(folder):
    """Per variant and step: first visible change and settled time after input, over independent lifetimes."""
    out = []
    for variant, runs in sorted(lifetimes(folder, 'interact').items()):
        steps = {}
        for n, (_, r) in runs.items():
            for st in r.get('steps', []):
                d = steps.setdefault(st['name'], {'firstChangeMs': [], 'settledMs': [], 'completeMs': [], 'badVsReference': []})
                for k in d: d[k].append(st.get(k))
        out.append({'variant': variant, 'lifetimes': len(runs), 'steps': {name: {k: dist(v) for k, v in d.items() if any(x is not None for x in v)} for name, d in steps.items()}})
    return out

def analyze(folder):
    folder = Path(folder); rows = {}; failures = []; total = 0
    for p in sorted((folder / 'runs').glob('*/result.json')):
        r = read(p); total += 1; tag = p.parent.name
        if r.get('status') != 'passed': failures.append({'sample': tag, 'error': r.get('error') or r.get('cleanupFailure')}); continue
        if not tag.startswith('measured-'): continue
        _, n, rest = tag.split('-', 2); variant, lane = rest.rsplit('-', 1)
        rows.setdefault((variant, lane), {})[int(n)] = r
    metrics = ['windowVisibleMs', 'firstFrameMs', 'firstContentMs', 'visualReadyMs', 'uiaReadyMs']
    base = rows.get(('tauri', 'retained')) or rows.get(('tauri', 'default')) or {}
    out = []
    for (variant, lane), runs in sorted(rows.items()):
        entry = {'variant': variant, 'lane': lane, 'n': len(runs)}
        for m in metrics: entry[m] = dist([r.get(m) for r in runs.values()])
        delta = [r['visualReadyMs'] - base[i]['visualReadyMs'] for i, r in runs.items() if i in base and r.get('visualReadyMs') is not None]
        entry['visualReadyPairedDeltaVsTauriMs'] = {'median': s.median(delta) if delta else None, 'bootstrap95': interval(delta)}
        out.append(entry)
    report = {'totalAttempts': total, 'failed': failures, 'startup': out, 'idle': idle(folder), 'interact': interact(folder)}
    (folder / 'summary.json').write_text(json.dumps(report, indent=2), encoding='utf8')
    return report
if __name__ == '__main__': analyze(sys.argv[1])
