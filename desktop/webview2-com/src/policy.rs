pub const ORIGIN: &str = "https://neutronstar.invalid/";
pub const CSP: &str = "default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none'; img-src 'self'; font-src 'self'; connect-src 'self'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
pub const MAX_ASSET_BYTES: u64 = 32 * 1024 * 1024;

fn safe_segment(part: &str) -> bool {
    if part.is_empty() || matches!(part, "." | "..") || part.ends_with(['.', ' ']) {
        return false;
    }
    if part
        .chars()
        .any(|c| c < '\u{20}' || c == '\u{7f}' || "\\:%<>\"|?*".contains(c))
    {
        return false;
    }
    let stem = part.split('.').next().unwrap().to_uppercase();
    if matches!(
        stem.as_str(),
        "CON" | "PRN" | "AUX" | "NUL" | "CONIN$" | "CONOUT$"
    ) {
        return false;
    }
    if let Some(tail) = stem
        .strip_prefix("COM")
        .or_else(|| stem.strip_prefix("LPT"))
        && tail.chars().count() == 1
        && tail
            .chars()
            .all(|c| c.is_ascii_digit() || "¹²³".contains(c))
    {
        return false;
    }
    true
}

/// Equivalent canonical-origin, strict UTF-8/percent path policy to C++.
pub fn resource_path(uri: &str) -> Option<String> {
    if uri.encode_utf16().count() > 8192 {
        return None;
    }
    let path = uri.strip_prefix(ORIGIN)?.split(['?', '#']).next()?;
    let path = if path.is_empty() { "index.html" } else { path };
    if !path.is_ascii() {
        return None;
    }
    let mut bytes = Vec::with_capacity(path.len());
    let mut source = path.as_bytes().iter().copied();
    while let Some(byte) = source.next() {
        if byte == b'%' {
            let a = (source.next()? as char).to_digit(16)?;
            let b = (source.next()? as char).to_digit(16)?;
            let decoded = (a * 16 + b) as u8;
            if decoded == b'/' || decoded == b'\\' {
                return None;
            }
            bytes.push(decoded);
        } else {
            bytes.push(byte);
        }
    }
    let result = String::from_utf8(bytes).ok()?;
    result.split('/').all(safe_segment).then_some(result)
}

pub fn mime(path: &str) -> Option<&'static str> {
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

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn canonical_origin_and_paths() {
        assert_eq!(resource_path(ORIGIN).as_deref(), Some("index.html"));
        assert_eq!(
            resource_path(&format!("{ORIGIN}assets/app.js?x=1#test")).as_deref(),
            Some("assets/app.js")
        );
        assert_eq!(
            resource_path(&format!("{ORIGIN}%D7%A9.txt")).as_deref(),
            Some("ש.txt")
        );
        for path in [
            "../a.js",
            "a/../b.js",
            "a//b.js",
            "a/",
            "%2e%2e/x.js",
            "a%2fb.js",
            "a%5cb.js",
            "%ff.js",
            "%00.js",
            "%25.js",
            "C:/a.js",
            "CON.txt",
            "COM0.txt",
            "LPT%C2%B9.txt",
            "a./b.js",
            "a /b.js",
        ] {
            assert!(
                resource_path(&format!("{ORIGIN}{path}")).is_none(),
                "{path}"
            );
        }
        for url in [
            "http://neutronstar.invalid/a.js",
            "https://neutronstar.invalid.evil/a.js",
            "https://user@neutronstar.invalid/a.js",
            "file:///a.js",
        ] {
            assert!(resource_path(url).is_none());
        }
    }
    #[test]
    fn mime_and_byte_boundary() {
        assert!(mime("x.map").is_none());
        assert!(mime("x.ts").is_none());
        assert!(mime("x.exe").is_none());
        for extension in [
            "html", "js", "mjs", "css", "json", "txt", "svg", "png", "jpg", "jpeg", "webp", "ico",
            "woff", "woff2",
        ] {
            assert!(mime(&format!("x.{extension}")).is_some());
        }
        for b in 0..=255u16 {
            let url = format!("{ORIGIN}%{b:02X}.txt");
            if !(32..127).contains(&b) || [b'%', b'/', b'\\', b':'].contains(&(b as u8)) {
                assert!(resource_path(&url).is_none(), "{b}");
            }
        }
    }
}
