"""Export validated aggregate tables and raw metadata; never edit observations."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import shutil
import zipfile

APPS=['vanilla','svelte','solid','preact','vue','react','lit','alpine','htmx']
def label(app):return 'htmx (patched offline)' if app=='htmx' else app
def read(path):return json.loads(path.read_text(encoding='utf-8-sig'))
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    parser=argparse.ArgumentParser();parser.add_argument('primary');parser.add_argument('supplemental');parser.add_argument('output');args=parser.parse_args()
    p=Path(args.primary).resolve();s=Path(args.supplemental).resolve();out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=True)
    a=read(p/'analysis.json');b=read(s/'analysis.json')
    assert not a['failedAttempts'] and not b['failures']
    assert len(a['startup'])==36 and all(r['hostToReadyMs']['n']==20 for r in a['startup'])
    assert len(a['idle'])==45 and all(r['samples']==60 for r in a['idle'])
    assert len(b['rows'])==81 and all(r['semanticResponseMs']['n']==20 for r in b['rows'])
    def startup(app,condition,launch='direct'):return next(r for r in a['startup'] if r['app']==app and r['launch']==launch and r['profileCondition']==condition)
    def idle(app,state):return next(r for r in a['idle'] if r['app']==app and r['state']==state)
    def action(app,name):return next(r for r in a['actions'] if r['app']==app and r['action']==name)['inputToUiaObservedMs']
    def work(app,name):return next(r for r in b['rows'] if r['app']==app and r['action']==name)['semanticResponseMs']
    lines=['# NeutronStar measured results — 2026-10-17 cohort','',
        '[Interpretation against the source-level findings](INTERPRETATION.md).','',
        'Nine stock frontends in the same clang-cl/Ninja Release host, WebView2 155.0.4283.60. Ryzen 9 5900X, RTX 2070 SUPER, Windows 11 build 26200; 960 × 640 DIP at 200% DPI (1920 × 1280 client pixels), 60 Hz. Normal memory policy, native decorations, bridge off, InPrivate. Patched offline htmx is labeled throughout.','',
        'Primary collection: 900 passing attempts: 18 pilot, 36 first/repeat pairs, 108 warmups, 720 measured startups, nine five-state idle lifetimes and nine 20-cycle action lifetimes. Supplemental collection: three pilot, 27 warmup and 180 measured independent process attempts. No rejected attempt is removed from these accepted cohorts; earlier collector failures remain separate.','',
        '## Startup and visible-idle memory','',
        'Startup is host process creation → UIA-observed Ready with enabled controls. Values are median / nearest-rank p95 milliseconds, n=20 per startup condition. Fresh path is not OS-cold. Memory is median MiB across 60 samples in one lifetime per app; those samples are correlated and do not establish a statistically replicated memory ranking.','',
        '| App | Fresh path ms | Retained path ms | Private resident MiB | Private commit MiB |',
        '| --- | ---: | ---: | ---: | ---: |']
    for app in APPS:
        f=startup(app,'fresh')['hostToReadyMs'];t=startup(app,'retained')['hostToReadyMs'];m=idle(app,'visible')
        lines.append(f'| {label(app)} | {f["median"]:.1f} / {f["p95"]:.1f} | {t["median"]:.1f} / {t["p95"]:.1f} | {m["privateWorkingSetMiB"]["median"]:.2f} | {m["privateCommitMiB"]["median"]:.2f} |')
    lines+=['','Private resident excludes shared pages and GPU allocations; commit is a different measure. Summed working sets are not unique RAM. Absolute startup includes WebView2/profile initialization, fonts and observation overhead; it is not JS execution time.','',
        '## Semantic interaction and list response','',
        'Median / p95 ms, n=20. About uses real mouse input → UIA observation. Supplemental list operations include dispatch/provider cost and use the same summary/first-key predicates across renderers. They are not physical input-to-paint, INP or pure rendering time. The 1,000-row operation follows 10,000-row creation. htmx uses its declared explicit client list controller.','',
        '| App | About open ms | Replace 10,000 ms | Replace 1,000 ms | Filter during requested 30 Hz ms |',
        '| --- | ---: | ---: | ---: | ---: |']
    def fmt(d):return f'{d["median"]:.1f} / {d["p95"]:.1f}'
    for app in APPS:lines.append(f'| {label(app)} | {fmt(action(app,"about-open"))} | {fmt(work(app,"replace-10000"))} | {fmt(work(app,"replace-1000"))} | {fmt(work(app,"filter-during-30hz-requested"))} |')
    lines+=['','## Background observations','',
        '| App | Visible resident MiB | Minimized resident MiB | Restored resident MiB | Visible CPU mean / p95 % of one core |',
        '| --- | ---: | ---: | ---: | ---: |']
    for app in APPS:
        visible=idle(app,'visible');cpu=visible['cpuPercentOneCore']
        lines.append(f'| {label(app)} | {visible["privateWorkingSetMiB"]["median"]:.2f} | {idle(app,"minimized")["privateWorkingSetMiB"]["median"]:.2f} | {idle(app,"restored")["privateWorkingSetMiB"]["median"]:.2f} | {cpu["mean"]:.3f} / {cpu["p95"]:.3f} |')
    lines+=['','One lifetime and a fixed state order per app. Low CPU differences are descriptive, not energy-efficiency or causal framework rankings. Window states were applied by the collector; continuous native foreground/occlusion telemetry was not recorded. Restore-state sampling is not restore-to-physical-paint latency.','',
        '## Lifecycle and accessibility-provider observations','']
    provider=[];primary=[]
    for path in sorted((p/'runs').glob('*/result.json')):
        r=read(path);primary.append(r)
        gaps=[x for x in r.get('uia',{}).get('trace',[]) if 'providerFailureHresult' in x or 'providerUnavailable' in x]
        provider.append({'sample':path.parent.name,'app':r['config']['app'],'providerGaps':len(gaps),'workerError':r.get('uia',{}).get('error'),'maxPollMs':r.get('uia',{}).get('maxPollMs')})
    supplemental=[read(path) for path in s.glob('*/result.json')]
    assert len(primary)==900 and len(supplemental)==210
    assert all(r['status']=='passed' and r['hostExited'] and r['helpersExited'] for r in primary+supplemental)
    gap_counts=Counter(r['app'] for r in provider if r['providerGaps'])
    errors=[r for r in provider if r['workerError']]
    lines += [f'All {len(primary)+len(supplemental)} accepted attempts passed their run-owned host/helper shutdown checks. {sum(x["providerGaps"] for x in provider)} bounded UIA provider-query gaps occurred in {sum(bool(x["providerGaps"]) for x in provider)} primary attempts; {len(errors)} worker errors remained. Gaps are initialization/provider observations, not evidence of framework leaks.','',
        '| App | Primary attempts with recorded provider gaps |','| --- | ---: |']
    lines += [f'| {label(app)} | {gap_counts[app]} |' for app in APPS]
    lines+=['','The first collector stopped on an unhandled provider detach; the next stopped after stale parent PIDs admitted two unrelated older processes. Neither was an app failure, and no unrelated process was terminated. Creation-time ancestry regression tests and bounded provider recovery precede the accepted cohorts. The older early-initialization host shutdown concern remains open: these normal Ready-to-close runs do not close that gate.','',
        'The synthetic UIA checks do not replace Narrator/NVDA, keyboard/IME, high contrast, multi-monitor or 100/150/200% DPI product acceptance. Different text-node granularity affects provider work; React’s split supplemental summary was handled by equal ID-scoped aggregation, not frontend changes.','',
        '## Evidence and limits','',
        '- [Full primary tables](PRIMARY.md), [full supplemental tables](SUPPLEMENTAL.md), [startup CSV](startup.csv), [primary JSON](primary.json), [supplemental JSON](supplemental.json), [provider observations](provider.json).',
        '- [Raw metadata archive](raw-metadata.zip) includes original per-attempt records, process samples, frame indexes, action traces, launch receipts and native event logs; it excludes profiles and PNG images. Full client-frame PNGs and exact collector artifacts remain in the recorded local cohort directories.',
        '- [Evidence index](evidence.json) records source cohort paths and artifact hashes. The original interim summary is retained: its fresh/retained grouping typo was corrected only in derived reports after collection. Final analysis reads correctly labeled raw records.',
        '- GDI captures client pixels at measured variable intervals; physical panel scan-out and Explorer gesture latency are unavailable. UIA provider activation, capture and collector CPU perturb startup. Integrity hashing warms file caches.',
        '- GPU/frame pacing, I/O/energy, post-reboot OS-cold runs, 10/30/60 Hz presentation budgets, long heap/remount trends and physical accessibility remain open. No Go/crypto throughput was tested.',
        '- These compare stock frontend integrations in one WebView2 host. A later Electron/Avalonia comparison needs equivalent apps plus launch/UIA adapters; current document-scoped UIA locators are WebView-specific. Internal browser metrics cannot be directly equated to Skia metrics.','']
    (out/'RESULTS.md').write_text('\n'.join(lines),encoding='utf8')
    shutil.copy2(p/'RESULTS.md',out/'PRIMARY.md');shutil.copy2(s/'RESULTS.md',out/'SUPPLEMENTAL.md')
    shutil.copy2(p/'analysis.json',out/'primary.json');shutil.copy2(s/'analysis.json',out/'supplemental.json');shutil.copy2(p/'startup.csv',out/'startup.csv')
    (out/'provider.json').write_text(json.dumps(provider,indent=2),encoding='utf8')
    with zipfile.ZipFile(out/'raw-metadata.zip','w',zipfile.ZIP_DEFLATED) as archive:
        for lane,folder in [('primary',p),('supplemental',s)]:
            for path in folder.iterdir():
                if path.is_file() and path.suffix in ('.json','.csv','.md'):archive.write(path,f'{lane}/{path.name}')
            directories=(folder/'runs').iterdir() if lane=='primary' else folder.iterdir()
            for directory in directories:
                if not directory.is_dir() or directory.name in ('profiles','collector-artifact'):continue
                for path in directory.iterdir():
                    if path.is_file() and path.suffix in ('.json','.jsonl','.log'):archive.write(path,f'{lane}/runs/{directory.name}/{path.name}')
    evidence={'primaryCohort':str(p),'supplementalCohort':str(s),'primaryFreeze':read(p/'freeze.json'),'supplementalFreeze':read(s/'freeze.json'),
        'files':{x.name:digest(x) for x in out.iterdir() if x.is_file() and x.name!='evidence.json'},'publishSourceSha256':digest(Path(__file__))}
    (out/'evidence.json').write_text(json.dumps(evidence,indent=2),encoding='utf8')
    print('Published validated tables and raw metadata to',out)

if __name__=='__main__':main()
