"""Freeze correctness evidence and exact source/artifact hashes; never run benchmarks."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
candidate, attempt = sys.argv[1:]
if candidate not in {"wxWidgets", "react-native-windows"}:
    raise SystemExit("Unknown candidate")
app = root / candidate
check = (app / ".cache" / attempt).resolve()
if check.parent != (app / ".cache").resolve():
    raise SystemExit("Invalid attempt path")
report = json.loads((check / "result.json").read_text(encoding="utf-8-sig"))
if report["status"] != "passed" or report.get("exitCode") != 0:
    raise SystemExit("Only successful, normally exited checks may be frozen")
output = app / "validation/2026-11-02"
output.mkdir(parents=True, exist_ok=True)
for name in ("result.json", "main.png", "narrow.png"):
    shutil.copyfile(check / name, output / name)
shutil.copyfile(app / ".cache-build-receipt.json", output / "build-receipt.json")

def record(path, base):
    return {"path": path.relative_to(base).as_posix(), "bytes": path.stat().st_size,
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}

files = subprocess.check_output(["git", "ls-files", "--cached", "--others",
    "--exclude-standard", "--", candidate, "host-test-support/candidate-checks"],
    cwd=root, text=True, encoding="utf-8").splitlines()
sources = []
for relative in sorted(set(files)):
    path = root / relative
    if not path.is_file() or "validation" in path.parts or path.name.startswith(".cache"):
        continue
    sources.append(record(path, root))
runtime = app / "out/win-x64"
artifacts = [record(path, runtime) for path in sorted(runtime.rglob("*")) if path.is_file()]
receipt = {"schema": 1, "scope": "correctness only; no comparative benchmark",
           "attempt": attempt, "sources": sources, "publishedFiles": artifacts}
(output / "freeze.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
runner = runtime / ("neutronstar_wx.exe" if candidate == "wxWidgets" else "NeutronStar.exe")
if hashlib.sha256(runner.read_bytes()).hexdigest().upper() != report["runnerSha256"]:
    raise SystemExit("Runner changed after the successful check")
print(f"Frozen {candidate}: {len(sources)} source/checker files; {len(artifacts)} published files")
