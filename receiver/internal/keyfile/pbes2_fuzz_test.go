package keyfile

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"testing"
)

func FuzzPreKDF(f *testing.F) {
	f.Add(fixture(f, "openssl-3.5-3072.pem"))
	f.Add(fixture(f, "openssl-3.0-3072.pem"))
	f.Add([]byte("malformed"))
	f.Add(make([]byte, 1<<20))
	for _, i := range []int64{-1, 0, 599999, 2000001, 1000000000} {
		p := standard(f)
		p.iterations = i
		f.Add(encodeProfile(f, p))
	}
	for _, size := range []int{0, 8, 15, 65, 1 << 20} {
		p := standard(f)
		p.salt = make([]byte, size)
		f.Add(encodeProfile(f, p))
	}
	for _, size := range []int{0, 15, 17, 32} {
		p := standard(f)
		p.iv = make([]byte, size)
		f.Add(encodeProfile(f, p))
	}
	for _, length := range []int64{0, 31, 33} {
		p := standard(f)
		p.length = intPtr(length)
		f.Add(encodeProfile(f, p))
	}
	p := standard(f)
	p.prf = raw(f, 0)
	f.Add(encodeProfile(f, p))
	p.prf.FullBytes = nil
	f.Add(encodeProfile(f, p))
	f.Fuzz(func(t *testing.T, encoded []byte) {
		if len(encoded) > MaxPEMBytes+1 {
			encoded = encoded[:MaxPEMBytes+1]
		}
		accepted, parseErr := parseProfile(encoded)
		if accepted != nil {
			defer wipe(accepted.der)
		}
		calls := 0
		password := []byte("synthetic fuzz password")
		_, _, err := loadWithKDF(encoded, password, func(string, []byte, int) ([]byte, error) { calls++; return make([]byte, 32), nil })
		if parseErr != nil && calls != 0 {
			t.Fatal("unsupported input invoked KDF")
		}
		if calls > 1 {
			t.Fatal("multiple KDF calls")
		}
		if err != nil && err != ErrUnlock {
			t.Fatal("distinguishable unlock failure")
		}
		if !bytes.Equal(password, make([]byte, len(password))) {
			t.Fatal("password cleanup failed")
		}
	})
}
func FuzzPostKDF(f *testing.F) {
	f.Add(bytes.Repeat([]byte{16}, 16))
	f.Add(make([]byte, 32))
	f.Add([]byte{0x30, 0x80, 0, 0})
	f.Fuzz(func(t *testing.T, input []byte) {
		if len(input) > MaxPEMBytes {
			input = input[:MaxPEMBytes]
		}
		block, _ := aes.NewCipher(make([]byte, 32))
		size := len(input) - len(input)%16
		if size >= 16 {
			decrypted := make([]byte, size)
			defer wipe(decrypted)
			cipher.NewCBCDecrypter(block, make([]byte, 16)).CryptBlocks(decrypted, input[:size])
			if inner, ok := unpad(decrypted); ok {
				parsePrivate(inner)
			}
		}
		if inner, ok := unpad(input); ok {
			parsePrivate(inner)
		}
		parsePrivate(input)
	})
}
