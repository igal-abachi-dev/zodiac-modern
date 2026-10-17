"""Standard pywebview + its supported WSGI asset entry; no native interop."""
from pathlib import Path
import argparse
import hashlib
import json
import os

from asset_app import AssetApp

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", type=Path)
    args = parser.parse_args()
    if any(key.upper().startswith("WEBVIEW2_") for key in os.environ):
        raise ValueError("Remove WEBVIEW2_* overrides")
    root = Path(__file__).resolve().parent
    manifest = json.loads((root / "frontend.manifest.json").read_bytes())
    # Validation happens before creating any GUI/browser process.
    for item in manifest["files"]:
        path = root / "frontend" / item["path"]
        if path.is_symlink() or path.is_junction(): raise ValueError("Reparse asset")
        data = path.read_bytes()
        if len(data)!=item["bytes"] or hashlib.sha256(data).hexdigest()!=item["sha256"]:
            raise ValueError("Frozen asset changed")
    profile = args.profile or Path(os.environ["LOCALAPPDATA"]) / "NeutronStar" / "PyWebView" / "Profile"
    if not profile.is_absolute(): raise ValueError("Profile must be absolute")
    # pywebview recursively deletes its storage directory in private mode.
    # Give it only a dedicated child owned by this app, never the caller's root.
    profile = profile / "pywebview-owned-storage"
    if profile.exists() and (profile.is_symlink() or profile.is_junction()):
        raise ValueError("Reparse profile")
    # Keep the standard framework public APIs. No window.native/CLR/COM calls.
    import webview
    webview.settings.update({"ALLOW_DOWNLOADS": False, "ALLOW_FILE_URLS": False,
        "OPEN_EXTERNAL_LINKS_IN_BROWSER": False, "OPEN_DEVTOOLS_IN_DEBUG": False,
        "IGNORE_SSL_ERRORS": False, "REMOTE_DEBUGGING_PORT": None})
    webview.create_window("NeutronStar GUI Bench", url=AssetApp(root / "frontend", manifest),
        width=960, height=640, min_size=(720,480), resizable=True,
        frameless=False, background_color="#ffffff", text_select=True,
        zoomable=False, draggable=False)
    webview.start(gui="edgechromium", debug=False, private_mode=True,
        storage_path=str(profile), http_server=True)

if __name__ == "__main__":
    main()
