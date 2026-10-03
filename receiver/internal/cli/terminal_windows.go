//go:build windows

package cli

import (
	"context"
	"errors"
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
var flushConsoleInput = windows.NewLazySystemDLL("kernel32.dll").NewProc("FlushConsoleInputBuffer")

func configureTerminalInput(input *os.File) error {
	var mode uint32
	if err := windows.GetConsoleMode(windows.Handle(input.Fd()), &mode); err != nil {
		return err
	}
	// MakeRaw enables VT input. This byte-oriented hidden prompt does not edit
	// with navigation keys: let ReadConsole ignore them instead of emitting ESC.
	return windows.SetConsoleMode(windows.Handle(input.Fd()), mode&^windows.ENABLE_VIRTUAL_TERMINAL_INPUT)
}

func cancelResult(result uintptr, err error) error {
	if result != 0 || errors.Is(err, windows.ERROR_NOT_FOUND) {
		return nil
	}
	if err == nil || errors.Is(err, windows.ERROR_SUCCESS) {
		return ErrTerminalIO
	}
	return err
}

func flushTerminalInput(input *os.File) error {
	result, _, err := flushConsoleInput.Call(input.Fd())
	if result == 0 {
		return err
	}
	return nil
}

func runTerminalReader(ctx context.Context, input *os.File, requests <-chan struct{}, events chan<- inputEvent) error {
	// ReadConsole is synchronous. Keep its worker on one OS thread so cancellation
	// can interrupt that specific pending read; CancelIoEx is not sufficient here.
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	thread, err := windows.OpenThread(windows.THREAD_TERMINATE, false, windows.GetCurrentThreadId())
	if err != nil {
		readEvents(ctx, requests, events, func([]byte) (int, error) { return 0, err })
		return err
	}
	defer windows.CloseHandle(thread)
	return runWindowsReader(ctx, requests, events, input.Read, func() error {
		result, _, err := cancelSynchronousIO.Call(uintptr(thread))
		return cancelResult(result, err)
	})
}

func runWindowsReader(ctx context.Context, requests <-chan struct{}, events chan<- inputEvent, read func([]byte) (int, error), cancelRead func() error) error {
	done := make(chan struct{})
	cancelDone := make(chan error, 1)
	go func() {
		cancelDone <- cancelPendingRead(ctx, done, cancelRead)
	}()
	readEvents(ctx, requests, events, read)
	close(done)
	// Never restore/return while the synchronous reader is still running.
	return <-cancelDone
}

func cancelPendingRead(ctx context.Context, done <-chan struct{}, cancelRead func() error) error {
	select {
	case <-done:
		return nil
	case <-ctx.Done():
	}
	ticker := time.NewTicker(20 * time.Millisecond)
	defer ticker.Stop()
	var firstFailure error
	for {
		select {
		case <-done:
			return firstFailure
		default:
		}
		if err := cancelRead(); err != nil && firstFailure == nil {
			firstFailure = err
		}
		select {
		case <-done:
			return firstFailure
		case <-ticker.C:
		}
	}
}
