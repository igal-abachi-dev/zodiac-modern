"""Restore selected official Qt archives; no account, installer, or hash bypass.

Qt 6.12 per-kit repository layout is not yet handled by aqtinstall 3.3.0.
Uses its workspace venv's requests/py7zr. Original SHA-1 archive checksums are
verified over TLS; SHA-256 and manifest provenance are also recorded locally.
"""
from pathlib import Path, PurePosixPath
import hashlib
import json
import re
import xml.etree.ElementTree as ET
import requests
import py7zr

root = Path(__file__).resolve().parents[2] / '.cache' / 'qt-toolchain'
root.mkdir(parents=True, exist_ok=True)
kit = root / '6.12.0' / 'msvc2022_64'
kit.mkdir(parents=True, exist_ok=True)
base = 'https://download.qt.io/online/qtsdkrepository/windows_x86/desktop/qt6_6120/qt6_6120_msvc2022_64/'
session = requests.Session()
def get(url):
    result = session.get(url, timeout=90)
    result.raise_for_status()
    return result.content

metadata = get(base+'Updates.xml')
(root/'kit.xml').write_bytes(metadata)
document = ET.fromstring(metadata)
names = ['qt.qt6.6120.win64_msvc2022_64', 'qt.qt6.6120.addons.qtshadertools.win64_msvc2022_64']
archives = []
for package in document.findall('PackageUpdate'):
    if package.findtext('Name') not in names:
        continue
    if package.findtext('Version') != '6.12.0-0-202609280346':
        raise RuntimeError('Qt repository revision changed; review before restoring')
    for name in (package.findtext('DownloadableArchives') or '').split(','):
        name = name.strip()
        if not name.startswith(('qtbase-', 'qtdeclarative-', 'qtsvg-', 'qttools-', 'qtshadertools-')):
            continue
        url = base + package.findtext('Name') + '/' + package.findtext('Version') + name
        checksum = get(url+'.sha1').decode().strip().split()[0].lower()
        if not re.fullmatch('[0-9a-f]{40}', checksum):
            raise RuntimeError('Invalid official checksum')
        path = root / 'archives' / name
        path.parent.mkdir(exist_ok=True)
        if not path.exists() or hashlib.sha1(path.read_bytes()).hexdigest() != checksum:
            print('Downloading', name, flush=True)
            with session.get(url, stream=True, timeout=180) as response:
                response.raise_for_status()
                with path.open('wb') as output:
                    for block in response.iter_content(1024*1024):
                        output.write(block)
        data = path.read_bytes()
        if hashlib.sha1(data).hexdigest() != checksum:
            raise RuntimeError('Qt archive checksum mismatch')
        print('Verified/extracting', name, len(data), flush=True)
        with py7zr.SevenZipFile(path) as archive:
            for member in archive.getnames():
                p = PurePosixPath(member.replace('\\', '/'))
                if p.is_absolute() or '..' in p.parts or ':' in member:
                    raise RuntimeError('Unsafe Qt archive path')
            archive.extractall(kit)
        archives.append(dict(url=url, sha1=checksum, sha256=hashlib.sha256(data).hexdigest(), bytes=len(data)))
if not archives:
    raise RuntimeError('No SDK archives selected')
(root/'acquisition.json').write_text(json.dumps(dict(qt='6.12.0', manifest_sha256=hashlib.sha256(metadata).hexdigest(), archives=archives), indent=2))
for core in kit.glob('**/bin/Qt6Core.dll'):
    (core.parent/'qt.conf').write_text('[Paths]\nPrefix=..\n')
    print('Qt kit:',core.parent.parent,flush=True)
