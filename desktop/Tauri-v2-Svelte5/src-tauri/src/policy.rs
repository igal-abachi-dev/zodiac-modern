use std::borrow::Cow;
use tauri::http::{Method, Request, Response, StatusCode, header::HeaderValue};

pub const CSP: &str = "default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none'; img-src 'self'; font-src 'self'; connect-src 'self'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

pub fn allowed_navigation(url: &tauri::Url) -> bool {
    url.scheme() == "https"
        && url.host_str() == Some("tauri.localhost")
        && url.port().is_none()
        && url.username().is_empty()
        && url.password().is_none()
        && matches!(url.path(), "/" | "/index.html")
        && url.query().is_none()
}

fn mime(path: &str) -> Option<&'static str> {
    Some(match path.rsplit('.').next()? {
        "html" => "text/html; charset=utf-8",
        "js" | "mjs" => "text/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "json" => "application/json",
        "txt" => "text/plain; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        _ => return None,
    })
}

// Tauri's standard app protocol resolves assets before this callback and has an
// automatic SPA fallback. Replace that fallback with explicit 403/404 responses.
pub fn filter_response(
    request: Request<Vec<u8>>,
    response: &mut Response<Cow<'static, [u8]>>,
    paths: &[&str],
) {
    let uri = request.uri();
    let path = if uri.path() == "/" {
        "/index.html"
    } else {
        uri.path()
    };
    let kind = mime(path);
    let invalid = request.method() != Method::GET
        || uri.authority().map(|a| a.as_str()) != Some("localhost")
        || uri.scheme_str() != Some("tauri")
        || uri.query().is_some()
        || path.contains(['%', '\\', ':'])
        || path.split('/').any(|p| matches!(p, "." | ".."))
        || kind.is_none();
    let status = if invalid {
        StatusCode::FORBIDDEN
    } else if !paths.contains(&path) {
        StatusCode::NOT_FOUND
    } else {
        StatusCode::OK
    };
    *response.status_mut() = status;
    if status != StatusCode::OK {
        *response.body_mut() = Cow::Borrowed(b"");
    }
    let headers = response.headers_mut();
    headers.remove("access-control-allow-origin");
    headers.insert(
        "content-type",
        HeaderValue::from_static(if status == StatusCode::OK {
            kind.unwrap()
        } else {
            "text/plain; charset=utf-8"
        }),
    );
    headers.insert("content-security-policy", HeaderValue::from_static(CSP));
    headers.insert(
        "x-content-type-options",
        HeaderValue::from_static("nosniff"),
    );
    headers.insert("cache-control", HeaderValue::from_static("no-store"));
    headers.insert("referrer-policy", HeaderValue::from_static("no-referrer"));
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn navigation_is_entry_only_with_optional_hash() {
        assert!(include_str!("../tauri.conf.json").contains(CSP));
        for url in [
            "https://tauri.localhost/",
            "https://tauri.localhost/index.html#/about",
        ] {
            assert!(allowed_navigation(&url.parse().unwrap()));
        }
        for url in [
            "http://tauri.localhost/",
            "https://tauri.localhost.evil/",
            "https://user@tauri.localhost/",
            "https://tauri.localhost:1234/",
            "https://tauri.localhost/about",
            "https://example.invalid/",
            "https://tauri.localhost/?x=1",
            "file:///index.html",
        ] {
            assert!(!allowed_navigation(&url.parse().unwrap()), "{url}");
        }
    }
    #[test]
    fn asset_policy_removes_spa_fallback_and_pins_headers() {
        for (method, url, expected) in [
            ("GET", "tauri://localhost/", 200),
            ("GET", "tauri://localhost/index.html", 200),
            ("GET", "tauri://localhost/missing.js", 404),
            ("GET", "tauri://localhost/not-allowed.exe", 403),
            ("POST", "tauri://localhost/index.html", 403),
            ("GET", "tauri://localhost/%2e%2e/index.html", 403),
            ("GET", "tauri://evil/index.html", 403),
            ("GET", "tauri://localhost/index.html?x=1", 403),
        ] {
            let request = Request::builder()
                .method(method)
                .uri(url)
                .body(vec![])
                .unwrap();
            let mut response = Response::new(Cow::Borrowed(b"fallback".as_slice()));
            filter_response(request, &mut response, &["/index.html"]);
            assert_eq!(response.status().as_u16(), expected, "{url}");
            assert_eq!(response.headers()["content-security-policy"], CSP);
            assert_eq!(response.headers()["x-content-type-options"], "nosniff");
            assert_eq!(response.body().is_empty(), expected != 200);
        }
    }
}
