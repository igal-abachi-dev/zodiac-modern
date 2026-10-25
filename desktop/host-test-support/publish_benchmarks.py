"""Publish measured tables and retain raw metadata; never infer missing metrics."""
from pathlib import Path
import hashlib,json,shutil,statistics as s,sys,zipfile
ROOT=Path(__file__).resolve().parent.parent
PRIMARY=ROOT/'host-test-support/.cache/six-host-20261024-h'
ACTIONS=ROOT/'host-test-support/.cache/six-host-actions-20261024-i'
RETRY=ROOT/'host-test-support/.cache/six-host-actions-20261024-i-interference-retry'
SUPPLEMENTAL=ROOT/'host-test-support/.cache/six-host-workload-20261024-b'
DEST=ROOT/'host-test-support/results/2026-10-24'
LABEL={'cpp':'NeutronStar C++','rust':'Raw Rust','tauri':'Tauri v2','wails':'Wails','pywebview':'pywebview','winui':'WinUI 3 / C#'}
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def table(headers,rows):return '\n'.join(['| '+' | '.join(headers)+' |','| '+' | '.join(['---']*len(headers))+' |']+['| '+' | '.join(map(str,row))+' |' for row in rows])
def main():
 original=read(PRIMARY/'summary.json');action_summary=read(RETRY/'selected-summary.json');supplemental=read(SUPPLEMENTAL/'summary.json');review=read(PRIMARY/'independent-review-selected.json')
 if not review['valid'] or action_summary['totalAttempts']!=144 or supplemental['attempts']!=144 or supplemental['failed']:raise RuntimeError('Selected cohorts are incomplete or rejected')
 if [r['sample'] for r in action_summary['failed']]!=['actions-19-winui']:raise RuntimeError('Unexpected action rejection history')
 if not read(ACTIONS/'independent-review.json')['valid']:raise RuntimeError('Action observations failed review')
 if not read(RETRY/'independent-review.json')['valid']:raise RuntimeError('Retry observations failed review')
 if any(r['inputToUiaObservedMs']['n']!=20 for r in action_summary['actions']):raise RuntimeError('Action sample count mismatch')
 if len(original['failed'])!=1 or original['failed'][0]['sample']!='action-warmup-01-tauri':raise RuntimeError('Unexpected primary rejection history')
 primary={**original,'actions':action_summary['actions'],'totalAttempts':original['totalAttempts']+action_summary['totalAttempts']+1,'passed':original['passed']+action_summary['passed']+1,'failed':original['failed']+action_summary['failed'],'selectedEndpointFailures':[],
  'rejectedPreparationAttempts':original['failed'],'sourceCohorts':{'startupAndIdle':'six-host-20261024-h','actions':'six-host-actions-20261024-i'},
  'selectionNote':'Startup/idle from H; action lane recollected in I. User reported external mouse interference for actions-19-winui and authorized one retry. Original failure retained unchanged and excluded; successful retry supplies the twentieth usable WinUI trial outside the original randomized order.',
  'actionSelection':action_summary['selection']}
 if any(row['launchToReadyMs']['n']!=20 for row in primary['startup']):raise RuntimeError('Startup sample count mismatch')
 DEST.mkdir(parents=True,exist_ok=True)
 for source,name in [(PRIMARY/'summary.json','startup-idle-cohort-summary.json'),(ACTIONS/'summary.json','action-cohort-summary.json'),(ACTIONS/'independent-review.json','action-independent-review.json'),(SUPPLEMENTAL/'summary.json','supplemental-summary.json'),(PRIMARY/'independent-review-selected.json','independent-review.json'),(PRIMARY/'pilot-accepted.json','pilot-accepted.json'),(PRIMARY/'environment-before-pilot.json','environment.json')]:shutil.copyfile(source,DEST/name)
 (DEST/'primary-summary.json').write_text(json.dumps(primary,indent=2),encoding='utf8')
 shutil.copyfile(RETRY/'selected-summary.json',DEST/'selected-action-summary.json')
 shutil.copyfile(RETRY/'amendment.json',DEST/'interference-retry-amendment.json')
 shutil.copyfile(SUPPLEMENTAL/'independent-review.json',DEST/'supplemental-independent-review.json')
 shutil.copyfile(ROOT/'host-test-support/.cache/accepted-artifact-review.json',DEST/'accepted-artifact-review.json')
 def startup(app,lane,condition):return next(r for r in primary['startup'] if r['app']==app and r['launch']==lane and r['profileCondition']==condition)
 def memory(app,state):return next(r for r in primary['idle'] if r['app']==app and r['state']==state)
 def action(app,name):return next(r for r in primary['actions'] if r['app']==app and r['action']==name)['inputToUiaObservedMs']['median']
 lines=['# Six-host Svelte benchmark results','',f"Measured WebView2: **{primary['runtime']}**. Startup/idle cohort `six-host-20261024-h`; action cohort `six-host-actions-20261024-i` plus its explicitly authorized interference retry; supplemental cohort `six-host-workload-20261024-b`.",'',
  'Completed 480 measured startup launches, 30 independent idle lifetimes, 120 usable measured action lifetimes and 120 measured supplemental lifetimes. A WinUI action trial timed out; the user reported an accidental click in another window and explicitly authorized one retry, which passed with the unchanged frozen collector. The original failure is retained and excluded for reported external-input interference; the replacement is outside the original randomized order. A Tauri supplemental warmup also overlapped reported computer use; that preparation cohort is retained separately and the whole supplemental lane restarted before measured trials.','',
  'Startup/idle endpoints come from H. One action warmup in H hit an accessibility-provider COM query error; the entire action lane was then piloted and recollected in I with bounded read-only retries. No measured action results were pooled across collector versions. Raw failures, retry authorization and all development failures remain preserved.','',
  'This compares the six **as-configured hosting stacks** around the same Svelte UI, not security equivalence or language-only overhead. Wails has persistent-profile/native-permission differences; pywebview uses loopback/private-profile cleanup; WinUI is self-contained .NET/Windows App SDK. Client sizing differences were calibrated externally and included in launch observations. See the [candidate configurations and decision plan](../../../NeutronStar-Svelte/HOST-COMPARISON-PLAN.md).','',
  'The production fixture is `starlight-en-he-v2`: 16 frozen Svelte files, English/Hebrew/emoji and four local fonts. The supplemental lane has its own matched manifest. Actions are synthetic frontend simulations: no Go CLI, cryptographic throughput, native IPC throughput or backend workload is measured.','',
  '## Startup','', 'Milliseconds, median / nearest-rank p95; **n=20** per cell. Fresh/retained refer to profile-directory paths, not post-reboot cold starts. The controlled PowerShell wrapper is not an Explorer gesture or each product Run.ps1.','']
 rows=[]
 for app in LABEL:
  cells=[]
  for lane,condition in [('direct','fresh'),('direct','retained'),('powershell','fresh'),('powershell','retained')]:
   d=startup(app,lane,condition)['launchToReadyMs'];cells.append(f"{d['median']:.0f} / {d['p95']:.0f}")
  rows.append([LABEL[app],*cells])
 lines += [table(['Host','Direct fresh','Direct retained','PowerShell fresh','PowerShell retained'],rows),'',
  'UIA Ready requires the heading, fixture, Ready status and both enabled actions. It includes accessibility-provider/polling cost. The separate captured-frame stability endpoint is a proxy, not physical display presentation. Full host-to-window, stable proxy, paired C++ differences and bootstrap intervals are in the JSON summary.','',
  'Paired direct retained-path differences against C++ (matched randomized round; 2,000 deterministic bootstrap resamples of the paired median). These intervals describe this machine/cohort, not all Windows devices. Multiple comparisons are exploratory.','',
  table(['Host','Paired median delta ms','Bootstrap 95% interval ms'],[
   [LABEL[a],f"{startup(a,'direct','retained')['pairedMedianDeltaVsCppMs']:+.1f}",
    ' to '.join(f'{x:+.1f}' for x in startup(a,'direct','retained')['pairedBootstrap95IntervalMs'])] for a in LABEL if a!='cpp']),'',
  '## Visible-idle memory and interactions','',
  'Memory is the median of **five independent lifetime medians**, each containing 12 samples per state. Private resident and private commit differ; neither is a sum of Task Manager working sets. Actions are input-to-UIA semantic observations from **20 independent usable lifetimes per host**, including the authorized WinUI interference retry. They are not browser scripting or paint time.','']
 rows=[]
 for app in LABEL:
  m=memory(app,'visible')
  rows.append([LABEL[app],f"{m['privateResidentMiB']['median']:.1f}",f"{m['privateCommitMiB']['median']:.1f}",f"{action(app,'about-open'):.1f}",f"{action(app,'cancel'):.1f}"])
 lines += [table(['Host','Private resident MiB','Private commit MiB','About open ms','Cancel ms'],rows),'',
  'Unfocused, occluded, minimized and restored states, lifetime CPU and process-count distributions are preserved in `primary-summary.json`. State order was balanced with a five-position cyclic Latin square. Sixty per-second samples per state/host are not sixty independent lifetimes.','',
  table(['Host','Unfocused private/commit MiB','Occluded private/commit MiB','Minimized private/commit MiB','Restored private/commit MiB'],[
   [LABEL[a],*[f"{memory(a,state)['privateResidentMiB']['median']:.1f} / {memory(a,state)['privateCommitMiB']['median']:.1f}" for state in ['unfocused','occluded','minimized','restored']]] for a in LABEL]),'',
  'CPU below is percent of one logical core, median of five lifetime medians over one-second deltas. Zero means the median sampled delta was zero; it does not establish zero CPU, energy or background wakeups. Full ranges remain in JSON.','',
  table(['Host','Visible CPU %','Unfocused CPU %','Occluded CPU %','Minimized CPU %','Restored CPU %','Visible processes'],[
   [LABEL[a],*[f"{memory(a,state)['cpuPercentOneCore']['median']:.2f}" for state in ['visible','unfocused','occluded','minimized','restored']],f"{memory(a,'visible')['processCount']['median']:.0f}"] for a in LABEL]),'',
  '## Deployment payload','',
  'Current unpruned runtime payloads, excluding the separately installed/shared WebView2 Runtime. These are file sizes, not RAM. Raw C++/Rust include their external production assets; Tauri/Wails embed those assets. WinUI includes its self-contained .NET and Windows App SDK components. No installer/signature/compression comparison is implied.','']
 freeze=read(PRIMARY/'freeze.json');payload=[]
 for app in LABEL:
  exe=freeze['hosts'][app][0]
  if app in ['winui','pywebview']:
   prefix='WinUI3-webview2/out/win-x64/' if app=='winui' else 'PyWebView/dist/neutronstar-pywebview/'
   entries=[(p,v) for p,v in freeze['files'].items() if p.replace('\\','/').startswith(prefix)]
  else:
   wanted={exe}
   if app in ['cpp','rust']:wanted.update('NeutronStar-Svelte/dist/'+f['path'] for f in read(ROOT/'NeutronStar-Svelte/.cache/frontend-manifest.json')['files'])
   entries=[(p,v) for p,v in freeze['files'].items() if p.replace('\\','/') in wanted]
  total=sum(v['bytes'] for _,v in entries);symbols=sum(v['bytes'] for p,v in entries if p.endswith('.pdb'))
  payload.append([LABEL[app],len(entries),f'{total/2**20:.2f}',f'{symbols/2**20:.2f}'])
 lines += [table(['Host','Files','Payload MiB','Included PDB MiB'],payload),'',
  '## Capture and observer endpoints','',
  'Direct launch medians are separated by profile path (20 attempts per host/profile group). Loading text is included only when actually observed; missing observations are not zero. Pixel classes are heuristics, not FCP/LCP, optical text recognition or physical paint. Requested capture was 20 Hz; observed intervals below show its actual lower rate.','']
 transitions=[];summed=[];traces=[]
 for app in LABEL:
  ws=[]
  for condition in ['fresh','retained']:
   loading=[];accent=[];window=[];black=0;intervals=[]
   for path in (PRIMARY/'runs').glob('measured-*-'+app+'-direct-'+condition+'/result.json'):
    r=read(path);origin=r['launchRequestedMs'];window.append(r['windowFirstVisibleObservedMs']-origin)
    loading_at=r['uia']['loadingAt']-origin if r['uia']['loadingAt'] is not None else None
    if loading_at is not None:loading.append(loading_at)
    fs=[f for f in read(path.parent/'frames.json') if 'capturedMs' in f]
    content=next((f['capturedMs']-origin for f in fs if f['classification']=='accent-content'),None)
    if content is not None:accent.append(content)
    black+=any(f['classification']=='near-black' for f in fs);intervals.extend(b['capturedMs']-a['capturedMs'] for a,b in zip(fs,fs[1:]))
    changes=[]
    for f in fs:
     if not changes or changes[-1]['classification']!=f['classification']:changes.append({'observedMs':f['capturedMs']-origin,'classification':f['classification']})
    traces.append({'sample':path.parent.name,'profilePath':condition,'windowVisibleMs':r['windowFirstVisibleObservedMs']-origin,'loadingTextUiaMs':loading_at,'readyUiaMs':r['launchToReadyMs'],'stableProxyMs':r['stableCompleteObservedMs']-origin,'capturedClassChanges':changes,'scope':'Sampled observations on common collector clock; not physical phase duration or browser paint'})
   transitions.append([LABEL[app],condition,f'{s.median(window):.0f}',f'{s.median(loading):.0f} (n={len(loading)})' if loading else 'unobserved',f'{s.median(accent):.0f}',f'{s.median(intervals):.1f}',black])
  for path in (PRIMARY/'runs').glob('resources-*-'+app+'/resources.json'):
   records=[x for x in read(path) if x['state']=='visible'];ws.append(s.median(x['totalWorkingSetBytes']/2**20 for x in records))
  summed.append([LABEL[app],f'{s.median(ws):.1f}'])
 (DEST/'visual-transitions.json').write_text(json.dumps(traces,indent=2),encoding='utf8')
 lines += [table(['Host','Profile path','Visible HWND ms','Loading text ms','First accent ms','Frame interval ms','Attempts with black sample'],transitions),'',
  '[Per-attempt transition traces](visual-transitions.json) retain the observed loading text, sampled black/white/content changes, UIA Ready and stability proxy on the same clock. Unobserved intermediate states and exact physical durations cannot be recovered from these samples.','',
  'Visible-idle summed working set below includes shared pages repeatedly across processes and is **not unique RAM**. It is shown separately from private resident/commit to avoid conflating the metrics.','',table(['Host','Summed working set MiB'],summed),'',
  '## Supplemental large lists','',
  'Separately built/staged identical supplemental Svelte assets; **n=20 independent lifetimes** per host. All operations preserve the same keyed-row, filter, tick and remount assertions. These unvirtualized stress cases include potentially substantial UIA traversal cost. A requested 30 Hz burst is not a measured frame rate.','']
 rows=[]
 for app in LABEL:
  cells=[]
  for name in ['replace-10000','replace-1000','filter-to-one','remount']:
   d=next(r for r in supplemental['actions'] if r['app']==app and r['action']==name)['inputToUiaObservedMs'];cells.append(f"{d['median']:.1f}")
  rows.append([LABEL[app],*cells])
 lines += [table(['Host','Create 10k ms','10k -> 1k ms','Filter to one ms','Remount ms'],rows),'',
  'Complete reverse, splice, update, clear-filter and requested-burst filtering distributions and paired C++ differences are in `supplemental-summary.json`. Supplemental results do not measure production startup.','',
  '## Interpretation','',
  '- **Keep the C++ baseline.** Raw Rust and C++ are effectively tied on retained-path Ready (473 versus 482 ms; paired interval crosses zero). This study gives no performance reason to rewrite the existing host in Rust.',
  '- **Tauri is the strongest complete-framework candidate here.** Retained Ready is close to C++, private resident memory is in the same group, and its fresh-path median is lower. The study does not isolate which startup-policy, protocol or initialization difference caused that advantage. Choose it for required framework features after separate security/admission checks.',
  '- **Wails remains viable for a Go product.** Retained Ready matches the raw hosts and private resident is slightly lower, but fresh-profile launch and private commit are higher. Persistent-profile/native-policy differences prevent a pure language comparison.',
  '- **pywebview and WinUI are more expensive in these configurations.** pywebview has about 45 MiB more private resident memory than C++; its private-profile cleanup means retained paths do not retain equivalent caches. WinUI has about 29 MiB more private resident and a slower retained launch. These are this packaged Python and untrimmed self-contained .NET/Windows App SDK deployments, not universal toolkit limits.',
  '- The Svelte renderer is unchanged across these six hosts. Large-list differences include native hosting, Chromium and accessibility-provider work; do not attribute every millisecond to a native language or infer that one host changes Svelte reactivity. Do not directly pool these timings with the historical nine-frontend cohort: fixture, collector and run conditions differ.',
  '- **No host wins every interaction.** WinUI had the lowest observed 10k-to-1k replacement median (660 ms versus C++ 792 ms), despite its higher startup/memory costs. About-open and Cancel orderings also differ. The same-renderer list creation medians cluster around 1.62-1.67 seconds; these UIA-inclusive stress cases do not establish a universal rendering winner.',
  '- All selected observations passed their semantic/lifecycle checks. Original failures and the user-authorized interference retry remain visible. UIA checks are not physical accessibility acceptance. The older intermittent early-initialization lifecycle concern is not closed by these bounded close probes.',
  '',
  '## Scope and reproducibility','',
  '- One Windows 11 machine, Ryzen 9 5900X, 32 GiB RAM, RTX 2070 SUPER, 3840 x 2160 / 60 Hz, 200% DPI in the accepted pilot. Read the environment record and per-attempt DPI/geometry for exact evidence.',
  '- Installed Evergreen WebView2 was checked from actual target process modules for every normal attempt. Runtime changes stop collection.',
  '- Same backend (UIA3) for all six; .NET collector pages are already loaded before target launch. File hashing also warms OS caches. This is an instrumented lab comparison, not untouched-machine cold startup.',
  '- Other user applications were not stopped. The serial watcher and collector add observer overhead; target CPU/private memory excludes those processes. Twenty samples give limited tail precision; p95 and exploratory bootstrap intervals should not be treated as service-level guarantees.',
  '- Only discovered PID-and-creation-time-verified descendants are attributed. Discovery is sampled, so very short-lived children can be missed. Normal close and 18 bounded first-visible-window close probes are not exhaustive lifecycle proof.',
  '- Hardware presentation, GPU allocations/frame pacing, energy, physical Narrator/NVDA/IME/high-contrast/multi-monitor testing, clean-machine deployment, and end-to-end security parity are not established.',
  '- Primary first/repeat `pair-*` cases reuse paths primed by the pilot. The pilot has the initial path-use pairs; neither is a controlled OS-cold restart.',
  '', 'Use differences and uncertainty together. A tiny median advantage does not establish a universally better host. The raw C++/Rust pair is closer to native-implementation parity than the six-stack comparison. Packaging, OS integration, security-policy ownership and long-term maintenance remain product decisions.','',
  '[Primary protocol](../../measurement/PROTOCOL.md)  |  [Collector instructions](../../measurement/README.md)  |  [Raw metadata archive](raw-metadata.zip)  |  [Primary JSON](primary-summary.json)  |  [Supplemental JSON](supplemental-summary.json)','']
 (DEST/'RESULTS.md').write_text('\n'.join(lines),encoding='utf8')
 # Preserve collector/source identity before future builds overwrite cache outputs.
 for folder,bin_dir,source in [(PRIMARY,ROOT/'host-test-support/.cache/measurement-bin',ROOT/'host-test-support/measurement'),(ACTIONS,ROOT/'host-test-support/.cache/action-measurement-bin',ROOT/'host-test-support/measurement'),(SUPPLEMENTAL,ROOT/'host-test-support/.cache/workload-bin',ROOT/'host-test-support/workloads')]:
  artifact=folder/'collector-artifact'
  if folder==PRIMARY:continue # Original H binary and source were archived before the action revision.
  shutil.copytree(bin_dir,artifact/'bin',dirs_exist_ok=True)
  for directory in [ROOT/'host-test-support/measurement',ROOT/'host-test-support/workloads']:
   destination=artifact/'source'/'host-test-support'/directory.name;destination.mkdir(parents=True,exist_ok=True)
   for p in directory.iterdir():
    if p.is_file():shutil.copyfile(p,destination/p.name)
 evidence=DEST/'evidence';evidence.mkdir(exist_ok=True)
 for name in review['pilotFramesForReview']:
  p=(ROOT/name).resolve()
  if not p.is_relative_to(PRIMARY.resolve()):raise RuntimeError('Unexpected pilot image location')
  shutil.copyfile(p,evidence/(p.parent.name+'.png'))
 with zipfile.ZipFile(DEST/'collector-artifacts.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
  for label,folder in [('startup-idle',PRIMARY),('actions',ACTIONS),('supplemental',SUPPLEMENTAL)]:
   for p in (folder/'collector-artifact').rglob('*'):
    if p.is_file():archive.write(p,label+'/'+p.relative_to(folder/'collector-artifact').as_posix())
 with zipfile.ZipFile(DEST/'raw-metadata.zip','w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
  for p in (ROOT/'host-test-support/.cache/six-host-20261023-a').glob('correctness-*.json'):
   archive.write(p,'initial-correctness/'+p.name)
  for label,folder in [('startup-idle',PRIMARY),('actions',ACTIONS),('action-interference-retry',RETRY),('supplemental',SUPPLEMENTAL),('supplemental-preparation-with-interference',ROOT/'host-test-support/.cache/six-host-workload-20261024-a')]:
   for pattern in ['*.json','runs/*/*.json','runs/*/collector.log']:
    for p in folder.glob(pattern):archive.write(p,label+'/'+p.relative_to(folder).as_posix())
  for name in ['six-host-20261023-b','six-host-20261023-d','six-host-focus-20261023-e','six-host-focus-20261023-f']:
   folder=ROOT/'host-test-support/.cache'/name
   for pattern in ['*.json','runs/*/*.json','runs/*/collector.log']:
    for p in folder.glob(pattern):archive.write(p,'development-rejected/'+name+'/'+p.relative_to(folder).as_posix())
 (DEST/'SHA256SUMS.json').write_text(json.dumps({p.relative_to(DEST).as_posix():sha(p) for p in DEST.rglob('*') if p.is_file() and p.name!='SHA256SUMS.json'},indent=2),encoding='utf8')
 print(DEST/'RESULTS.md')
if __name__=='__main__':main()
