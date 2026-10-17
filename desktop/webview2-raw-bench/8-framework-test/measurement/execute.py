"""Run accepted primary phases serially; stop at the first rejected attempt."""
from pathlib import Path
import subprocess
import sys

if len(sys.argv) not in (2,3):
    raise SystemExit('Usage: python measurement/execute.py primary-folder [supplemental-folder]')
root=Path(__file__).resolve().parents[1]
for phase in ['startup','resources','actions','summarize']:
    subprocess.run([sys.executable,'measurement/run.py',phase,'--folder',sys.argv[1]],cwd=root,check=True)
subprocess.run([sys.executable,'measurement/analyze.py',sys.argv[1]],cwd=root,check=True)
if len(sys.argv)==3:
    subprocess.run([sys.executable,'measurement-supplemental/run.py','measure','--folder',sys.argv[2]],cwd=root,check=True)
