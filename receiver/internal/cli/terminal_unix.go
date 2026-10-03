//go:build !windows

package cli

import (
	"context"
	"golang.org/x/sys/unix"
	"os"
)

func openTerminal() (*os.File, *os.File, error) {
	input, err := os.OpenFile("/dev/tty", os.O_RDWR, 0)
	if err != nil {
		return nil, nil, err
	}
	output, err := os.OpenFile("/dev/tty", os.O_WRONLY, 0)
	if err != nil {
		input.Close()
		return nil, nil, err
	}
	return input, output, nil
}

func runTerminalReader(ctx context.Context, input *os.File, requests <-chan struct{}, events chan<- inputEvent) {
	fd := int(input.Fd())
	err := unix.SetNonblock(fd, true)
	readEvents(ctx, requests, events, func(buffer []byte) (int, error) {
		if err != nil {
			return 0, err
		}
		for {
			if ctx.Err() != nil {
				return 0, ctx.Err()
			}
			ready := []unix.PollFd{{Fd: int32(fd), Events: unix.POLLIN}}
			if _, err := unix.Poll(ready, 50); err != nil && err != unix.EINTR {
				return 0, err
			}
			if ready[0].Revents&unix.POLLIN == 0 {
				continue
			}
			n, err := unix.Read(fd, buffer)
			if err == unix.EAGAIN || err == unix.EINTR {
				continue
			}
			return n, err
		}
	})
}
