package cli

import (
	"bytes"
	"context"
	"testing"
	"zodiac-modern/receiver/internal/keyfile"
)

func inputEvents(input []byte) <-chan inputEvent {
	events := make(chan inputEvent, len(input))
	for _, b := range input {
		events <- inputEvent{value: b}
	}
	close(events)
	return events
}
func TestPasswordInput(t *testing.T) {
	for _, test := range []struct{ input, want string }{{"synthetic\r", "synthetic"}, {"  spaced  \n", "  spaced  "}, {"é\x7fX\r", "X"}, {"emoji 🔑\n", "emoji 🔑"}, {"\r", ""}} {
		password, err := readPassword(context.Background(), inputEvents([]byte(test.input)))
		if err != nil || string(password) != test.want {
			t.Fatal("exact input/backspace failed")
		}
		clear(password)
	}
	password, err := readPassword(context.Background(), inputEvents(append(bytes.Repeat([]byte{'x'}, keyfile.MaxPasswordBytes), '\r')))
	if err != nil || len(password) != keyfile.MaxPasswordBytes {
		t.Fatal("boundary rejected")
	}
	clear(password)
	if _, err := readPassword(context.Background(), inputEvents(bytes.Repeat([]byte{'x'}, keyfile.MaxPasswordBytes+1))); err != ErrPassword {
		t.Fatal("oversize input accepted")
	}
	for _, cancel := range []byte{3, 4, 26, 27} {
		if _, err := readPassword(context.Background(), inputEvents([]byte{'x', cancel})); err != ErrCanceled {
			t.Fatal("cancel ignored")
		}
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := readPassword(ctx, make(chan inputEvent)); err != ErrCanceled {
		t.Fatal("context cancellation ignored")
	}
}
