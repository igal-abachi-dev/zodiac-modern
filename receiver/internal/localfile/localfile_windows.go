package localfile

import (
	"context"
	"errors"
	"golang.org/x/sys/windows"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"unicode/utf8"
	"unsafe"
)

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
	rootPtr, err := windows.UTF16PtrFromString(root)
	if err != nil || windows.GetDriveType(rootPtr) != windows.DRIVE_FIXED {
		return nil, ErrPath
	}
	h, err := windows.CreateFile(rootPtr, windows.FILE_READ_ATTRIBUTES|windows.SYNCHRONIZE, windows.FILE_SHARE_READ, nil, windows.OPEN_EXISTING, windows.FILE_FLAG_BACKUP_SEMANTICS|windows.FILE_FLAG_OPEN_REPARSE_POINT, 0)
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
func openRead(path string) (*os.File, func(), error) {
	p, err := holdParents(path)
	if err != nil {
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
