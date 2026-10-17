use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, fs, path::Path};

fn collect(directory: &Path, base: &Path, files: &mut BTreeMap<String, Vec<u8>>) {
    for entry in fs::read_dir(directory).expect("Read baseline assets") {
        let entry = entry.expect("Read asset entry");
        let path = entry.path();
        let meta = fs::symlink_metadata(&path).expect("Read asset metadata");
        assert!(!meta.file_type().is_symlink(), "Symlink in frontend assets");
        #[cfg(windows)]
        {
            use std::os::windows::fs::MetadataExt;
            assert_eq!(
                meta.file_attributes() & 0x400,
                0,
                "Reparse point in frontend assets"
            );
        }
        if meta.is_dir() {
            collect(&path, base, files);
        } else {
            assert!(
                meta.is_file() && meta.len() <= 32 * 1024 * 1024,
                "Invalid asset"
            );
            let name = path
                .strip_prefix(base)
                .unwrap()
                .to_str()
                .unwrap()
                .replace('\\', "/");
            assert!(
                name.is_ascii() && !name.contains(['%', '?', '#', ':']),
                "Unsafe asset name"
            );
            println!("cargo:rerun-if-changed={}", path.display());
            files.insert(name, fs::read(path).expect("Read asset"));
        }
    }
}

fn main() {
    let root = std::path::PathBuf::from(std::env::var_os("CARGO_MANIFEST_DIR").unwrap());
    let baseline = root.join("../../NeutronStar-Svelte");
    let dist = baseline.join("dist");
    let manifest_path = baseline.join(".cache/frontend-manifest.json");
    println!("cargo:rerun-if-changed={}", dist.display());
    println!("cargo:rerun-if-changed={}", manifest_path.display());
    let manifest_bytes =
        fs::read(&manifest_path).expect("Run pnpm build in NeutronStar-Svelte first");
    let manifest: serde_json::Value =
        serde_json::from_slice(&manifest_bytes).expect("Frontend manifest JSON");
    let lock = fs::read(baseline.join("pnpm-lock.yaml")).expect("Frontend lockfile");
    println!(
        "cargo:rerun-if-changed={}",
        baseline.join("pnpm-lock.yaml").display()
    );
    assert_eq!(
        format!("{:x}", Sha256::digest(lock)),
        manifest["lockSha256"].as_str().unwrap(),
        "Frontend lock hash mismatch; rebuild baseline"
    );
    let mut actual = BTreeMap::new();
    collect(&dist, &dist, &mut actual);
    let expected = manifest["files"].as_array().expect("Manifest files");
    assert_eq!(
        actual.len(),
        expected.len(),
        "Unexpected/missing frontend files"
    );
    let mut names = Vec::new();
    for file in expected {
        let name = file["path"].as_str().unwrap();
        let bytes = actual.get(name).expect("Missing manifest asset");
        assert_eq!(
            bytes.len() as u64,
            file["bytes"].as_u64().unwrap(),
            "Asset size mismatch"
        );
        assert_eq!(
            format!("{:x}", Sha256::digest(bytes)),
            file["sha256"].as_str().unwrap(),
            "Asset hash mismatch"
        );
        names.push(format!("/{name}"));
    }
    names.sort();
    names.dedup();
    assert_eq!(names.len(), actual.len(), "Duplicate manifest path");
    assert!(actual.contains_key("index.html"), "Missing entry page");
    let generated = format!(
        "pub const EMBEDDED_PATHS: &[&str] = &{names:?};\npub const FRONTEND_MANIFEST_SHA256: &str = {:?};\n",
        format!("{:x}", Sha256::digest(&manifest_bytes))
    );
    fs::write(
        Path::new(&std::env::var_os("OUT_DIR").unwrap()).join("assets.rs"),
        generated,
    )
    .unwrap();
    tauri_build::build();
}
