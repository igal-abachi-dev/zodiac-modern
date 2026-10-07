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
	"errors"
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

func TestOptInBestEffortCleanupLifecycle(t *testing.T) {
	fixtureKey := "../../tests/fixtures/keys/openssl-3.5-3072.pem"
	publicKey, _, err := keyfile.LoadFile(fixtureKey, []byte("Zodiac fixture only — never production"))
	if err != nil {
		t.Fatal(err)
	}
	plain := []byte("synthetic cleanup lifecycle")
	material := make([]byte, 32)
	if _, err := rand.Read(material); err != nil {
		t.Fatal(err)
	}
	defer clear(material)
	wrapped, err := rsa.EncryptOAEP(sha256.New(), rand.Reader, &publicKey.PublicKey, material, nil)
	if err != nil {
		t.Fatal(err)
	}
	nonce := make([]byte, 12)
	if _, err := rand.Read(nonce); err != nil {
		t.Fatal(err)
	}
	block, err := aes.NewCipher(material)
	if err != nil {
		t.Fatal(err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		t.Fatal(err)
	}
	aad := append(bytes.Clone(wrapped), nonce...)
	sealed := gcm.Seal(nil, nonce, plain, aad)
	envelope := append(append(bytes.Clone(aad), sealed[len(sealed)-16:]...), sealed[:len(sealed)-16]...)

	for _, tc := range []struct {
		name          string
		flags         []string
		finishErr     error
		wantCode      int
		outputRemains bool
		keyRemains    bool
	}{
		{name: "output-only", flags: []string{"--cleanup-output"}, wantCode: 0, outputRemains: false, keyRemains: true},
		{name: "explicit-single-use-key", flags: []string{"--single-use-key"}, wantCode: 0, outputRemains: true, keyRemains: false},
		{name: "both-on-cancel", flags: []string{"--cleanup-output", "--single-use-key"}, finishErr: context.Canceled, wantCode: 130, outputRemains: false, keyRemains: false},
		{name: "terminal-failure-preserves-files", flags: []string{"--cleanup-output", "--single-use-key"}, finishErr: errors.New("synthetic terminal failure"), wantCode: 5, outputRemains: true, keyRemains: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			root := t.TempDir()
			input := filepath.Join(root, "ciphertext.txt")
			output := filepath.Join(root, "message.txt")
			keyPath := filepath.Join(root, "private.pem")
			keyBytes, err := os.ReadFile(fixtureKey)
			if err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(keyPath, keyBytes, 0600); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(input, []byte(base64.RawURLEncoding.EncodeToString(envelope)), 0600); err != nil {
				t.Fatal(err)
			}
			args := append([]string{"decrypt", "--key", keyPath, "--in", input, "--out", output}, tc.flags...)
			prompt := func(context.Context) ([]byte, error) { return []byte("Zodiac fixture only — never production"), nil }
			finish := func(context.Context) error { return tc.finishErr }
			if code := runWithPromptAndFinish(args, prompt, finish); code != tc.wantCode {
				t.Fatalf("exit=%d want=%d", code, tc.wantCode)
			}
			_, outputErr := os.Stat(output)
			if got := outputErr == nil; got != tc.outputRemains {
				t.Fatalf("output remains=%v want=%v (%v)", got, tc.outputRemains, outputErr)
			}
			_, keyErr := os.Stat(keyPath)
			if got := keyErr == nil; got != tc.keyRemains {
				t.Fatalf("key remains=%v want=%v (%v)", got, tc.keyRemains, keyErr)
			}
			if tc.outputRemains {
				actual, err := os.ReadFile(output)
				if err != nil || !bytes.Equal(actual, plain) {
					t.Fatal("cleanup mode changed output bytes")
				}
			}
		})
	}
}
