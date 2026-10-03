package localfile

import (
	"bytes"
	"context"
	"encoding/binary"
	"errors"
	"golang.org/x/sys/windows"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"unsafe"
)

func TestDangerousWindowsNames(t *testing.T) {
	for _, s := range []string{`\\server\share\a.txt`, `//server/share/a.txt`, `\\.\pipe\test`, `\\?\C:\x`, `\\?\UNC\server\x`, `\\?\GLOBALROOT\Device\x`, `C:a.txt`, `\root.txt`, `a.txt:hidden`, `NUL`, `NUL.txt`, `a\CON.txt`, `COM1`, `LPT9.x`, `COM¹.txt`, `LPT²`, `CONIN$`, `CLOCK$`, `a.\b`, `a \b`, `a\b.`, `a\b `, "a\x00b", "a\nb", `a?b`, `a:b`, `C:\NUL\x`, `a\..\AUX.txt`} {
		if Validate(s) == nil {
			t.Errorf("accepted dangerous name %q", s)
		}
	}
	for _, s := range []string{`message.txt`, `..\fixtures\public.pem`, `C:\ordinary\message.txt`, `C:/ordinary/שלום.txt`, `not-aux.txt`} {
		if err := Validate(s); err != nil {
			t.Errorf("rejected ordinary name %q", s)
		}
	}
}
func TestPrivateOutputAndExclusiveRead(t *testing.T) {
	root := t.TempDir()
	// Deliberately permissive inheritance must not enter the output DACL.
	sd, err := windows.SecurityDescriptorFromString("D:P(A;OICI;FA;;;WD)")
	if err != nil {
		t.Fatal(err)
	}
	dacl, _, err := sd.DACL()
	if err != nil {
		t.Fatal(err)
	}
	if err := windows.SetNamedSecurityInfo(root, windows.SE_FILE_OBJECT, windows.DACL_SECURITY_INFORMATION|windows.PROTECTED_DACL_SECURITY_INFORMATION, nil, nil, dacl, nil); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(root, "message.txt")
	want := []byte("synthetic\x00שלום\r\n")
	if err := Write(context.Background(), path, want); err != nil {
		t.Fatal(err)
	}
	actual, err := Read(path, 65536)
	if err != nil || !bytes.Equal(actual, want) {
		t.Fatalf("readback failed: %v", err)
	}
	ptr, _ := windows.UTF16PtrFromString(path)
	h, err := windows.CreateFile(ptr, windows.READ_CONTROL, windows.FILE_SHARE_READ, nil, windows.OPEN_EXISTING, 0, 0)
	if err != nil {
		t.Fatal(err)
	}
	defer windows.CloseHandle(h)
	sid, err := currentSID()
	if err != nil {
		t.Fatal(err)
	}
	if err := verifyACL(h, sid); err != nil {
		t.Fatalf("private protected owner-only ACL: %v", err)
	}
	if err := Write(context.Background(), path, []byte("replacement")); err == nil {
		t.Fatal("overwrote existing output")
	}
	actual, _ = os.ReadFile(path)
	if !bytes.Equal(actual, want) {
		t.Fatal("overwrite changed bytes")
	}
	if _, err := Read(path, 2); !errors.Is(err, ErrLimit) {
		t.Fatal("unbounded input read")
	}
}
func TestCancelAndFailedWriteRemoveByHandle(t *testing.T) {
	for _, mode := range []string{"failure", "cancel", "empty"} {
		t.Run(mode, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "message.txt")
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			err := writeWith(ctx, path, []byte("synthetic"), func(w io.Writer, b []byte) error {
				if mode == "empty" {
					return nil
				}
				_, err := w.Write(b[:3])
				if err != nil {
					return err
				}
				if mode == "cancel" {
					cancel()
					return nil
				}
				return io.ErrShortWrite
			})
			if mode == "empty" {
				if err != nil {
					t.Fatal(err)
				}
				b, readError := os.ReadFile(path)
				if readError != nil || len(b) != 0 {
					t.Fatal("empty output changed")
				}
				return
			}
			if err == nil {
				t.Fatal("failed/canceled write succeeded")
			}
			if _, err := os.Stat(path); !os.IsNotExist(err) {
				t.Fatal("partial plaintext persisted")
			}
		})
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	path := filepath.Join(t.TempDir(), "never.txt")
	if !errors.Is(Write(ctx, path, nil), context.Canceled) {
		t.Fatal("pre-cancel ignored")
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatal("pre-cancel created file")
	}
}
func TestParentJunctionAndSwap(t *testing.T) {
	root := t.TempDir()
	original := filepath.Join(root, "original")
	target := filepath.Join(root, "target")
	junction := filepath.Join(root, "junction")
	for _, path := range []string{original, target} {
		if err := os.Mkdir(path, 0700); err != nil {
			t.Fatal(err)
		}
	}
	// Test-only creation of a junction needs no symlink privilege. No production subprocess.
	if output, err := exec.Command("cmd.exe", "/c", "mklink", "/J", junction, target).CombinedOutput(); err != nil {
		t.Fatalf("junction fixture: %s %v", output, err)
	}
	if err := Write(context.Background(), filepath.Join(junction, "escape.txt"), []byte("synthetic")); err == nil {
		t.Fatal("parent junction escaped")
	}
	if err := os.WriteFile(filepath.Join(target, "input.txt"), []byte("synthetic"), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := Read(filepath.Join(junction, "input.txt"), 100); err == nil {
		t.Fatal("input traversed parent junction")
	}
	err := writeWith(context.Background(), filepath.Join(original, "message.txt"), []byte("synthetic"), func(w io.Writer, b []byte) error {
		if err := os.Rename(original, filepath.Join(root, "swapped")); err == nil {
			t.Fatal("held parent was renamed")
		}
		_, err := w.Write(b)
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(target, "escape.txt")); !os.IsNotExist(err) {
		t.Fatal("created outside parent")
	}
	if err := Write(context.Background(), original, nil); err == nil {
		t.Fatal("directory destination accepted")
	}
	if _, err := Read(original, 100); err == nil {
		t.Fatal("directory input accepted")
	}
}

// Native test-only mount-point buffer, unrelated to cryptographic ASN.1.
func setJunction(path, target string) error {
	ptr, _ := windows.UTF16PtrFromString(path)
	h, err := windows.CreateFile(ptr, windows.GENERIC_WRITE, windows.FILE_SHARE_READ|windows.FILE_SHARE_WRITE|windows.FILE_SHARE_DELETE, nil, windows.OPEN_EXISTING, windows.FILE_FLAG_BACKUP_SEMANTICS|windows.FILE_FLAG_OPEN_REPARSE_POINT, 0)
	if err != nil {
		return err
	}
	defer windows.CloseHandle(h)
	substitute, _ := windows.UTF16FromString(`\??\` + target)
	printName, _ := windows.UTF16FromString(target)
	data := make([]byte, 16+2*(len(substitute)+len(printName)))
	binary.LittleEndian.PutUint32(data, windows.IO_REPARSE_TAG_MOUNT_POINT)
	binary.LittleEndian.PutUint16(data[4:], uint16(len(data)-8))
	binary.LittleEndian.PutUint16(data[10:], uint16((len(substitute)-1)*2))
	binary.LittleEndian.PutUint16(data[12:], uint16(len(substitute)*2))
	binary.LittleEndian.PutUint16(data[14:], uint16((len(printName)-1)*2))
	for i, v := range append(substitute, printName...) {
		binary.LittleEndian.PutUint16(data[16+i*2:], v)
	}
	var returned uint32
	return windows.DeviceIoControl(h, windows.FSCTL_SET_REPARSE_POINT, &data[0], uint32(len(data)), nil, 0, &returned, nil)
}
func TestReparseMutationOfHeldEmptyParent(t *testing.T) {
	root := t.TempDir()
	parent := filepath.Join(root, "parent")
	target := filepath.Join(root, "target")
	for _, path := range []string{parent, target} {
		if err := os.Mkdir(path, 0700); err != nil {
			t.Fatal(err)
		}
	}
	p, err := holdParents(filepath.Join(parent, "message.txt"))
	if err != nil {
		t.Fatal(err)
	}
	defer p.close()
	if err := setJunction(parent, target); err != nil {
		t.Logf("OS rejected mutation of held directory: %v", err)
		return
	}
	if p.check() == nil {
		t.Fatal("held-parent mutation was not detected")
	}
	h, err := relative(p.handles[len(p.handles)-1], p.leaf, windows.GENERIC_WRITE|windows.SYNCHRONIZE, windows.FILE_CREATE, windows.FILE_NON_DIRECTORY_FILE, nil, 0)
	if err == nil {
		windows.CloseHandle(h)
	} // If allowed, it stays anchored to the held directory.
	if _, err := os.Stat(filepath.Join(target, "message.txt")); !os.IsNotExist(err) {
		t.Fatal("relative handle escaped to junction target")
	}
}

func TestFinalReparseHardlinkAndMappedAlias(t *testing.T) {
	root := t.TempDir()
	target := filepath.Join(root, "target.txt")
	link := filepath.Join(root, "link.txt")
	if err := os.WriteFile(target, []byte("synthetic"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.Link(target, link); err != nil {
		t.Fatal(err)
	}
	if _, err := Read(link, 100); err == nil {
		t.Fatal("hardlink input alias accepted")
	}
	if err := Write(context.Background(), link, []byte("replacement")); err == nil {
		t.Fatal("hardlink destination accepted")
	}
	if actual, _ := os.ReadFile(target); string(actual) != "synthetic" {
		t.Fatal("hardlink target modified")
	}
	// A junction is also rejected when it is the final component, not just a parent.
	junction := filepath.Join(root, "final-junction")
	if output, err := exec.Command("cmd.exe", "/c", "mklink", "/J", junction, root).CombinedOutput(); err != nil {
		t.Fatalf("junction fixture: %s %v", output, err)
	}
	if _, err := Read(junction, 100); err == nil {
		t.Fatal("final reparse input accepted")
	}
	if err := Write(context.Background(), junction, nil); err == nil {
		t.Fatal("final reparse output accepted")
	}
	// Test a mapped DOS alias without contacting any network. A locally mapped
	// directory reports a fixed drive; the resolved root-handle check rejects it.
	define := windows.NewLazySystemDLL("kernel32.dll").NewProc("DefineDosDeviceW")
	drives, err := windows.GetLogicalDrives()
	if err != nil {
		t.Fatal(err)
	}
	var letter byte
	for c := byte('Z'); c >= 'D'; c-- {
		if drives&(1<<uint(c-'A')) == 0 {
			letter = c
			break
		}
	}
	if letter == 0 {
		t.Fatal("no free drive for alias fixture")
	}
	device, _ := windows.UTF16PtrFromString(string([]byte{letter, ':'}))
	destination, _ := windows.UTF16PtrFromString(`\??\` + root)
	const rawTarget = 1
	const removeDefinition = 2
	const exactMatch = 4
	const noBroadcast = 8
	ok, _, nativeErr := define.Call(rawTarget|noBroadcast, uintptr(unsafe.Pointer(device)), uintptr(unsafe.Pointer(destination)))
	if ok == 0 {
		t.Fatalf("local mapped alias setup: %v", nativeErr)
	}
	defer func() {
		ok, _, err := define.Call(rawTarget|removeDefinition|exactMatch|noBroadcast, uintptr(unsafe.Pointer(device)), uintptr(unsafe.Pointer(destination)))
		if ok == 0 {
			t.Errorf("mapped alias cleanup: %v", err)
		}
	}()
	if err := Write(context.Background(), string([]byte{letter, ':', '\\'})+"escape.txt", []byte("synthetic")); err == nil {
		t.Fatal("mapped directory alias accepted")
	}
	if _, err := os.Stat(filepath.Join(root, "escape.txt")); !os.IsNotExist(err) {
		t.Fatal("mapped alias created file")
	}
}
