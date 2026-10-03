// Package keyfile unlocks only Zodiac's fixed OpenSSL encrypted PKCS#8 profile.
// CBC containers are unauthenticated. This glue is not an audit or a claim of
// whole-program constant-time execution or guaranteed secret erasure.
package keyfile

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/pbkdf2"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/subtle"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/asn1"
	"encoding/hex"
	"encoding/pem"
	"errors"
	"io"
	"math/big"
	"os"
	"runtime"
)

const MaxPEMBytes = 16 * 1024
const MaxPasswordBytes = 1024
const minIterations = 600000
const maxIterations = 2000000

var ErrUnlock = errors.New("unable to unlock private key")
var oidPBES2 = asn1.ObjectIdentifier{1, 2, 840, 113549, 1, 5, 13}
var oidPBKDF2 = asn1.ObjectIdentifier{1, 2, 840, 113549, 1, 5, 12}
var oidSHA256 = asn1.ObjectIdentifier{1, 2, 840, 113549, 2, 9}
var oidAES256 = asn1.ObjectIdentifier{2, 16, 840, 1, 101, 3, 4, 1, 42}
var oidRSA = asn1.ObjectIdentifier{1, 2, 840, 113549, 1, 1, 1}

type profile struct {
	der, salt, iv, ciphertext []byte
	iterations                int
}
type deriveKey func(string, []byte, int) ([]byte, error)

func wipe(b []byte) { clear(b); runtime.KeepAlive(b) }

// Load consumes and clears the caller-owned password buffer on every path.
// The caller retains ownership of encodedPEM. Immutable PBKDF2 password strings,
// RSA integers, cipher state and runtime/OS copies cannot be guaranteed wiped.
func Load(encodedPEM, password []byte) (*rsa.PrivateKey, string, error) {
	return loadWithKDF(encodedPEM, password, func(pass string, salt []byte, iterations int) ([]byte, error) {
		return pbkdf2.Key(sha256.New, pass, salt, iterations, 32)
	})
}

// LoadFile bounds reads before parsing. Filesystem errors remain I/O errors;
// oversized containers and all validation/unlock failures are ErrUnlock.
func LoadFile(path string, password []byte) (*rsa.PrivateKey, string, error) {
	defer wipe(password)
	file, err := os.Open(path)
	if err != nil {
		return nil, "", err
	}
	defer file.Close()
	encoded, err := io.ReadAll(io.LimitReader(file, MaxPEMBytes+1))
	defer wipe(encoded)
	if err != nil {
		return nil, "", err
	}
	return Load(encoded, password)
}

func loadWithKDF(encodedPEM, password []byte, derive deriveKey) (*rsa.PrivateKey, string, error) {
	defer wipe(password)
	if len(password) > MaxPasswordBytes {
		return nil, "", ErrUnlock
	}
	parsed, err := parseProfile(encodedPEM)
	if err != nil {
		return nil, "", ErrUnlock
	}
	defer wipe(parsed.der)
	derived, err := derive(string(password), parsed.salt, parsed.iterations)
	defer wipe(derived)
	if err != nil || len(derived) != 32 {
		return nil, "", ErrUnlock
	}
	block, err := aes.NewCipher(derived)
	if err != nil {
		return nil, "", ErrUnlock
	}
	decrypted := make([]byte, len(parsed.ciphertext))
	defer wipe(decrypted)
	cipher.NewCBCDecrypter(block, parsed.iv).CryptBlocks(decrypted, parsed.ciphertext)
	inner, ok := unpad(decrypted)
	if !ok {
		return nil, "", ErrUnlock
	}
	key, err := parsePrivate(inner)
	if err != nil {
		return nil, "", ErrUnlock
	}
	public, err := x509.MarshalPKIXPublicKey(&key.PublicKey)
	if err != nil {
		return nil, "", ErrUnlock
	}
	fingerprint := sha256.Sum256(public)
	return key, hex.EncodeToString(fingerprint[:]), nil
}

func parseProfile(encoded []byte) (*profile, error) {
	if len(encoded) == 0 || len(encoded) > MaxPEMBytes {
		return nil, ErrUnlock
	}
	trimmed := bytes.Trim(encoded, " \t\r\n")
	const begin = "-----BEGIN ENCRYPTED PRIVATE KEY-----"
	const end = "-----END ENCRYPTED PRIVATE KEY-----"
	if !bytes.HasPrefix(trimmed, []byte(begin)) || !bytes.HasSuffix(trimmed, []byte(end)) || bytes.Count(trimmed, []byte("-----BEGIN ")) != 1 || bytes.Count(trimmed, []byte("-----END ")) != 1 {
		return nil, ErrUnlock
	}
	block, rest := pem.Decode(trimmed)
	if block == nil {
		return nil, ErrUnlock
	}
	accepted := false
	defer func() {
		if !accepted {
			wipe(block.Bytes)
		}
	}()
	if block.Type != "ENCRYPTED PRIVATE KEY" || len(block.Headers) != 0 || len(bytes.Trim(rest, " \t\r\n")) != 0 {
		return nil, ErrUnlock
	}
	outer, err := sequenceDER(block.Bytes, 2, 2)
	if err != nil {
		return nil, ErrUnlock
	}
	pbes, err := algorithm(outer[0], oidPBES2)
	if err != nil {
		return nil, ErrUnlock
	}
	params, err := sequence(pbes.Parameters, 2, 2)
	if err != nil {
		return nil, ErrUnlock
	}
	kdf, err := algorithm(params[0], oidPBKDF2)
	if err != nil {
		return nil, ErrUnlock
	}
	kdfFields, err := sequence(kdf.Parameters, 3, 4)
	if err != nil || !primitive(kdfFields[0], asn1.TagOctetString) || len(kdfFields[0].Bytes) < 16 || len(kdfFields[0].Bytes) > 64 {
		return nil, ErrUnlock
	}
	iterations, err := integer(kdfFields[1])
	if err != nil || iterations < minIterations || iterations > maxIterations {
		return nil, ErrUnlock
	}
	prfIndex := 2
	if len(kdfFields) == 4 {
		length, err := integer(kdfFields[2])
		if err != nil || length != 32 {
			return nil, ErrUnlock
		}
		prfIndex = 3
	}
	prf, err := algorithm(kdfFields[prfIndex], oidSHA256)
	if err != nil || !null(prf.Parameters) {
		return nil, ErrUnlock
	}
	encryption, err := algorithm(params[1], oidAES256)
	if err != nil || !primitive(encryption.Parameters, asn1.TagOctetString) || len(encryption.Parameters.Bytes) != aes.BlockSize {
		return nil, ErrUnlock
	}
	ciphertext := outer[1]
	if !primitive(ciphertext, asn1.TagOctetString) || len(ciphertext.Bytes) == 0 || len(ciphertext.Bytes) > MaxPEMBytes || len(ciphertext.Bytes)%aes.BlockSize != 0 {
		return nil, ErrUnlock
	}
	accepted = true
	return &profile{der: block.Bytes, salt: kdfFields[0].Bytes, iv: encryption.Parameters.Bytes, ciphertext: ciphertext.Bytes, iterations: int(iterations)}, nil
}

// All nested SEQUENCEs are walked through RawValue with a fixed field bound.
// asn1.Unmarshal owns DER tag/length parsing; no custom TLV parser is used.
func sequenceDER(der []byte, min, max int) ([]asn1.RawValue, error) {
	var raw asn1.RawValue
	rest, err := asn1.Unmarshal(der, &raw)
	if err != nil || len(rest) != 0 {
		return nil, ErrUnlock
	}
	return sequence(raw, min, max)
}
func sequence(raw asn1.RawValue, min, max int) ([]asn1.RawValue, error) {
	if raw.Class != asn1.ClassUniversal || raw.Tag != asn1.TagSequence || !raw.IsCompound {
		return nil, ErrUnlock
	}
	remaining := raw.Bytes
	fields := make([]asn1.RawValue, 0, max)
	for len(remaining) != 0 {
		if len(fields) == max {
			return nil, ErrUnlock
		}
		var field asn1.RawValue
		rest, err := asn1.Unmarshal(remaining, &field)
		if err != nil || len(rest) >= len(remaining) {
			return nil, ErrUnlock
		}
		fields = append(fields, field)
		remaining = rest
	}
	if len(fields) < min {
		return nil, ErrUnlock
	}
	return fields, nil
}
func primitive(raw asn1.RawValue, tag int) bool {
	return raw.Class == asn1.ClassUniversal && raw.Tag == tag && !raw.IsCompound
}
func null(raw asn1.RawValue) bool { return primitive(raw, asn1.TagNull) && len(raw.Bytes) == 0 }
func integer(raw asn1.RawValue) (int64, error) {
	if !primitive(raw, asn1.TagInteger) {
		return 0, ErrUnlock
	}
	var value int64
	rest, err := asn1.Unmarshal(raw.FullBytes, &value)
	if err != nil || len(rest) != 0 {
		return 0, ErrUnlock
	}
	return value, nil
}
func algorithm(raw asn1.RawValue, expected asn1.ObjectIdentifier) (pkix.AlgorithmIdentifier, error) {
	fields, err := sequence(raw, 2, 2)
	if err != nil || !primitive(fields[0], asn1.TagOID) {
		return pkix.AlgorithmIdentifier{}, ErrUnlock
	}
	var oid asn1.ObjectIdentifier
	rest, err := asn1.Unmarshal(fields[0].FullBytes, &oid)
	if err != nil || len(rest) != 0 || !oid.Equal(expected) {
		return pkix.AlgorithmIdentifier{}, ErrUnlock
	}
	return pkix.AlgorithmIdentifier{Algorithm: oid, Parameters: fields[1]}, nil
}
func unpad(decrypted []byte) ([]byte, bool) {
	if len(decrypted) < aes.BlockSize || len(decrypted)%aes.BlockSize != 0 {
		return nil, false
	}
	padding := int(decrypted[len(decrypted)-1])
	valid := subtle.ConstantTimeLessOrEq(1, padding) & subtle.ConstantTimeLessOrEq(padding, aes.BlockSize)
	for i := 0; i < aes.BlockSize; i++ {
		required := subtle.ConstantTimeLessOrEq(i+1, padding)
		equal := subtle.ConstantTimeByteEq(decrypted[len(decrypted)-1-i], byte(padding))
		valid &= 1 ^ (required & (1 ^ equal))
	}
	if valid != 1 {
		return nil, false
	}
	return decrypted[:len(decrypted)-padding], true
}
func parsePrivate(der []byte) (*rsa.PrivateKey, error) {
	fields, err := sequenceDER(der, 3, 3)
	if err != nil {
		return nil, ErrUnlock
	}
	version, err := integer(fields[0])
	if err != nil || version != 0 {
		return nil, ErrUnlock
	}
	alg, err := algorithm(fields[1], oidRSA)
	if err != nil || !null(alg.Parameters) || !primitive(fields[2], asn1.TagOctetString) {
		return nil, ErrUnlock
	}
	inner, err := sequenceDER(fields[2].Bytes, 9, 9)
	if err != nil {
		return nil, ErrUnlock
	}
	version, err = integer(inner[0])
	if err != nil || version != 0 {
		return nil, ErrUnlock
	}
	for _, field := range inner[1:] {
		if !primitive(field, asn1.TagInteger) || len(field.Bytes) > 514 {
			return nil, ErrUnlock
		}
		var value *big.Int
		rest, err := asn1.Unmarshal(field.FullBytes, &value)
		if err != nil || len(rest) != 0 || value == nil || value.Sign() <= 0 {
			return nil, ErrUnlock
		}
	}
	parsed, err := x509.ParsePKCS8PrivateKey(der)
	if err != nil {
		return nil, ErrUnlock
	}
	key, ok := parsed.(*rsa.PrivateKey)
	if !ok || len(key.Primes) != 2 || key.E != 65537 || (key.N.BitLen() != 3072 && key.N.BitLen() != 4096) || key.Validate() != nil {
		return nil, ErrUnlock
	}
	// Some Go versions validate the CRT exponents without checking the encoded D.
	// Keep this fixed-profile consistency check explicit alongside native Validate.
	one := big.NewInt(1)
	de := new(big.Int).Mul(key.D, big.NewInt(int64(key.E)))
	for _, prime := range key.Primes {
		if new(big.Int).Mod(de, new(big.Int).Sub(prime, one)).Cmp(one) != 0 {
			return nil, ErrUnlock
		}
	}
	return key, nil
}
