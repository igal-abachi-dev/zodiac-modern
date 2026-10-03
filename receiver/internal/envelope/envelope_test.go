package envelope

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"zodiac-modern/receiver/internal/keyfile"
)

func fixture(t *testing.T, name string) *rsa.PrivateKey {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("../../tests/fixtures/keys", name))
	if err != nil {
		t.Fatal(err)
	}
	key, _, err := keyfile.Load(b, []byte("Zodiac fixture only — never production"))
	if err != nil {
		t.Fatal(err)
	}
	return key
}
func seal(t *testing.T, public *rsa.PublicKey, plain []byte, keyBytes int) []byte {
	t.Helper()
	material := make([]byte, keyBytes)
	if _, err := rand.Read(material); err != nil {
		t.Fatal(err)
	}
	defer clear(material)
	wrapped, err := rsa.EncryptOAEP(sha256.New(), rand.Reader, public, material, nil)
	if err != nil {
		t.Fatal(err)
	}
	nonce := make([]byte, 12)
	if _, err := rand.Read(nonce); err != nil {
		t.Fatal(err)
	}
	aesMaterial := material
	if keyBytes != 32 {
		aesMaterial = make([]byte, 32)
	}
	block, err := aes.NewCipher(aesMaterial)
	if err != nil {
		t.Fatal(err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		t.Fatal(err)
	}
	aad := append(append([]byte{}, wrapped...), nonce...)
	sealed := gcm.Seal(nil, nonce, plain, aad)
	result := append(aad, sealed[len(sealed)-16:]...)
	return append(result, sealed[:len(sealed)-16]...)
}
func TestRealRSAAndGCMExactBytes(t *testing.T) {
	wrong := fixture(t, "openssl-3.0-rewrapped-3.5-3072.pem")
	for _, name := range []string{"openssl-3.5-3072.pem", "openssl-3.5-4096.pem"} {
		t.Run(name, func(t *testing.T) {
			key := fixture(t, name)
			for _, plain := range [][]byte{{}, []byte(" \r\n"), []byte("שלום العربية 🔑 e\u0301\x00\x1b"), bytes.Repeat([]byte{'a'}, 65536)} {
				encoded := seal(t, &key.PublicKey, plain, 32)
				raw := base64.RawURLEncoding.EncodeToString(encoded)
				decoded, err := Decode([]byte(raw))
				if err != nil || !bytes.Equal(encoded, decoded) {
					t.Fatal("raw decoding failed")
				}
				actual, err := Decrypt(decoded, key)
				if err != nil || !bytes.Equal(actual, plain) {
					t.Fatal("exact plaintext failed")
				}
				clear(actual)
				actual, err = Decrypt(decoded, wrong)
				if !errors.Is(err, ErrDecrypt) || actual != nil {
					t.Fatal("wrong key released plaintext")
				}
				for _, offset := range []int{0, key.Size(), key.Size() + 12, key.Size() + 28} {
					if offset >= len(encoded) {
						continue
					}
					mutant := bytes.Clone(encoded)
					mutant[offset] ^= 1
					actual, err = Decrypt(mutant, key)
					if !errors.Is(err, ErrDecrypt) || actual != nil {
						t.Fatalf("tampered field %d released plaintext", offset)
					}
				}
			}
			for _, size := range []int{0, 16, 24, 31, 33} {
				actual, err := Decrypt(seal(t, &key.PublicKey, []byte("synthetic"), size), key)
				if !errors.Is(err, ErrDecrypt) || actual != nil {
					t.Fatalf("unwrap length %d accepted", size)
				}
			}
			actual, err := Decrypt(seal(t, &key.PublicKey, []byte{0xff, 0xc0, 0x80}, 32), key)
			if !errors.Is(err, ErrDecrypt) || actual != nil {
				t.Fatal("invalid UTF-8 accepted")
			}
			for _, size := range []int{0, key.Size() + 27, key.Size() + 28 + 65537} {
				actual, err := Decrypt(make([]byte, size), key)
				if !errors.Is(err, ErrDecrypt) || actual != nil {
					t.Fatal("length accepted")
				}
			}
		})
	}
}
func TestStrictRawInput(t *testing.T) {
	valid := base64.RawURLEncoding.EncodeToString(make([]byte, 413))
	for _, raw := range []string{"", "A", valid + "=", valid + "\n", valid + " ", valid + "+", valid + "/", strings.Repeat("A", MaxRaw+1), valid[:len(valid)-1] + "B"} {
		if b, err := Decode([]byte(raw)); !errors.Is(err, ErrInput) || b != nil {
			t.Fatal("noncanonical input accepted")
		}
	}
	if _, err := Decode([]byte(valid)); err != nil {
		t.Fatal("canonical input rejected")
	}
}
func FuzzCanonicalRaw(f *testing.F) {
	for _, s := range []string{"", "A", "AB", "AA=", strings.Repeat("A", 550), strings.Repeat("A", MaxRaw)} {
		f.Add([]byte(s))
	}
	f.Fuzz(func(t *testing.T, b []byte) {
		out, err := Decode(b)
		if err == nil && (len(out) > MaxBytes || base64.RawURLEncoding.EncodeToString(out) != string(b)) {
			t.Fatal("noncanonical output")
		}
	})
}
