"""Static-only WSGI app. No backend routes or file/key APIs."""
from pathlib import Path

CSP = "default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none'; img-src 'self'; font-src 'self'; connect-src 'self'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
TYPES = {".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".mjs":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json", ".txt":"text/plain; charset=utf-8", ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp", ".ico":"image/x-icon", ".woff":"font/woff", ".woff2":"font/woff2"}

class AssetApp:
    def __init__(self, root, manifest):
        self.root = Path(root).resolve()
        self.files = {item["path"] for item in manifest["files"]}

    def __call__(self, env, start_response):
        name = env.get("PATH_INFO", "/").removeprefix("/") or "index.html"
        status, body, kind = "403 Forbidden", b"", "text/plain; charset=utf-8"
        host = env.get("HTTP_HOST", "").split(":")[0]
        if (env.get("REQUEST_METHOD") == "GET" and not env.get("QUERY_STRING")
            and host in ("127.0.0.1", "localhost") and name.isascii()
            and not any(c in name for c in "\\:%\x00")
            and all(p not in ("", ".", "..") for p in name.split("/"))
            and Path(name).suffix in TYPES):
            if name not in self.files:
                status = "404 Not Found"
            else:
                file = self.root / name
                if file.is_symlink() or file.is_junction() or not file.resolve().is_relative_to(self.root):
                    status = "403 Forbidden"
                else:
                    try:
                        body = file.read_bytes()
                        if len(body)>32*1024*1024: raise ValueError("Oversize asset")
                        status,kind = "200 OK", TYPES[Path(name).suffix]
                    except (OSError, ValueError):
                        status,body = "404 Not Found", b""
        start_response(status, [("Content-Type",kind),("Content-Length",str(len(body))),
            ("Content-Security-Policy",CSP),("X-Content-Type-Options","nosniff"),
            ("Cache-Control","no-store"),("Referrer-Policy","no-referrer")])
        return [body]
