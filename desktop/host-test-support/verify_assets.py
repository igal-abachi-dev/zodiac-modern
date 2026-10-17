"""Verify/stage the selected Svelte production artifact; never rebuild it."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil

BASELINE = Path(__file__).resolve().parent.parent / "NeutronStar-Svelte"

def verify(root: Path, manifest: dict) -> None:
    if root.is_symlink() or root.is_junction():
        raise ValueError("Reparse asset root")
    actual = {}
    for path in root.rglob("*"):
        if path.is_symlink() or path.is_junction():
            raise ValueError("Reparse asset")
        if path.is_file():
            actual[path.relative_to(root).as_posix()] = path
    expected = {item["path"]: item for item in manifest["files"]}
    if len(expected) != len(manifest["files"]) or set(actual) != set(expected):
        raise ValueError("Asset file set differs from baseline manifest")
    for name, path in actual.items():
        data = path.read_bytes()
        item = expected[name]
        if len(data) != item["bytes"] or len(data) > 32 * 1024 * 1024 or hashlib.sha256(data).hexdigest() != item["sha256"]:
            raise ValueError("Asset digest/size mismatch")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", type=Path)
    args = parser.parse_args()
    raw = (BASELINE / ".cache/frontend-manifest.json").read_bytes()
    manifest = json.loads(raw)
    if hashlib.sha256((BASELINE / "pnpm-lock.yaml").read_bytes()).hexdigest() != manifest["lockSha256"]:
        raise ValueError("Frontend lock changed; rebuild NeutronStar-Svelte")
    source = BASELINE / "dist"
    verify(source, manifest)
    if args.stage:
        destination = args.stage.resolve()
        if destination == source.resolve() or source.resolve() in destination.parents or destination in source.resolve().parents:
            raise ValueError("Stage and baseline must be separate")
        destination.mkdir(parents=True, exist_ok=True)
        for item in manifest["files"]:
            target = destination / item["path"]
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.is_symlink() or target.is_junction() or any(p.is_symlink() or p.is_junction() for p in target.parents):
                raise ValueError("Reparse stage")
            shutil.copyfile(source / item["path"], target)
        verify(destination, manifest)
        destination.with_suffix(".manifest.json").write_bytes(raw)
    print(f"Verified {len(manifest['files'])} unchanged Svelte production assets")

if __name__ == "__main__":
    main()
