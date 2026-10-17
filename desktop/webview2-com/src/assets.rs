use crate::policy::MAX_ASSET_BYTES;
use std::{
    fs::{File, OpenOptions},
    io::{Error, ErrorKind, Read, Result},
    os::windows::{
        fs::{MetadataExt, OpenOptionsExt},
        io::{AsRawHandle, FromRawHandle},
    },
    path::{Path, PathBuf},
};
use windows::{
    Win32::{
        Foundation::HANDLE,
        Storage::FileSystem::*,
        System::WindowsProgramming::{DRIVE_FIXED, DRIVE_REMOVABLE},
    },
    core::HSTRING,
};

fn denied() -> Error {
    Error::new(ErrorKind::PermissionDenied, "Asset confinement policy")
}
fn handle(file: &File) -> HANDLE {
    HANDLE(file.as_raw_handle())
}
fn final_path(file: &File) -> Result<PathBuf> {
    let mut buffer = vec![0u16; 32768];
    let count =
        unsafe { GetFinalPathNameByHandleW(handle(file), &mut buffer, FILE_NAME_NORMALIZED) }
            as usize;
    if count == 0 || count >= buffer.len() {
        return Err(Error::last_os_error());
    }
    use std::os::windows::ffi::OsStringExt;
    Ok(std::ffi::OsString::from_wide(&buffer[..count]).into())
}
pub fn local_directory(path: &Path) -> Result<()> {
    let text = path.as_os_str().to_string_lossy();
    if !path.is_absolute() || text.starts_with("\\\\") {
        return Err(denied());
    }
    let drive = text.get(..3).ok_or_else(denied)?;
    let kind = unsafe { GetDriveTypeW(&HSTRING::from(drive)) };
    if kind != DRIVE_FIXED && kind != DRIVE_REMOVABLE {
        return Err(denied());
    }
    Ok(())
}
pub fn nested(parent: &Path, child: &Path) -> bool {
    let a = parent
        .to_string_lossy()
        .trim_end_matches('\\')
        .to_lowercase();
    let b = child.to_string_lossy().to_lowercase();
    b == a || b.starts_with(&(a + "\\"))
}

// Match weakly_canonical before creating the user-data directory. In particular,
// reject a profile nested in the asset tree before writing any directories.
pub fn prospective_directory(path: &Path) -> Result<PathBuf> {
    if path
        .components()
        .any(|c| matches!(c, std::path::Component::ParentDir))
    {
        return Err(denied());
    }
    let mut existing = path.to_path_buf();
    let mut suffix = Vec::new();
    while !existing.exists() {
        suffix.push(existing.file_name().ok_or_else(denied)?.to_os_string());
        if !existing.pop() {
            return Err(denied());
        }
    }
    let mut result = existing.canonicalize()?;
    for part in suffix.into_iter().rev() {
        result.push(part);
    }
    Ok(result)
}

pub struct AssetRoot {
    root: PathBuf,
    _directory: File,
    final_root: PathBuf,
}
impl AssetRoot {
    pub fn new(root: &Path) -> Result<Self> {
        let root = root.canonicalize()?;
        let display = root.to_string_lossy();
        local_directory(Path::new(display.strip_prefix(r"\\?\").unwrap_or(&display)))?;
        let h = unsafe {
            CreateFileW(
                &HSTRING::from(root.as_os_str()),
                FILE_READ_ATTRIBUTES.0,
                FILE_SHARE_READ | FILE_SHARE_WRITE,
                None,
                OPEN_EXISTING,
                FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT,
                None,
            )
        }?;
        // CreateFile transfers one valid handle into File's RAII ownership.
        let directory = unsafe { File::from_raw_handle(h.0) };
        let final_root = final_path(&directory)?;
        Ok(Self {
            root,
            _directory: directory,
            final_root,
        })
    }
    pub fn path(&self) -> &Path {
        &self.root
    }
    pub fn read(&self, name: &str) -> Result<Vec<u8>> {
        let mut path = self.root.clone();
        for part in name.split('/') {
            path.push(part);
            if std::fs::symlink_metadata(&path)?.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT.0
                != 0
            {
                return Err(denied());
            }
        }
        let mut file = OpenOptions::new()
            .read(true)
            .share_mode(FILE_SHARE_READ.0)
            .custom_flags(FILE_FLAG_OPEN_REPARSE_POINT.0 | FILE_FLAG_SEQUENTIAL_SCAN.0)
            .open(path)?;
        let metadata = file.metadata()?;
        if !metadata.is_file()
            || metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT.0 != 0
            || metadata.len() > MAX_ASSET_BYTES
            || unsafe { GetFileType(handle(&file)) } != FILE_TYPE_DISK
            || !nested(&self.final_root, &final_path(&file)?)
        {
            return Err(denied());
        }
        let mut data = Vec::with_capacity(metadata.len() as usize);
        file.by_ref()
            .take(MAX_ASSET_BYTES + 1)
            .read_to_end(&mut data)?;
        if data.len() as u64 != metadata.len() {
            return Err(denied());
        }
        Ok(data)
    }
}
