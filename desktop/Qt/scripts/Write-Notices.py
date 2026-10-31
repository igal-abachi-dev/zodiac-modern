from pathlib import Path
import json
import sys

kit, project, output = map(Path, sys.argv[1:])
text = ['NeutronStar Qt research candidate — dependency attribution inventory',
        'Dynamic official Qt 6.12.0 libraries. Distribution/license review remains a release gate.',
        'Matching source: https://download.qt.io/archive/qt/6.12/6.12.0/single/',
        'Qt open-source terms: https://www.qt.io/licensing/open-source-lgpl-obligations']
for file in sorted((project/'assets/Notices').glob('*')):
    text.extend(['\n=== '+file.name+' ===', file.read_text(encoding='utf-8')])
for name in ['qtbase', 'qtdeclarative', 'qtsvg']:
    data = json.loads((kit/'sbom'/f'{name}-6.12.0.spdx.json').read_text(encoding='utf-8'))
    text.append('\n=== Official Qt binary SBOM: '+name+' ===')
    for package in data.get('packages', []):
        text.append(json.dumps({key: package.get(key) for key in ['name','versionInfo','licenseDeclared','licenseConcluded','copyrightText','downloadLocation']}, ensure_ascii=False))
    for license in data.get('hasExtractedLicensingInfos', []):
        text.extend(['\n'+license['licenseId'],license['extractedText']])
(output/'THIRD-PARTY-NOTICES.txt').write_text('\n'.join(text),encoding='utf-8')
