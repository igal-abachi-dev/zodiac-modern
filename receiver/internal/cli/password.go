package cli

import (
	"context"
	"errors"
	"golang.org/x/term"
	"io"
	"runtime"
	"unicode/utf8"
	"zodiac-modern/receiver/internal/keyfile"
)

var ErrCanceled = errors.New("operation canceled")
var ErrTerminal = errors.New("a controlling terminal is required; run this command in an interactive terminal")
var ErrPassword = errors.New("passphrase must be at most 1024 bytes")

// Prompt never reads a password from argv, environment or piped stdin.
// Raw mode lets the owned byte buffer remain bounded before accepting input.
func Prompt(ctx context.Context) (password []byte, err error) {
	input, output, err := openTerminal()
	if err != nil {
		return nil, ErrTerminal
	}
	defer input.Close()
	defer output.Close()
	fd := int(input.Fd())
	if !term.IsTerminal(fd) {
		return nil, ErrTerminal
	}
	state, err := term.MakeRaw(fd)
	if err != nil {
		return nil, ErrTerminal
	}
	defer func() {
		flushErr := flushTerminalInput(input)
		restoreErr := term.Restore(fd, state)
		if flushErr != nil || restoreErr != nil {
			clear(password)
			runtime.KeepAlive(password)
			password = nil
			err = ErrTerminal
		}
	}()
	if configureTerminalInput(input) != nil {
		return nil, ErrTerminal
	}
	if _, err := io.WriteString(output, "Private key passphrase (hidden): "); err != nil {
		return nil, ErrTerminal
	}
	defer io.WriteString(output, "\r\n")
	events := make(chan inputEvent)
	requests := make(chan struct{})
	readerDone := make(chan error, 1)
	readerCtx, cancel := context.WithCancel(ctx)
	defer func() {
		cancel()
		if readerErr := <-readerDone; readerErr != nil {
			clear(password)
			runtime.KeepAlive(password)
			password = nil
			err = ErrTerminal
		}
	}()
	go func() { readerDone <- runTerminalReader(readerCtx, input, requests, events) }()
	return readPasswordWithRequests(ctx, events, requests)
}

type inputEvent struct {
	value byte
	err   error
}

func readPassword(ctx context.Context, events <-chan inputEvent) (password []byte, err error) {
	return readPasswordWithRequests(ctx, events, nil)
}
func readPasswordWithRequests(ctx context.Context, events <-chan inputEvent, requests chan<- struct{}) (password []byte, err error) {
	buffer := make([]byte, keyfile.MaxPasswordBytes)
	used := 0
	overflow := false
	defer func() {
		if err != nil {
			clear(buffer)
			runtime.KeepAlive(buffer)
		}
	}()
	for {
		if requests != nil {
			select {
			case <-ctx.Done():
				return nil, ErrCanceled
			case requests <- struct{}{}:
			}
		}
		select {
		case <-ctx.Done():
			return nil, ErrCanceled
		case event, ok := <-events:
			if !ok || event.err != nil {
				return nil, ErrCanceled
			}
			switch event.value {
			case '\r', '\n':
				if overflow {
					return nil, ErrPassword
				}
				return buffer[:used], nil
			case 3, 4, 26, 27:
				return nil, ErrCanceled
			case 8, 127:
				if overflow {
					continue
				}
				if used > 0 {
					_, size := utf8.DecodeLastRune(buffer[:used])
					clear(buffer[used-size : used])
					used -= size
				}
			default:
				if used == len(buffer) {
					overflow = true
					continue
				}
				if overflow {
					continue
				}
				buffer[used] = event.value
				used++
			}
		}
	}
}

func readEvents(ctx context.Context, requests <-chan struct{}, events chan<- inputEvent, read func([]byte) (int, error)) {
	var one [1]byte
	defer func() { clear(one[:]); runtime.KeepAlive(one) }()
	for {
		select {
		case <-ctx.Done():
			return
		case <-requests:
		}
		if ctx.Err() != nil {
			return
		}
		n, err := read(one[:])
		event := inputEvent{err: err}
		if n != 0 {
			event.value = one[0]
		}
		select {
		case events <- event:
		case <-ctx.Done():
			return
		}
		event.value = 0
		clear(one[:])
		if err != nil {
			return
		}
	}
}
