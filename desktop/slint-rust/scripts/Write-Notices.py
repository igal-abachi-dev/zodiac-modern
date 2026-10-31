from pathlib import Path
import json
import subprocess

project=Path(__file__).resolve().parents[1]
data=json.loads(subprocess.check_output(['cargo','metadata','--locked','--format-version','1'],cwd=project))
text=['NeutronStar Slint — complete resolved Cargo attribution graph (includes build/other-platform dependencies).',
      'Slint 1.18.1 desktop use: LicenseRef-Slint-Royalty-free-2.0; AboutSlint is displayed in About.',
      'This inventory is not independent distribution/license approval.']
for package in sorted(data['packages'],key=lambda p:(p['name'],p['version'])):
    text.append('\n=== '+package['name']+' '+package['version']+' / '+str(package.get('license'))+' ===')
    root=Path(package['manifest_path']).parent
    files=set(root.glob('LICENSE*'))|set(root.glob('COPYING*'))|set(root.glob('NOTICE*'))
    if package.get('license_file'): files.add(root/package['license_file'])
    for file in sorted(files):
        if file.is_file() and file.stat().st_size<2_000_000:
            text.extend([file.name,file.read_text(encoding='utf-8',errors='replace')])
for file in sorted((project/'assets/Notices').glob('*')):
    text.extend(['\n=== '+file.name+' ===',file.read_text(encoding='utf-8')])
for file in (project/'target/release/build').glob('skia-bindings-*/out/**/LICENSE*'):
    if file.is_file() and file.stat().st_size<2_000_000:
        text.extend(['\n=== Skia binary '+file.name+' ===',file.read_text(encoding='utf-8',errors='replace')])
(project/'out/win-x64/THIRD-PARTY-NOTICES.txt').write_text('\n'.join(text),encoding='utf-8')
