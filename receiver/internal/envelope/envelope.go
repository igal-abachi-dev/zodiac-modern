// Package envelope consumes only the released raw hybrid envelope. It does not
// read files, unlock keys, release unauthenticated bytes or print plaintext.
package envelope

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"runtime"
	"unicode/utf8"
)

const MaxPlaintext = 65536
const MaxBytes = 512 + 12 + 16 + MaxPlaintext
const MaxRaw = (MaxBytes*8 + 5) / 6

var ErrInput = errors.New("invalid ciphertext file")
var ErrDecrypt = errors.New("unable to decrypt message")

// Decode rejects whitespace, padding and non-zero pad bits before key unlock.
func Decode(raw []byte) ([]byte, error) {
	if len(raw) == 0 || len(raw) > MaxRaw {
		return nil, ErrInput
	}
	for _, b := range raw {
		if !(b >= 'A' && b <= 'Z' || b >= 'a' && b <= 'z' || b >= '0' && b <= '9' || b == '-' || b == '_') {
			return nil, ErrInput
		}
	}
	out, err := base64.RawURLEncoding.Strict().DecodeString(string(raw))
	if err != nil || len(out) < 384+28 || len(out) > MaxBytes || base64.RawURLEncoding.EncodeToString(out) != string(raw) {
		return nil, ErrInput
	}
	return out, nil
}

func Decrypt(encoded []byte, key *rsa.PrivateKey) ([]byte, error) {
	if key == nil || key.E != 65537 || (key.N.BitLen() != 3072 && key.N.BitLen() != 4096) {
		return nil, ErrDecrypt
	}
	n := key.Size()
	if len(encoded) < n+28 || len(encoded) > n+28+MaxPlaintext {
		return nil, ErrDecrypt
	}
	wrapped, nonce, tag, text := encoded[:n], encoded[n:n+12], encoded[n+12:n+28], encoded[n+28:]
	material, err := rsa.DecryptOAEP(sha256.New(), rand.Reader, key, wrapped, nil)
	defer func() { clear(material); runtime.KeepAlive(material) }()
	if err != nil || len(material) != 32 {
		return nil, ErrDecrypt
	}
	block, err := aes.NewCipher(material)
	if err != nil {
		return nil, ErrDecrypt
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, ErrDecrypt
	}
	sealed := make([]byte, len(text)+16)
	copy(sealed, text)
	copy(sealed[len(text):], tag)
	plain, err := gcm.Open(nil, nonce, sealed, encoded[:n+12])
	if err != nil {
		return nil, ErrDecrypt
	}
	if !utf8.Valid(plain) {
		clear(plain)
		runtime.KeepAlive(plain)
		return nil, ErrDecrypt
	}
	return plain, nil
}
