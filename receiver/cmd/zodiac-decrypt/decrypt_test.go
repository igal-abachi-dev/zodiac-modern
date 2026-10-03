//go:build windows

package main

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"testing"
	"zodiac-modern/receiver/internal/keyfile"
)

// Synthetic browser evidence drives the actual command implementation. This
// adapter is compiled only into tests, never into the receiver executable.
func TestBrowserNativeCLI(t *testing.T) {
	path := os.Getenv("ZODIAC_TEST_BROWSER_REQUEST")
	if path == "" {
		t.Skip("browser evidence adapter only")
	}
	var request struct {
		Raw       string
		Bits      string
		Plaintext string
		Expected  int
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(data, &request); err != nil {
		t.Fatal(err)
	}
	if request.Bits != "3072" && request.Bits != "4096" {
		t.Fatal("invalid synthetic key")
	}
	root := t.TempDir()
	input := filepath.Join(root, "ciphertext.txt")
	output := filepath.Join(root, "message.txt")
	if err := os.WriteFile(input, []byte(request.Raw), 0600); err != nil {
		t.Fatal(err)
	}
	key := filepath.Join("../../tests/fixtures/keys", "openssl-3.5-"+request.Bits+".pem")
	code := runWithPrompt([]string{"decrypt", "--key", key, "--in", input, "--out", output}, func(context.Context) ([]byte, error) { return []byte("Zodiac fixture only — never production"), nil })
	if code != request.Expected {
		t.Fatalf("expected exit %d got %d", request.Expected, code)
	}
	if code != 0 {
		if _, err := os.Stat(output); !os.IsNotExist(err) {
			t.Fatal("failure created plaintext")
		}
		return
	}
	actual, err := os.ReadFile(output)
	if err != nil || !bytes.Equal(actual, []byte(request.Plaintext)) {
		t.Fatal("browser/command exact bytes failed")
	}
}

func TestAuthenticatedCLIPrivateOutput(t *testing.T) {
	for _, bits := range []string{"3072", "4096"} {
		t.Run(bits, func(t *testing.T) {
			keyPath := filepath.Join("../../tests/fixtures/keys", "openssl-3.5-"+bits+".pem")
			key, _, err := keyfile.LoadFile(keyPath, []byte("Zodiac fixture only — never production"))
			if err != nil {
				t.Fatal(err)
			}
			root := t.TempDir()
			input := filepath.Join(root, "ciphertext.txt")
			output := filepath.Join(root, "message.txt")
			plain := []byte("synthetic שלום 🔑\x00\x1b\r\n")
			material := make([]byte, 32)
			rand.Read(material)
			defer clear(material)
			wrapped, err := rsa.EncryptOAEP(sha256.New(), rand.Reader, &key.PublicKey, material, nil)
			if err != nil {
				t.Fatal(err)
			}
			nonce := make([]byte, 12)
			rand.Read(nonce)
			block, _ := aes.NewCipher(material)
			gcm, _ := cipher.NewGCM(block)
			aad := append(wrapped, nonce...)
			sealed := gcm.Seal(nil, nonce, plain, aad)
			encoded := append(append(bytes.Clone(aad), sealed[len(sealed)-16:]...), sealed[:len(sealed)-16]...)
			args := []string{"decrypt", "--key", keyPath, "--in", input, "--out", output}
			calls := 0
			var password []byte
			prompt := func(context.Context) ([]byte, error) {
				calls++
				password = []byte("Zodiac fixture only — never production")
				return password, nil
			}
			stdout, err := os.CreateTemp(root, "stdout-")
			if err != nil {
				t.Fatal(err)
			}
			defer stdout.Close()
			old := os.Stdout
			os.Stdout = stdout
			defer func() { os.Stdout = old }()
			for _, offset := range []int{0, key.Size(), key.Size() + 12, key.Size() + 28} {
				mutant := bytes.Clone(encoded)
				mutant[offset] ^= 1
				os.WriteFile(input, []byte(base64.RawURLEncoding.EncodeToString(mutant)), 0600)
				if code := runWithPrompt(args, prompt); code != 4 {
					t.Fatalf("tamper returned %d", code)
				}
				if _, err := os.Stat(output); !os.IsNotExist(err) {
					t.Fatal("created output before authentication")
				}
				if !bytes.Equal(password, make([]byte, len(password))) {
					t.Fatal("owned passphrase retained")
				}
			}
			before := calls
			os.WriteFile(input, []byte("not raw!"), 0600)
			if runWithPrompt(args, prompt) != 2 || calls != before {
				t.Fatal("malformed raw requested password")
			}
			os.WriteFile(input, []byte(base64.RawURLEncoding.EncodeToString(encoded)), 0600)
			if code := runWithPrompt(args, prompt); code != 0 {
				t.Fatalf("valid decrypt returned %d", code)
			}
			actual, err := os.ReadFile(output)
			if err != nil || !bytes.Equal(actual, plain) {
				t.Fatal("CLI changed plaintext")
			}
			if code := runWithPrompt(args, prompt); code != 5 {
				t.Fatal("CLI overwrite allowed")
			}
			stdout.Seek(0, 0)
			printed, _ := io.ReadAll(stdout)
			if bytes.Contains(printed, plain) || bytes.Contains(printed, material) || bytes.Contains(printed, []byte("fixture only")) {
				t.Fatal("secret stdout")
			}
		})
	}
}
