//go:build windows

package cli

import (
	"context"
	"os"
	"reflect"
	"testing"
	"time"

	"golang.org/x/term"
)

// Opt-in, real controlling-console integration. No password is entered or read
// from the environment. Ordinary offline/CI tests never consume console input.
func TestNativeConsoleContextCancellation(t *testing.T) {
	if os.Getenv("ZODIAC_TEST_CONSOLE") != "1" {
		t.Skip("run explicitly in a disposable Windows controlling terminal")
	}
	input, output, err := openTerminal()
	if err != nil {
		t.Fatal("controlling console unavailable")
	}
	defer input.Close()
	defer output.Close()
	before, err := term.GetState(int(input.Fd()))
	if err != nil {
		t.Fatal("cannot inspect terminal state")
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	started := time.Now()
	password, promptErr := Prompt(ctx)
	defer clear(password)
	if promptErr != ErrCanceled || password != nil {
		t.Fatal("blocked console read did not cancel cleanly")
	}
	if time.Since(started) > 3*time.Second {
		t.Fatal("console cancellation exceeded bound")
	}
	after, err := term.GetState(int(input.Fd()))
	if err != nil || !reflect.DeepEqual(before, after) {
		t.Fatal("terminal settings were not restored")
	}
	t.Logf("blocked native console read canceled and settings restored in %s", time.Since(started))
}
