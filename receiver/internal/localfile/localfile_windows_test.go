package localfile

import (
	"bytes"
	"context"
	"errors"
	"golang.org/x/sys/windows"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
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
	path := filepath.Join(t.TempDir(), "message.txt")
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
