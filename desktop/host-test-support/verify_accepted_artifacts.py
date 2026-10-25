"""Recheck accepted artifact identities, resolving H source through its original archive."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parent.parent
def main():
 reports=[];errors=[]
 for name in ['six-host-20261024-h','six-host-actions-20261024-i','six-host-workload-20261024-b']:
  folder=ROOT/'host-test-support/.cache'/name;freeze=json.loads((folder/'freeze.json').read_text());archived=[]
  for relative,item in freeze['files'].items():
   p=ROOT/relative
   def matches(path):return path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest()==item['sha256']
   if matches(p):continue
   normalized=relative.replace('\\','/')
   saved=folder/'collector-artifact/source'/relative
   if name=='six-host-20261024-h' and normalized.startswith('host-test-support/measurement/') and matches(saved):archived.append(relative)
   else:errors.append(name+': '+relative)
  reports.append({'cohort':name,'files':len(freeze['files']),'originalSourceResolvedFromArchive':archived})
 report={'valid':not errors,'errors':errors,'cohorts':reports}
 out=ROOT/'host-test-support/.cache/accepted-artifact-review.json';out.write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps(report,indent=2));return 0 if report['valid'] else 1
if __name__=='__main__':raise SystemExit(main())
