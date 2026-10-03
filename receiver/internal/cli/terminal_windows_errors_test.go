//go:build windows

package cli

import (
	"context"
	"errors"
	"io"
	"testing"
	"time"

	"golang.org/x/sys/windows"
)

func TestCancelSynchronousResult(t *testing.T) {
	for _, test := range []struct {
		result uintptr
		err    error
		want   error
	}{
		{1, windows.ERROR_ACCESS_DENIED, nil}, // successful BOOL ignores stale last error
		{0, windows.ERROR_NOT_FOUND, nil},
		{0, windows.ERROR_ACCESS_DENIED, windows.ERROR_ACCESS_DENIED},
		{0, windows.ERROR_INVALID_HANDLE, windows.ERROR_INVALID_HANDLE},
		{0, nil, ErrTerminalIO},
		{0, windows.ERROR_SUCCESS, ErrTerminalIO},
	} {
		if actual := cancelResult(test.result, test.err); !errors.Is(actual, test.want) {
			t.Fatalf("cancel result %d/%v: got %v, want %v", test.result, test.err, actual, test.want)
		}
	}
}

func TestUnexpectedCancellationWaitsForReader(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	requests := make(chan struct{}, 1)
	requests <- struct{}{}
	started := make(chan struct{})
	release := make(chan struct{})
	called := make(chan struct{}, 1)
	done := make(chan error, 1)
	go func() {
		done <- runWindowsReader(ctx, requests, make(chan inputEvent), func([]byte) (int, error) {
			close(started)
			<-release
			return 0, io.EOF
		}, func() error {
			select {
			case called <- struct{}{}:
			default:
			}
			return cancelResult(0, windows.ERROR_ACCESS_DENIED)
		})
	}()
	<-started
	cancel()
	select {
	case <-called:
	case <-time.After(time.Second):
		close(release)
		t.Fatal("cancellation not attempted")
	}
	select {
	case <-done:
		close(release)
		t.Fatal("returned before the blocked reader ended")
	default:
	}
	close(release)
	select {
	case err := <-done:
		if !errors.Is(err, windows.ERROR_ACCESS_DENIED) {
			t.Fatal("unexpected native cancellation failure lost")
		}
	case <-time.After(time.Second):
		t.Fatal("reader did not finish after release")
	}
}
