"""Development-time conversion; not needed to build/run the committed TTF assets.

Use fonttools[woff]==4.67.0 (Brotli 1.2.1) in an isolated tool environment.
Supply any directory holding the four pinned Fontsource 5.3.0 WOFF2 files.
This script never reads another application's UI or state implementation.
"""
from pathlib import Path
import argparse,hashlib,json
from fontTools.ttLib import TTFont
import fontTools

parser=argparse.ArgumentParser()
parser.add_argument('source',type=Path)
args=parser.parse_args()
out=Path(__file__).resolve().parents[1]/'Assets/fonts'
sources=[*(f'inter-latin-{weight}-normal.woff2' for weight in (400,500,600)),
         'noto-sans-hebrew-hebrew-400-normal.woff2']
files=[]
for name in sources:
    original=args.source/name
    target=out/(name.removesuffix('.woff2')+'.ttf')
    font=TTFont(original,recalcTimestamp=False)
    assert font['OS/2'].usWeightClass==int(name.split('-')[-2])
    font.flavor=None
    font.save(target)
    files.append({'source':name,'package':'@fontsource/inter@5.3.0' if name.startswith('inter') else '@fontsource/noto-sans-hebrew@5.3.0',
                  'sourceSha256':hashlib.sha256(original.read_bytes()).hexdigest(),'output':target.name,
                  'outputSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'weight':font['OS/2'].usWeightClass})
(out/'provenance.json').write_text(json.dumps({'conversion':'WOFF2 decompression only; unchanged glyphs/weight; original font timestamps retained',
                                            'fonttools':fontTools.version,'files':files},indent=2)+'\n',encoding='utf-8')
print(json.dumps(files,indent=2))
