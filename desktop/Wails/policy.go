package main

import (
	"io/fs"
	"net/http"
	"path"
	"strings"
)

const csp = "default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none'; img-src 'self'; font-src 'self'; connect-src 'self'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"

func assetPolicy(assets fs.FS) func(http.Handler) http.Handler {
	types := map[string]string{".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2"}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := w.Header()
			h.Set("Content-Security-Policy", csp)
			h.Set("X-Content-Type-Options", "nosniff")
			h.Set("Cache-Control", "no-store")
			h.Set("Referrer-Policy", "no-referrer")
			name := strings.TrimPrefix(r.URL.Path, "/")
			if name == "" {
				name = "index.html"
			}
			kind := types[path.Ext(name)]
			if r.Method != http.MethodGet || r.URL.RawQuery != "" || !fs.ValidPath(name) || strings.ContainsAny(name, "\\:%") || kind == "" {
				w.WriteHeader(http.StatusForbidden)
				return
			}
			info, err := fs.Stat(assets, name)
			if err != nil || info.IsDir() {
				w.WriteHeader(http.StatusNotFound)
				return
			}
			if info.Size() > 32*1024*1024 {
				w.WriteHeader(http.StatusForbidden)
				return
			}
			h.Set("Content-Type", kind)
			next.ServeHTTP(w, r)
		})
	}
}
