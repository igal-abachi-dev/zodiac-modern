"""Continue after the active primary collector, validating gates between phases."""
from pathlib import Path
import json,subprocess,sys,time
ROOT=Path(__file__).resolve().parent.parent
PRIMARY=ROOT/'host-test-support/.cache/six-host-20261024-h'
ACTIONS=ROOT/'host-test-support/.cache/six-host-actions-20261024-i'
SUPPLEMENTAL=ROOT/'host-test-support/.cache/six-host-workload-20261024-b'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def run(*arguments):
 subprocess.run([sys.executable,*map(str,arguments)],cwd=ROOT,check=True,creationflags=subprocess.CREATE_NO_WINDOW)
def main():
 run('host-test-support/review_measurements.py',PRIMARY,'--scenarios','startup','idle','earlyclose')
 counts=read(PRIMARY/'independent-review-selected.json')['counts']
 if counts!={'earlyclose':18,'startup':600,'idle':36}:raise RuntimeError('Incomplete startup/idle cohort: '+str(counts))
 run('host-test-support/measurement/analyze.py',PRIMARY)
 collector=ROOT/'host-test-support/.cache/action-measurement-bin/Measurement.dll'
 if (ACTIONS/'reviewed-rejections.json').exists():
  run('host-test-support/finish_action_schedule.py')
  run('host-test-support/review_measurements.py',ACTIONS,'--reviewed',ACTIONS/'reviewed-rejections.json')
 else:
  run('host-test-support/measurement/run.py','actionpilot','--folder',ACTIONS,'--collector',collector)
  run('host-test-support/review_measurements.py',ACTIONS)
  if read(ACTIONS/'independent-review.json')['counts']!={'actions':6}:raise RuntimeError('Incomplete action pilot')
  if read(ACTIONS/'runtime.json')!=read(PRIMARY/'runtime.json'):raise RuntimeError('Action runtime differs')
  (ACTIONS/'pilot-accepted.json').write_text(json.dumps({'accepted':True,'scope':'Action-only collector revision; unchanged hosts/assets/readiness; bounded read-only provider retries; no input retries','pilotAttempts':6},indent=2),encoding='utf8')
  run('host-test-support/measurement/run.py','actions','--folder',ACTIONS,'--collector',collector)
  run('host-test-support/review_measurements.py',ACTIONS)
 run('host-test-support/measurement/analyze.py',ACTIONS)
 if read(ACTIONS/'independent-review.json')['counts']!={'actions':144}:raise RuntimeError('Incomplete action cohort')
 run('host-test-support/workloads/run.py','pilot','--folder',SUPPLEMENTAL)
 reports=[read(p) for p in (SUPPLEMENTAL/'runs').glob('pilot-*/result.json')]
 expected={'replace-10000','replace-1000','reverse-1000','splice-10','update-10-percent','filter-to-one','filter-clear','filter-during-30hz-requested','remount'}
 if len(reports)!=6 or {r['config']['app'] for r in reports}!={'cpp','rust','tauri','wails','pywebview','winui'}:raise RuntimeError('Incomplete supplemental pilot')
 for r in reports:
  if r['status']!='passed' or r['exitCode']!=0 or not r['helpersExited'] or {a['name'] for a in r['actions']}!=expected:raise RuntimeError('Supplemental pilot validation failed')
 if read(SUPPLEMENTAL/'runtime.json')!=read(PRIMARY/'runtime.json'):raise RuntimeError('Primary/supplemental runtime differs')
 (SUPPLEMENTAL/'pilot-accepted.json').write_text(json.dumps({'accepted':True,'review':'Six identical-asset UIA3 semantic/keyed-row/filter/timer/remount and lifecycle passes; no physical-paint/AT acceptance','runtime':read(SUPPLEMENTAL/'runtime.json')},indent=2),encoding='utf8')
 run('host-test-support/workloads/run.py','measure','--folder',SUPPLEMENTAL)
 run('host-test-support/workloads/run.py','summarize','--folder',SUPPLEMENTAL)
 summary=read(SUPPLEMENTAL/'summary.json')
 if summary['attempts']!=144 or summary['failed'] or any(row['inputToUiaObservedMs']['n']!=20 for row in summary['actions']):raise RuntimeError('Supplemental sample-count/acceptance failure')
 print('COMPLETE: accepted startup/idle from H, independently recollected actions from I, and 144 supplemental attempts; rejected warmup preserved.',flush=True)
if __name__=='__main__':main()
