// Independent test-only envelope oracle. Never imported by receiver or website.
// It accepts only explicitly synthetic private DER over its test process pipe;
// the production receiver has no such password/private-input interface.
package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"os"
	"strings"
)

type request struct{ Mode, PrivateDER, Raw, Plaintext string }

func main() {
	var request request
	decoder := json.NewDecoder(io.LimitReader(os.Stdin, 200000))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&request) != nil {
		os.Exit(2)
	}
	der, err := base64.StdEncoding.DecodeString(request.PrivateDER)
	if err != nil {
		os.Exit(2)
	}
	defer clear(der)
	key, err := x509.ParsePKCS1PrivateKey(der)
	if err != nil || key.Validate() != nil || key.E != 65537 || (key.N.BitLen() != 3072 && key.N.BitLen() != 4096) {
		os.Exit(2)
	}
	var result string
	if request.Mode == "decrypt" {
		var plain []byte
		plain, err = decrypt(key, request.Raw)
		defer clear(plain)
		result = base64.StdEncoding.EncodeToString(plain)
	} else if request.Mode == "encrypt" {
		var plain []byte
		plain, err = base64.StdEncoding.DecodeString(request.Plaintext)
		defer clear(plain)
		if err == nil {
			result, err = encrypt(&key.PublicKey, plain)
		}
	} else {
		os.Exit(2)
	}
	if err != nil {
		os.Exit(4)
	}
	json.NewEncoder(os.Stdout).Encode(map[string]string{"result": result})
}
func decode(raw string) ([]byte, error) {
	if len(raw) > 88102 || len(raw)%4 == 1 || strings.IndexFunc(raw, func(r rune) bool {
		return !(r >= 'A' && r <= 'Z' || r >= 'a' && r <= 'z' || r >= '0' && r <= '9' || r == '-' || r == '_')
	}) >= 0 {
		return nil, errors.New("invalid raw")
	}
	decoded, err := base64.RawURLEncoding.Strict().DecodeString(raw)
	if err != nil || base64.RawURLEncoding.EncodeToString(decoded) != raw {
		return nil, errors.New("invalid raw")
	}
	return decoded, nil
}
func decrypt(key *rsa.PrivateKey, raw string) ([]byte, error) {
	envelope, err := decode(raw)
	if err != nil {
		return nil, err
	}
	k := key.Size()
	if len(envelope) < k+28 || len(envelope) > k+28+65536 {
		return nil, errors.New("size")
	}
	aesKey, err := rsa.DecryptOAEP(sha256.New(), nil, key, envelope[:k], nil)
	defer clear(aesKey)
	if err != nil || len(aesKey) != 32 {
		return nil, errors.New("unwrap")
	}
	block, err := aes.NewCipher(aesKey)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	sealed := append(append([]byte{}, envelope[k+28:]...), envelope[k+12:k+28]...)
	return gcm.Open(nil, envelope[k:k+12], sealed, envelope[:k+12])
}
func encrypt(key *rsa.PublicKey, plain []byte) (string, error) {
	if len(plain) > 65536 {
		return "", errors.New("size")
	}
	aesKey := make([]byte, 32)
	defer clear(aesKey)
	if _, err := rand.Read(aesKey); err != nil {
		return "", err
	}
	wrapped, err := rsa.EncryptOAEP(sha256.New(), rand.Reader, key, aesKey, nil)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, 12)
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	block, err := aes.NewCipher(aesKey)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	aad := append(append([]byte{}, wrapped...), nonce...)
	sealed := gcm.Seal(nil, nonce, plain, aad)
	envelope := append(append(append([]byte{}, aad...), sealed[len(sealed)-16:]...), sealed[:len(sealed)-16]...)
	return base64.RawURLEncoding.EncodeToString(envelope), nil
}
