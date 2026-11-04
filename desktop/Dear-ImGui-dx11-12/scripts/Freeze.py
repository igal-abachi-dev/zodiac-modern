"""Freeze current candidate correctness evidence; never run comparative benchmarks."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess

app = Path(__file__).resolve().parents[1]
desktop = app.parent
output = app / "validation/2026-11-03"
output.mkdir(parents=True, exist_ok=True)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

production = app / "out/win-x64/neutronstar_imgui.exe"
probe = app / "out/clang-cl-ninja-x64/neutronstar_imgui_probe.exe"
expected = {"probe": digest(probe).upper(), "production": digest(production).upper()}
records = {}
for folder in sorted((app / ".cache").glob("check-*"), key=lambda p: p.stat().st_mtime, reverse=True):
    report = folder / "result.json"
    if not report.is_file():
        continue
    data = json.loads(report.read_text(encoding="utf-8-sig"))
    mode = "production" if data["scope"].startswith("production") else "probe"
    if data["status"] != "passed" or data.get("exitCode") != 0 or data["runnerSha256"] != expected[mode]:
        continue
    key = mode + "-" + data["requested"] + ("-fallback" if data.get("injected") else "")
    if key not in records:
        records[key] = {"attempt": folder.name, "report": data}
        target = output / key
        target.mkdir(exist_ok=True)
        for name in ("result.json", "main.png", "narrow.png", "snapshot.json"):
            if (folder / name).is_file():
                shutil.copyfile(folder / name, target / name)

required = {"probe-dx12", "probe-dx11", "probe-auto", "probe-auto-fallback", "production-dx12", "production-dx11"}
if not required.issubset(records):
    raise SystemExit(f"Missing current-binary acceptance: {required - records.keys()}")
negatives = sorted((app / ".cache").glob("negative-*"), key=lambda p: p.stat().st_mtime, reverse=True)
for folder in negatives:
    report = folder / "result.json"
    runner = folder / "neutronstar_imgui_probe.exe"
    if report.is_file() and runner.is_file() and digest(runner).upper() == expected["probe"]:
        data = json.loads(report.read_text(encoding="utf-8-sig"))
        if data["status"] == "passed" and data["actualExitCode"] == 2:
            shutil.copyfile(report, output / "strict-dx12-unavailable.json")
            break
else:
    raise SystemExit("Missing current-binary strict DX12 failure check")
shutil.copyfile(app / ".cache/build-receipt.json", output / "build-receipt.json")

def record(path, root):
    return {"path": path.relative_to(root).as_posix(), "bytes": path.stat().st_size, "sha256": digest(path)}

names = subprocess.check_output(["git", "ls-files", "--cached", "--others", "--exclude-standard", "--", app.name,
    "host-test-support/measurement/Native.cs"], cwd=desktop, text=True, encoding="utf-8").splitlines()
sources = [record(desktop / name, desktop) for name in sorted(set(names))
           if (desktop / name).is_file() and "validation" not in Path(name).parts]
runtime = app / "out/win-x64"
published = [record(path, runtime) for path in sorted(runtime.rglob("*")) if path.is_file()]
manifest = {"schema": 1, "scope": "correctness evidence only; no UIA or comparative performance acceptance",
    "productionSha256": expected["production"], "probeSha256": expected["probe"],
    "attempts": {key: value["attempt"] for key, value in records.items()}, "sources": sources, "publishedFiles": published}
(output / "freeze.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(f"Frozen {len(records)} accepted checks, strict failure, {len(sources)} sources and {len(published)} published files")
