"""Author-run synthetic browser PDF checks; no production private inputs."""
import base64
import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path('.cache/pdf-qa').resolve()))
import pymupdf  # Install scripts/pdf-qa-requirements.txt into .cache/pdf-qa.

if pymupdf.VersionBind != '1.28.2':
    raise RuntimeError('Use the pinned PDF QA renderer 1.28.2.')
root = Path('artifacts/exports')
expected = json.loads((root / 'print-expected.json').read_text())
report = {'renderer': 'PyMuPDF ' + pymupdf.VersionBind, 'formats': []}
digest = lambda value: hashlib.sha256(value).hexdigest()
check = lambda values: digest(json.dumps(values, separators=(',', ':'), ensure_ascii=False).encode())
for format_name in ('A4', 'Letter'):
    path = root / f'print-{format_name}.pdf'
    pdf = pymupdf.open(path)
    assert len(pdf) == expected['pageCount'] + 1, 'Unexpected blank/overflow page'
    recovered = ''
    for index in range(expected['pageCount']):
        page = pdf[index]
        text = page.get_text()
        assert f'page {index + 1} of {expected["pageCount"]}' in text
        fingerprint = re.search(r'Recipient: ([a-f0-9]{64})', text)[1]
        envelope = re.search(r'Envelope:\s+([a-f0-9]{64})', text)[1]
        code, count = re.search(r'S64CHECK1 page check: ([a-f0-9]{12}) \| raw total (\d+)', text).groups()
        count = int(count)
        assert count == len(expected['raw'])
        rows = re.findall(r'^(\d{2}) ([A-Za-z0-9_-]{1,16}) +([a-f0-9]{8})$', text, re.M)
        offset = index * 512
        assert len(rows) == (min(512, count - offset) + 15) // 16
        chunk = ''
        identity = ['rsa-oaep-sha256-aes256gcm-v1', 'S64L1', envelope, fingerprint, count, index, expected['pageCount']]
        for row_index, (label, raw, row_code) in enumerate(rows):
            assert int(label) == row_index + 1
            assert check(['S64CHECK1', 'row', *identity, row_index, offset + row_index * 16, raw]).startswith(row_code)
            chunk += raw
        assert check(['S64CHECK1', 'page', *identity, offset, chunk]).startswith(code)
        recovered += chunk
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                for span in line['spans']:
                    x0, y0, x1, y1 = span['bbox']
                    assert x0 >= 55 and y0 >= 55 and x1 <= page.rect.width - 55 and y1 <= page.rect.height - 55, 'Text outside 20mm content area'
                    if re.match(r'^\d{2} [A-Za-z0-9_-]', span['text']):
                        assert span['size'] >= 8.99, 'Raw recovery text smaller than 9pt'
    assert recovered == expected['raw']
    assert digest(base64.urlsafe_b64decode(recovered + '=' * (-len(recovered) % 4))) == envelope
    assert 'The MIT License' in pdf[-1].get_text() and 'Permission to use' in pdf[-1].get_text()
    renders = []
    for label, index in [('first', 0), ('middle', expected['pageCount'] // 2), ('final', expected['pageCount'] - 1), ('license', expected['pageCount'])]:
        output = root / f'print-{format_name}-{label}.png'
        pdf[index].get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5)).save(output)
        renders.append({'file': output.as_posix(), 'sha256': digest(output.read_bytes())})
    report['formats'].append({'format': format_name, 'pages': len(pdf), 'ciphertextPages': expected['pageCount'], 'pdfSHA256': digest(path.read_bytes()), 'rawRecovery': 'all rows/page codes/whole envelope match', 'renders': renders})
report['raw'] = expected['raw']
report['plaintext'] = expected['plaintext']
print(json.dumps(report))
