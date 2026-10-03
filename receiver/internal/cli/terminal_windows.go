//go:build windows

package cli

import (
	"context"
	"golang.org/x/sys/windows"
	"os"
	"runtime"
	"time"
)

func openTerminal() (*os.File, *os.File, error) {
	input, err := os.OpenFile("CONIN$", os.O_RDWR, 0)
	if err != nil {
		return nil, nil, err
	}
	output, err := os.OpenFile("CONOUT$", os.O_WRONLY, 0)
	if err != nil {
		input.Close()
		return nil, nil, err
	}
	return input, output, nil
}

var cancelSynchronousIO = windows.NewLazySystemDLL("kernel32.dll").NewProc("CancelSynchronousIo")

func runTerminalReader(ctx context.Context, input *os.File, requests <-chan struct{}, events chan<- inputEvent) {
	// ReadConsole is synchronous. Keep its worker on one OS thread so cancellation
	// can interrupt that specific pending read; CancelIoEx is not sufficient here.
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	thread, err := windows.OpenThread(windows.THREAD_TERMINATE, false, windows.GetCurrentThreadId())
	if err != nil {
		readEvents(ctx, requests, events, func([]byte) (int, error) { return 0, err })
		return
	}
	done := make(chan struct{})
	cancelDone := make(chan struct{})
	go func() {
		defer close(cancelDone)
		select {
		case <-done:
			return
		case <-ctx.Done():
		}
		ticker := time.NewTicker(20 * time.Millisecond)
		defer ticker.Stop()
		for {
			select {
			case <-done:
				return
			default:
			}
			// ERROR_NOT_FOUND simply means the demanded read has not started/has ended.
			cancelSynchronousIO.Call(uintptr(thread))
			select {
			case <-done:
				return
			case <-ticker.C:
			}
		}
	}()
	defer func() { close(done); <-cancelDone; windows.CloseHandle(thread) }()
	readEvents(ctx, requests, events, input.Read)
}
