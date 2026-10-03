// Package localfile confines receiver I/O to ordinary local disk files.
// Windows is the supported receiver platform. Other platforms fail closed
// until equivalent filesystem protections have their own evidence.
package localfile

import (
	"context"
	"errors"
	"io"
)

var ErrPath = errors.New("path must name an ordinary local disk file without aliases or redirection")
var ErrLimit = errors.New("file exceeds input limit")

func Read(path string, limit int) ([]byte, error) {
	f, release, err := openRead(path)
	if err != nil {
		return nil, err
	}
	defer release()
	defer f.Close()
	b, err := io.ReadAll(io.LimitReader(f, int64(limit)+1))
	if err != nil {
		clear(b)
		return nil, err
	}
	if len(b) > limit {
		clear(b)
		return nil, ErrLimit
	}
	return b, nil
}

// Write creates a new private file only when its caller has authenticated all
// bytes. A failed/canceled write is removed by handle, never by a racy pathname.
func Write(ctx context.Context, path string, plain []byte) error {
	return writeWith(ctx, path, plain, func(w io.Writer, b []byte) error {
		for len(b) > 0 {
			if err := ctx.Err(); err != nil {
				return err
			}
			n := min(len(b), 4096)
			written, err := w.Write(b[:n])
			if err != nil {
				return err
			}
			if written != n {
				return io.ErrShortWrite
			}
			b = b[n:]
		}
		return nil
	})
}
