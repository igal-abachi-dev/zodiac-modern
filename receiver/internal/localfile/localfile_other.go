//go:build !windows

package localfile

import (
	"context"
	"io"
	"os"
)

func Validate(string) error                                                          { return ErrPath }
func openRead(string) (*os.File, func(), error)                                      { return nil, nil, ErrPath }
func writeWith(context.Context, string, []byte, func(io.Writer, []byte) error) error { return ErrPath }
