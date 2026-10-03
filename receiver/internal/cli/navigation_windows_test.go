//go:build windows

package cli

import (
	"context"
	"errors"
	"os"
	"reflect"
	"testing"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
	"golang.org/x/term"
)

// Only synthetic console events in an opt-in disposable native test console.
// This is the Win32 INPUT_RECORD/KEY_EVENT_RECORD layout, not secret conversion.
type syntheticKeyRecord struct {
	eventType, padding                           uint16
	keyDown                                      int32
	repeatCount, virtualKey, scanCode, character uint16
	controlState                                 uint32
}

func TestNativeConsoleNavigation(t *testing.T) {
	if os.Getenv("ZODIAC_TEST_CONSOLE") != "1" {
		t.Skip("run explicitly in a disposable Windows controlling terminal")
	}
	if unsafe.Sizeof(syntheticKeyRecord{}) != 20 {
		t.Fatal("unexpected native INPUT_RECORD layout")
	}
	input, output, err := openTerminal()
	if err != nil {
		t.Fatal(err)
	}
	defer input.Close()
	defer output.Close()
	before, err := term.GetState(int(input.Fd()))
	if err != nil {
		t.Fatal(err)
	}
	writeInput := windows.NewLazySystemDLL("kernel32.dll").NewProc("WriteConsoleInputW")
	for _, test := range []struct {
		name string
		keys [][2]uint16
		want string
		err  error
	}{
		{"navigation", [][2]uint16{{0x41, 'a'}, {0x42, 'b'}, {0x25, 0}, {0x26, 0}, {0x27, 0}, {0x28, 0}, {0x24, 0}, {0x23, 0}, {0x2e, 0}, {0x43, 'c'}, {0x0d, '\r'}}, "abc", nil},
		{"control-c", [][2]uint16{{0x41, 'a'}, {0x43, 3}}, "", ErrCanceled},
	} {
		t.Run(test.name, func(t *testing.T) {
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			injected := make(chan error, 1)
			go func() {
				for {
					var mode uint32
					if err := windows.GetConsoleMode(windows.Handle(input.Fd()), &mode); err != nil {
						injected <- err
						return
					}
					if mode&(windows.ENABLE_VIRTUAL_TERMINAL_INPUT|windows.ENABLE_ECHO_INPUT|windows.ENABLE_LINE_INPUT) == 0 {
						break
					}
					select {
					case <-ctx.Done():
						injected <- ctx.Err()
						return
					case <-time.After(time.Millisecond):
					}
				}
				records := make([]syntheticKeyRecord, 0, len(test.keys)*2)
				for _, key := range test.keys {
					record := syntheticKeyRecord{eventType: windows.KEY_EVENT, keyDown: 1, repeatCount: 1, virtualKey: key[0], character: key[1]}
					if key[1] == 0 {
						record.controlState = windows.ENHANCED_KEY
					}
					if key[1] == 3 {
						record.controlState = windows.LEFT_CTRL_PRESSED
					}
					records = append(records, record)
					record.keyDown = 0
					records = append(records, record)
				}
				var written uint32
				result, _, nativeErr := writeInput.Call(input.Fd(), uintptr(unsafe.Pointer(&records[0])), uintptr(len(records)), uintptr(unsafe.Pointer(&written)))
				if result == 0 {
					injected <- nativeErr
					return
				}
				if int(written) != len(records) {
					injected <- errors.New("incomplete synthetic console injection")
					return
				}
				injected <- nil
			}()
			started := time.Now()
			password, promptErr := Prompt(ctx)
			defer clear(password)
			if err := <-injected; err != nil {
				t.Fatal(err)
			}
			if !errors.Is(promptErr, test.err) || string(password) != test.want || time.Since(started) > time.Second {
				t.Fatal("navigation/control-C behavior incorrect or timed out")
			}
			after, err := term.GetState(int(input.Fd()))
			if err != nil || !reflect.DeepEqual(before, after) {
				t.Fatal("terminal settings were not restored")
			}
		})
	}
}
