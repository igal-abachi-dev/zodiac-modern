package localfile

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"golang.org/x/sys/windows"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"unicode/utf8"
	"unsafe"
)

const maxBestEffortDeleteBytes = 10 << 20

// secureDelete holds the verified parent and file handles throughout the
// overwrite. It follows the supplied SDelete-style routine's zero, ones, and
// five random passes with aligned no-intermediate-buffering I/O, then makes
// three random same-directory renames by handle and deletes by handle. This
// remains best effort; storage firmware and snapshots may retain old copies.
func secureDelete(path string) error {
	p, err := holdParents(path)
	if err != nil {
		return err
	}
	defer p.close()
	if err := p.check(); err != nil {
		return err
	}
	h, err := relative(p.handles[len(p.handles)-1], p.leaf, windows.GENERIC_READ|windows.GENERIC_WRITE|windows.DELETE|windows.SYNCHRONIZE, windows.FILE_OPEN, windows.FILE_NON_DIRECTORY_FILE|windows.FILE_WRITE_THROUGH|windows.FILE_NO_INTERMEDIATE_BUFFERING, nil, 0)
	if err != nil {
		return ErrPath
	}
	f := os.NewFile(uintptr(h), p.leaf)
	defer f.Close()
	sector, err := sectorSize(h, p.handles[0])
	if err != nil {
		return err
	}
	if _, err := info(h, false, p.volume); err != nil {
		return err
	}
	if err := p.check(); err != nil {
		return err
	}
	stat, err := f.Stat()
	if err != nil || stat.Size() < 0 || stat.Size() > maxBestEffortDeleteBytes {
		return ErrPath
	}
	size := stat.Size()
	paddedSize := (size + int64(sector) - 1) / int64(sector) * int64(sector)
	if paddedSize > maxBestEffortDeleteBytes+int64(sector) {
		return ErrPath
	}
	if err := f.Truncate(paddedSize); err != nil {
		return fmt.Errorf("align output length: %w", err)
	}
	const allocSize = 64 << 10
	base, err := windows.VirtualAlloc(0, allocSize+uintptr(sector), windows.MEM_COMMIT|windows.MEM_RESERVE, windows.PAGE_READWRITE)
	if err != nil {
		return err
	}
	defer windows.VirtualFree(base, 0, windows.MEM_RELEASE)
	addr := (uintptr(base) + uintptr(sector) - 1) &^ (uintptr(sector) - 1)
	buffer := unsafe.Slice((*byte)(unsafe.Pointer(addr)), allocSize)
	defer func() { clear(buffer); runtime.KeepAlive(buffer); runtime.KeepAlive(base) }()
	chunkSize := len(buffer) / int(sector) * int(sector)
	for pass := 0; pass < 7; pass++ {
		for offset := int64(0); offset < paddedSize; {
			if err := p.check(); err != nil {
				return err
			}
			n := int64(chunkSize)
			if remain := paddedSize - offset; remain < n {
				n = remain
			}
			chunk := buffer[:int(n)]
			if pass == 0 {
				clear(chunk)
			} else if pass == 1 {
				for i := range chunk {
					chunk[i] = 0xff
				}
			} else if _, err := rand.Read(chunk); err != nil {
				return err
			}
			written, err := f.WriteAt(chunk, offset)
			if err != nil {
				return fmt.Errorf("write overwrite pass: %w", err)
			}
			if written != len(chunk) {
				return io.ErrShortWrite
			}
			offset += int64(written)
		}
		if err := f.Sync(); err != nil {
			return fmt.Errorf("flush overwrite pass: %w", err)
		}
	}
	if err := f.Truncate(0); err != nil {
		return fmt.Errorf("truncate before rename: %w", err)
	}
	if err := f.Sync(); err != nil {
		return fmt.Errorf("flush overwrite pass: %w", err)
	}
	if err := p.check(); err != nil {
		return err
	}
	if err := renameThreeTimes(h, p.handles[len(p.handles)-1], p.leaf); err != nil {
		return fmt.Errorf("randomize file name: %w", err)
	}
	disposition := [4]byte{1}
	if err := windows.SetFileInformationByHandle(h, windows.FileDispositionInfo, &disposition[0], uint32(len(disposition))); err != nil {
		_ = renameRelative(h, p.handles[len(p.handles)-1], p.leaf)
		return fmt.Errorf("mark file for deletion: %w", err)
	}
	if err := f.Close(); err != nil {
		return fmt.Errorf("close cleaned file: %w", err)
	}
	return nil
}

func sectorSize(file, root windows.Handle) (uint32, error) {
	// FILE_ALIGNMENT_INFO reports the file/device alignment mask; combine it
	// with the logical sector size reported for the verified volume root.
	var alignment uint32
	if err := windows.GetFileInformationByHandleEx(file, windows.FileAlignmentInfo, (*byte)(unsafe.Pointer(&alignment)), uint32(unsafe.Sizeof(alignment))); err != nil {
		return 0, errors.New("unable to query no-buffering alignment")
	}
	rootPath := make([]uint16, 512)
	n, err := windows.GetFinalPathNameByHandle(root, &rootPath[0], uint32(len(rootPath)), 0)
	if err != nil || n >= uint32(len(rootPath)) {
		return 0, errors.New("unable to resolve verified volume root for alignment")
	}
	rootName, err := windows.UTF16PtrFromString(windows.UTF16ToString(rootPath[:n]))
	if err != nil {
		return 0, errors.New("unable to resolve verified volume root for alignment")
	}
	var sectorsPerCluster, bytesPerSector, freeClusters, totalClusters uint32
	proc := windows.NewLazySystemDLL("kernel32.dll").NewProc("GetDiskFreeSpaceW")
	result, _, callErr := proc.Call(uintptr(unsafe.Pointer(rootName)), uintptr(unsafe.Pointer(&sectorsPerCluster)), uintptr(unsafe.Pointer(&bytesPerSector)), uintptr(unsafe.Pointer(&freeClusters)), uintptr(unsafe.Pointer(&totalClusters)))
	runtime.KeepAlive(rootName)
	if result == 0 {
		return 0, fmt.Errorf("unable to query verified volume sector size at %q: %w", windows.UTF16ToString(rootPath[:n]), callErr)
	}
	sector := bytesPerSector
	if aligned := alignment + 1; aligned > sector {
		sector = aligned
	}
	if sector < 512 || sector > 65536 || sector&(sector-1) != 0 {
		return 0, fmt.Errorf("unsupported no-buffering sector/alignment (%d/%d)", bytesPerSector, alignment)
	}
	return sector, nil
}

func renameThreeTimes(file, parent windows.Handle, original string) error {
	current := ""
	for i := 0; i < 3; i++ {
		var nonce [16]byte
		if _, err := rand.Read(nonce[:]); err != nil {
			if current != "" {
				_ = renameRelative(file, parent, original)
			}
			return err
		}
		name := ".zodiac-wipe-" + fmt.Sprintf("%x", nonce[:]) + ".tmp"
		if err := renameRelative(file, parent, name); err != nil {
			if current != "" {
				_ = renameRelative(file, parent, original)
			}
			return err
		}
		current = name
	}
	return nil
}

type fileRenameInfo struct {
	ReplaceIfExists uint8
	RootDirectory   windows.Handle
	FileNameLength  uint32
	FileName        [1]uint16
}

func renameRelative(file, parent windows.Handle, name string) error {
	parentPath := make([]uint16, 32768)
	n, err := windows.GetFinalPathNameByHandle(parent, &parentPath[0], uint32(len(parentPath)), 1)
	if err != nil || n >= uint32(len(parentPath)) {
		return errors.New("unable to resolve held parent for file rename")
	}
	fullName := strings.TrimRight(windows.UTF16ToString(parentPath[:n]), `\`) + `\` + name
	u, err := windows.UTF16FromString(fullName)
	if err != nil {
		return err
	}
	nameUnits := u[:len(u)-1]
	offset := unsafe.Offsetof(fileRenameInfo{}.FileName)
	buf := make([]byte, unsafe.Sizeof(fileRenameInfo{})+uintptr(len(nameUnits))*2)
	info := (*fileRenameInfo)(unsafe.Pointer(&buf[0]))
	info.RootDirectory = 0
	info.FileNameLength = uint32(len(nameUnits) * 2)
	copy(unsafe.Slice((*uint16)(unsafe.Pointer(&buf[offset])), len(nameUnits)), nameUnits)
	return windows.SetFileInformationByHandle(file, windows.FileRenameInfo, &buf[0], uint32(len(buf)))
}

// Validate rejects dangerous spellings BEFORE filepath.Abs can normalize them.
func Validate(path string) error {
	if path == "" || !utf8.ValidString(path) || len(path) > 240 {
		return ErrPath
	}
	p := strings.ReplaceAll(path, "/", `\`)
	if strings.HasPrefix(p, `\`) {
		return ErrPath
	} // includes root-relative, UNC and device namespaces
	if len(p) >= 2 && p[1] == ':' {
		if len(p) < 3 || p[2] != '\\' || !((p[0] >= 'A' && p[0] <= 'Z') || (p[0] >= 'a' && p[0] <= 'z')) {
			return ErrPath
		}
		p = p[3:]
	}
	for _, c := range strings.Split(p, `\`) {
		if c == "." || c == ".." {
			continue
		}
		if c == "" || strings.HasSuffix(c, ".") || strings.HasSuffix(c, " ") {
			return ErrPath
		}
		for _, r := range c {
			if r < 32 || strings.ContainsRune(`<>:"|?*`, r) {
				return ErrPath
			}
		}
		stem := strings.TrimRight(strings.ToUpper(strings.SplitN(c, ".", 2)[0]), " .")
		if stem == "CON" || stem == "PRN" || stem == "AUX" || stem == "NUL" || stem == "CLOCK$" || stem == "CONIN$" || stem == "CONOUT$" {
			return ErrPath
		}
		if strings.HasPrefix(stem, "COM") || strings.HasPrefix(stem, "LPT") {
			suffix := strings.TrimPrefix(strings.TrimPrefix(stem, "COM"), "LPT")
			if len(suffix) == 1 && suffix[0] >= '1' && suffix[0] <= '9' || suffix == "¹" || suffix == "²" || suffix == "³" {
				return ErrPath
			}
		}
	}
	return nil
}

type parents struct {
	handles []windows.Handle
	volume  uint32
	leaf    string
}

func (p *parents) check() error {
	for _, h := range p.handles {
		if _, err := info(h, true, p.volume); err != nil {
			return err
		}
	}
	return nil
}

func (p *parents) close() {
	for i := len(p.handles) - 1; i >= 0; i-- {
		windows.CloseHandle(p.handles[i])
	}
	p.handles = nil
}
func info(h windows.Handle, dir bool, volume uint32) (windows.ByHandleFileInformation, error) {
	var i windows.ByHandleFileInformation
	kind, err := windows.GetFileType(h)
	if err != nil || kind != windows.FILE_TYPE_DISK {
		return i, ErrPath
	}
	if windows.GetFileInformationByHandle(h, &i) != nil || i.FileAttributes&windows.FILE_ATTRIBUTE_REPARSE_POINT != 0 || (i.FileAttributes&windows.FILE_ATTRIBUTE_DIRECTORY != 0) != dir || volume != 0 && i.VolumeSerialNumber != volume {
		return i, ErrPath
	}
	if !dir && i.NumberOfLinks != 1 {
		return i, ErrPath
	}
	return i, nil
}
func relative(parent windows.Handle, name string, access, disposition, options uint32, sd *windows.SECURITY_DESCRIPTOR, share uint32) (windows.Handle, error) {
	u, err := windows.NewNTUnicodeString(name)
	if err != nil {
		return 0, err
	}
	attrs := windows.OBJECT_ATTRIBUTES{Length: uint32(unsafe.Sizeof(windows.OBJECT_ATTRIBUTES{})), RootDirectory: parent, ObjectName: u, Attributes: windows.OBJ_CASE_INSENSITIVE | windows.OBJ_DONT_REPARSE, SecurityDescriptor: sd}
	var h windows.Handle
	var status windows.IO_STATUS_BLOCK
	err = windows.NtCreateFile(&h, access, &attrs, &status, nil, windows.FILE_ATTRIBUTE_NORMAL, share, disposition, options|windows.FILE_OPEN_REPARSE_POINT|windows.FILE_SYNCHRONOUS_IO_NONALERT, 0, 0)
	runtime.KeepAlive(sd)
	runtime.KeepAlive(u)
	return h, err
}
func holdParents(path string) (*parents, error) {
	if err := Validate(path); err != nil {
		return nil, err
	}
	absolute, err := filepath.Abs(path)
	if err != nil || Validate(absolute) != nil {
		return nil, ErrPath
	}
	root := filepath.VolumeName(absolute) + `\`
	// Query the local object-manager mapping before opening any filesystem path.
	// Bind to its native disk target, avoiding drive-letter remapping races.
	drive, _ := windows.UTF16PtrFromString(strings.TrimSuffix(root, `\`))
	targetBuffer := make([]uint16, 512)
	if _, err := windows.QueryDosDevice(drive, &targetBuffer[0], uint32(len(targetBuffer))); err != nil {
		return nil, ErrPath
	}
	target := windows.UTF16ToString(targetBuffer)
	if !localDiskTarget(target) {
		return nil, ErrPath
	}
	h, err := relative(0, target+`\`, windows.GENERIC_READ|windows.FILE_READ_ATTRIBUTES|windows.FILE_LIST_DIRECTORY|windows.SYNCHRONIZE, windows.FILE_OPEN, windows.FILE_DIRECTORY_FILE, nil, windows.FILE_SHARE_READ)
	if err != nil {
		return nil, ErrPath
	}
	p := &parents{handles: []windows.Handle{h}}
	fail := func() (*parents, error) { p.close(); return nil, ErrPath }
	i, err := info(h, true, 0)
	if err != nil {
		return fail()
	}
	p.volume = i.VolumeSerialNumber
	// GUID form must be a volume root; UNC, SUBST and directory aliases fail.
	resolved := make([]uint16, 512)
	n, err := windows.GetFinalPathNameByHandle(h, &resolved[0], uint32(len(resolved)), 1)
	if err != nil || n >= uint32(len(resolved)) {
		return fail()
	}
	name := windows.UTF16ToString(resolved[:n])
	if !strings.HasPrefix(name, `\\?\Volume{`) || !strings.HasSuffix(name, `}\`) {
		return fail()
	}
	guidRoot, err := windows.UTF16PtrFromString(name)
	if err != nil || windows.GetDriveType(guidRoot) != windows.DRIVE_FIXED {
		return fail()
	}
	parts := strings.Split(strings.TrimPrefix(absolute, root), `\`)
	p.leaf = parts[len(parts)-1]
	for _, part := range parts[:len(parts)-1] {
		next, err := relative(h, part, windows.FILE_READ_ATTRIBUTES|windows.SYNCHRONIZE, windows.FILE_OPEN, windows.FILE_DIRECTORY_FILE, nil, windows.FILE_SHARE_READ)
		if err != nil {
			return fail()
		}
		p.handles = append(p.handles, next)
		h = next
		if _, err := info(h, true, p.volume); err != nil {
			return fail()
		}
	}
	return p, nil
}
func localDiskTarget(target string) bool {
	const prefix = `\Device\HarddiskVolume`
	if !strings.HasPrefix(target, prefix) {
		return false
	}
	number := strings.TrimPrefix(target, prefix)
	if len(number) == 0 || len(number) > 10 {
		return false
	}
	for _, c := range number {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}
func openRead(path string) (*os.File, func(), error) {
	p, err := holdParents(path)
	if err != nil {
		return nil, nil, err
	}
	if err := p.check(); err != nil {
		p.close()
		return nil, nil, err
	}
	h, err := relative(p.handles[len(p.handles)-1], p.leaf, windows.GENERIC_READ|windows.SYNCHRONIZE, windows.FILE_OPEN, windows.FILE_NON_DIRECTORY_FILE, nil, windows.FILE_SHARE_READ)
	if err != nil {
		p.close()
		return nil, nil, err
	}
	if _, err := info(h, false, p.volume); err != nil {
		windows.CloseHandle(h)
		p.close()
		return nil, nil, err
	}
	if err := p.check(); err != nil {
		windows.CloseHandle(h)
		p.close()
		return nil, nil, err
	}
	return os.NewFile(uintptr(h), p.leaf), p.close, nil
}
func currentSID() (*windows.SID, error) {
	token, err := windows.OpenCurrentProcessToken()
	if err != nil {
		return nil, err
	}
	defer token.Close()
	user, err := token.GetTokenUser()
	if err != nil {
		return nil, err
	}
	return user.User.Sid.Copy()
}
func verifyACL(h windows.Handle, sid *windows.SID) error {
	sd, err := windows.GetSecurityInfo(h, windows.SE_FILE_OBJECT, windows.OWNER_SECURITY_INFORMATION|windows.DACL_SECURITY_INFORMATION)
	if err != nil {
		return err
	}
	owner, _, err := sd.Owner()
	if err != nil || owner == nil || !owner.Equals(sid) {
		return ErrPath
	}
	control, _, err := sd.Control()
	if err != nil || control&windows.SE_DACL_PROTECTED == 0 {
		return ErrPath
	}
	acl, _, err := sd.DACL()
	if err != nil || acl == nil || acl.AceCount != 1 {
		return ErrPath
	}
	var ace *windows.ACCESS_ALLOWED_ACE
	if windows.GetAce(acl, 0, &ace) != nil || ace.Header.AceType != windows.ACCESS_ALLOWED_ACE_TYPE || ace.Header.AceFlags != 0 || ace.Mask != windows.ACCESS_MASK(0x001f01ff) {
		return ErrPath
	}
	granted := (*windows.SID)(unsafe.Pointer(&ace.SidStart)) // Native ACE SID layout only; no secret conversions.
	if !granted.Equals(sid) {
		return ErrPath
	}
	return nil
}
func writeWith(ctx context.Context, path string, plain []byte, write func(io.Writer, []byte) error) (result error) {
	if err := ctx.Err(); err != nil {
		return err
	}
	p, err := holdParents(path)
	if err != nil {
		return err
	}
	defer p.close()
	sid, err := currentSID()
	if err != nil {
		return err
	}
	sd, err := windows.SecurityDescriptorFromString("O:" + sid.String() + "D:P(A;;FA;;;" + sid.String() + ")")
	if err != nil {
		return err
	}
	var flags uint32
	if windows.GetVolumeInformationByHandle(p.handles[0], nil, 0, nil, nil, &flags, nil, 0) != nil || flags&windows.FILE_PERSISTENT_ACLS == 0 {
		return ErrPath
	}
	if err := p.check(); err != nil {
		return err
	}
	h, err := relative(p.handles[len(p.handles)-1], p.leaf, windows.GENERIC_WRITE|windows.READ_CONTROL|windows.FILE_READ_ATTRIBUTES|windows.DELETE|windows.SYNCHRONIZE, windows.FILE_CREATE, windows.FILE_NON_DIRECTORY_FILE, sd, 0)
	if err != nil {
		return err
	}
	f := os.NewFile(uintptr(h), p.leaf)
	committed := false
	defer func() {
		if !committed {
			disposition := [4]byte{1}
			result = errors.Join(result, windows.SetFileInformationByHandle(h, windows.FileDispositionInfo, &disposition[0], 4), f.Close())
			return
		}
		f.Close()
	}()
	if _, err := info(h, false, p.volume); err != nil {
		return err
	}
	if err := verifyACL(h, sid); err != nil {
		return err
	}
	if err := p.check(); err != nil {
		return err
	}
	// Mark for deletion before any plaintext write. Unlike FILE_DELETE_ON_CLOSE,
	// a disposition set on the handle can be canceled at the explicit commit.
	pending := [4]byte{1}
	if err := windows.SetFileInformationByHandle(h, windows.FileDispositionInfo, &pending[0], 4); err != nil {
		return err
	}
	if err := write(f, plain); err != nil {
		return err
	}
	if err := f.Sync(); err != nil {
		return err
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	if err := p.check(); err != nil {
		return err
	}
	// This is the commit point. Keep parents held until the private handle closes.
	disposition := [4]byte{}
	if err := windows.SetFileInformationByHandle(h, windows.FileDispositionInfo, &disposition[0], 4); err != nil {
		return err
	}
	committed = true
	if err := f.Close(); err != nil {
		return errors.New("unable to close completed output")
	}
	return nil
}
