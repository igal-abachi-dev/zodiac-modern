"""Prepare isolated supplemental-host sources/artifacts. Production is read-only."""
from pathlib import Path
import hashlib, json, shutil

ROOT=Path(__file__).resolve().parent.parent
DEST=ROOT/'host-test-support/.cache/workload-hosts-20261023'
def copy_tree(source,target):
 if target.exists(): raise RuntimeError('Use a fresh staging directory: '+str(target))
 shutil.copytree(source,target)
def main():
 if DEST.exists():raise RuntimeError('Isolated workload staging already exists; do not overwrite it')
 DEST.mkdir(parents=True)
 baseline=DEST/'NeutronStar-Svelte';baseline.mkdir()
 copy_tree(ROOT/'NeutronStar-Svelte/dist-workload',baseline/'dist')
 shutil.copyfile(ROOT/'NeutronStar-Svelte/pnpm-lock.yaml',baseline/'pnpm-lock.yaml')
 files=[]
 for p in sorted((baseline/'dist').rglob('*')):
  if p.is_symlink() or p.is_junction():raise RuntimeError('Reparse workload asset')
  if p.is_file():
   data=p.read_bytes();files.append({'path':p.relative_to(baseline/'dist').as_posix(),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 manifest={'schema':1,'fixture':'starlight-en-he-v2-supplemental','state':'nanostores-1.5.5','lockSha256':hashlib.sha256((baseline/'pnpm-lock.yaml').read_bytes()).hexdigest(),'files':files}
 (baseline/'.cache').mkdir();raw=json.dumps(manifest,indent=2).encode()+b'\n';(baseline/'.cache/frontend-manifest.json').write_bytes(raw)
 # No target trees or dependency sources are copied into the isolated Tauri tree.
 tauri=DEST/'Tauri-v2-Test';tauri.mkdir()
 if (ROOT/'Tauri-v2-Test/.cargo').exists():copy_tree(ROOT/'Tauri-v2-Test/.cargo',tauri/'.cargo')
 shutil.copytree(ROOT/'Tauri-v2-Test/src-tauri',tauri/'src-tauri',ignore=shutil.ignore_patterns('target','gen'))
 wails=DEST/'Wails';wails.mkdir()
 for name in ['main.go','policy.go','policy_test.go','go.mod','go.sum','wails.json']:shutil.copyfile(ROOT/'Wails'/name,wails/name)
 # Wails reuses only original build metadata/icons; its embedded UI is replaced.
 if (ROOT/'Wails/build/windows').exists():copy_tree(ROOT/'Wails/build/windows',wails/'build/windows')
 copy_tree(baseline/'dist',wails/'frontend/dist');(wails/'frontend/dist.manifest.json').write_bytes(raw)
 copy_tree(ROOT/'WinUI3-webview2/out/win-x64',DEST/'winui')
 copy_tree(ROOT/'PyWebView/dist/neutronstar-pywebview',DEST/'pywebview')
 for root,asset_name in [(DEST/'winui','Frontend'),(DEST/'pywebview/_internal','frontend')]:
  existing=(root/asset_name).resolve()
  # Only delete the known copied asset directory strictly inside this new stage.
  if DEST.resolve() not in existing.parents or existing.is_symlink() or existing.is_junction():raise RuntimeError('Unsafe staging target')
  shutil.rmtree(existing)
  copy_tree(baseline/'dist',existing)
  (root/(asset_name+'.manifest.json')).write_bytes(raw)
 print('Prepared isolated supplemental payloads:',DEST,'assets=',len(files))
if __name__=='__main__':main()
