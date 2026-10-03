package keyfile

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"encoding/asn1"
	"encoding/json"
	"encoding/pem"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

const fixturePassword = "Zodiac fixture only — never production"

func fixture(t testing.TB, name string) []byte {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("../../tests/fixtures/keys", name))
	if err != nil {
		t.Fatal(err)
	}
	return b
}
func TestOpenSSLFixtures(t *testing.T) {
	var manifest struct {
		Fixtures []struct {
			Filename              string
			Bits                  int
			Expected, Fingerprint string
		}
	}
	b, err := os.ReadFile("../../tests/fixtures/manifest.json")
	if err != nil || json.Unmarshal(b, &manifest) != nil {
		t.Fatal("real OpenSSL fixture manifest required")
	}
	if len(manifest.Fixtures) != 6 {
		t.Fatal("expected complete 3.0/3.5/rewrap matrix")
	}
	for _, f := range manifest.Fixtures {
		t.Run(f.Filename, func(t *testing.T) {
			password := []byte(fixturePassword)
			started := time.Now()
			key, fingerprint, err := Load(fixture(t, f.Filename), password)
			t.Logf("native unlock duration: %s", time.Since(started))
			if !bytes.Equal(password, make([]byte, len(password))) {
				t.Fatal("password not cleared")
			}
			if strings.HasPrefix(f.Expected, "reject:") {
				if err != ErrUnlock || key != nil || fingerprint != "" {
					t.Fatal("unsupported fixture accepted")
				}
			} else {
				if err != nil || key.N.BitLen() != f.Bits || fingerprint != f.Fingerprint {
					t.Fatal("OpenSSL oracle/public fingerprint mismatch")
				}
				if key, fp, err := Load(fixture(t, f.Filename), []byte("wrong synthetic password")); err != ErrUnlock || key != nil || fp != "" {
					t.Fatal("wrong password accepted or distinguished")
				}
			}
		})
	}
}

func raw(t testing.TB, value any) asn1.RawValue {
	t.Helper()
	der, err := asn1.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	var result asn1.RawValue
	rest, err := asn1.Unmarshal(der, &result)
	if err != nil || len(rest) != 0 {
		t.Fatal("bad test DER")
	}
	return result
}
func seq(t testing.TB, fields ...asn1.RawValue) asn1.RawValue {
	t.Helper()
	var body []byte
	for _, f := range fields {
		body = append(body, f.FullBytes...)
	}
	return raw(t, asn1.RawValue{Class: asn1.ClassUniversal, Tag: asn1.TagSequence, IsCompound: true, Bytes: body})
}
func alg(t testing.TB, oid asn1.ObjectIdentifier, params asn1.RawValue) asn1.RawValue {
	return seq(t, raw(t, oid), params)
}

type testProfile struct {
	salt           []byte
	iterations     int64
	length         *int64
	prf            asn1.RawValue
	iv, ciphertext []byte
}

func standard(t testing.TB) testProfile {
	return testProfile{salt: bytes.Repeat([]byte{7}, 16), iterations: 600000, prf: alg(t, oidSHA256, raw(t, asn1.RawValue{Tag: asn1.TagNull})), iv: make([]byte, 16), ciphertext: make([]byte, 16)}
}
func encodeProfile(t testing.TB, p testProfile) []byte {
	fields := []asn1.RawValue{raw(t, p.salt), raw(t, p.iterations)}
	if p.length != nil {
		fields = append(fields, raw(t, *p.length))
	}
	if len(p.prf.FullBytes) != 0 {
		fields = append(fields, p.prf)
	}
	kdf := alg(t, oidPBKDF2, seq(t, fields...))
	encryption := alg(t, oidAES256, raw(t, p.iv))
	outer := seq(t, alg(t, oidPBES2, seq(t, kdf, encryption)), raw(t, p.ciphertext))
	return pem.EncodeToMemory(&pem.Block{Type: "ENCRYPTED PRIVATE KEY", Bytes: outer.FullBytes})
}
func intPtr(i int64) *int64 { return &i }

func TestPolicyRejectsBeforeKDF(t *testing.T) {
	cases := map[string]func(*testProfile){
		"salt8": func(p *testProfile) { p.salt = make([]byte, 8) }, "salt15": func(p *testProfile) { p.salt = make([]byte, 15) }, "salt65": func(p *testProfile) { p.salt = make([]byte, 65) }, "salt1MiB": func(p *testProfile) { p.salt = make([]byte, 1<<20) },
		"iter-low": func(p *testProfile) { p.iterations = 599999 }, "iter-high": func(p *testProfile) { p.iterations = 2000001 }, "iter-billion": func(p *testProfile) { p.iterations = 1000000000 }, "iter-negative": func(p *testProfile) { p.iterations = -1 },
		"length-zero": func(p *testProfile) { p.length = intPtr(0) }, "length31": func(p *testProfile) { p.length = intPtr(31) }, "length33": func(p *testProfile) { p.length = intPtr(33) },
		"absent-prf": func(p *testProfile) { p.prf = asn1.RawValue{} }, "sha1-prf": func(p *testProfile) {
			p.prf = alg(t, asn1.ObjectIdentifier{1, 2, 840, 113549, 2, 7}, raw(t, asn1.RawValue{Tag: asn1.TagNull}))
		},
		"absent-prf-params": func(p *testProfile) { p.prf = seq(t, raw(t, oidSHA256)) }, "wrong-prf-params": func(p *testProfile) { p.prf = alg(t, oidSHA256, raw(t, 0)) },
		"iv15": func(p *testProfile) { p.iv = make([]byte, 15) }, "iv17": func(p *testProfile) { p.iv = make([]byte, 17) }, "empty-ciphertext": func(p *testProfile) { p.ciphertext = nil }, "partial-block": func(p *testProfile) { p.ciphertext = make([]byte, 17) },
	}
	for name, mutate := range cases {
		t.Run(name, func(t *testing.T) { p := standard(t); mutate(&p); assertPreKDF(t, encodeProfile(t, p)) })
	}
	b := encodeProfile(t, standard(t))
	for name, encoded := range map[string][]byte{"prefix": append([]byte("garbage\n"), b...), "suffix": append(append([]byte{}, b...), []byte("garbage")...), "multiple": append(append([]byte{}, b...), b...), "oversize": make([]byte, 1<<20), "private-label": bytes.ReplaceAll(b, []byte("ENCRYPTED PRIVATE KEY"), []byte("PRIVATE KEY")), "headers": bytes.Replace(b, []byte("-----\n"), []byte("-----\nProc-Type: 4,ENCRYPTED\n\n"), 1)} {
		t.Run(name, func(t *testing.T) { assertPreKDF(t, encoded) })
	}
}
func assertPreKDF(t testing.TB, encoded []byte) {
	t.Helper()
	calls := 0
	password := []byte("synthetic")
	key, fp, err := loadWithKDF(encoded, password, func(string, []byte, int) ([]byte, error) { calls++; return make([]byte, 32), nil })
	if err != ErrUnlock || key != nil || fp != "" || calls != 0 {
		t.Fatal("invalid profile reached KDF or had distinguishable failure")
	}
	if !bytes.Equal(password, make([]byte, len(password))) {
		t.Fatal("password not wiped on pre-KDF rejection")
	}
}

// Mutate every nested schema location using standard ASN.1 serialization.
func TestExactNestedSchema(t *testing.T) {
	block, _ := pem.Decode(encodeProfile(t, standard(t)))
	var base asn1.RawValue
	asn1.Unmarshal(block.Bytes, &base)
	paths := [][]int{{}, {0}, {0, 1}, {0, 1, 0}, {0, 1, 0, 1}, {0, 1, 0, 1, 2}, {0, 1, 1}}
	for i, path := range paths {
		t.Run(strings.Repeat("nested-", i+1), func(t *testing.T) {
			mutated := mutateSequence(t, base, path, func(fields []asn1.RawValue) asn1.RawValue { return seq(t, append(fields, raw(t, 0))...) })
			assertPreKDF(t, pem.EncodeToMemory(&pem.Block{Type: "ENCRYPTED PRIVATE KEY", Bytes: mutated.FullBytes}))
		})
	}
	for _, mutation := range []func([]byte) []byte{func(b []byte) []byte { return append(b, 0) }, func(b []byte) []byte { return b[:len(b)-1] }, func(b []byte) []byte { return []byte{0x30, 0x84, 0x7f, 0xff, 0xff, 0xff} }} {
		assertPreKDF(t, pem.EncodeToMemory(&pem.Block{Type: "ENCRYPTED PRIVATE KEY", Bytes: mutation(append([]byte{}, block.Bytes...))}))
	}
	p := standard(t)
	root, _ := sequenceDER(block.Bytes, 2, 2)
	pbes, _ := sequence(root[0], 2, 2)
	params, _ := sequence(pbes[1], 2, 2)
	kdf, _ := sequence(params[0], 2, 2)
	fields, _ := sequence(kdf[1], 3, 4)
	fields[0] = alg(t, oidSHA256, raw(t, asn1.RawValue{Tag: asn1.TagNull}))
	outer := seq(t, alg(t, oidPBES2, seq(t, alg(t, oidPBKDF2, seq(t, fields...)), params[1])), raw(t, p.ciphertext))
	assertPreKDF(t, pem.EncodeToMemory(&pem.Block{Type: "ENCRYPTED PRIVATE KEY", Bytes: outer.FullBytes}))
	fields[0] = raw(t, p.salt)
	fields[1] = raw(t, asn1.RawValue{Tag: asn1.TagInteger, Bytes: []byte{1, 0, 0, 0, 0, 0, 0, 0, 0}})
	outer = seq(t, alg(t, oidPBES2, seq(t, alg(t, oidPBKDF2, seq(t, fields...)), params[1])), raw(t, p.ciphertext))
	assertPreKDF(t, pem.EncodeToMemory(&pem.Block{Type: "ENCRYPTED PRIVATE KEY", Bytes: outer.FullBytes}))
}
func mutateSequence(t testing.TB, node asn1.RawValue, path []int, change func([]asn1.RawValue) asn1.RawValue) asn1.RawValue {
	t.Helper()
	fields, err := sequence(node, 1, 10)
	if err != nil {
		t.Fatal("bad test path")
	}
	if len(path) == 0 {
		return change(fields)
	}
	fields[path[0]] = mutateSequence(t, fields[path[0]], path[1:], change)
	return seq(t, fields...)
}

func TestPaddingAllBytes(t *testing.T) {
	for length := 1; length <= 16; length++ {
		block := bytes.Repeat([]byte{0x42}, 32)
		for i := 0; i < length; i++ {
			block[len(block)-1-i] = byte(length)
		}
		unpadded, ok := unpad(block)
		if !ok || len(unpadded) != 32-length {
			t.Fatalf("valid pad %d rejected", length)
		}
		for i := 0; i < length; i++ {
			corrupt := append([]byte{}, block...)
			corrupt[len(corrupt)-1-i] ^= 0x80
			if _, ok := unpad(corrupt); ok {
				t.Fatalf("corrupt pad %d byte %d accepted", length, i)
			}
		}
	}
	for _, last := range []byte{0, 17, 255} {
		b := make([]byte, 16)
		b[15] = last
		if _, ok := unpad(b); ok {
			t.Fatal("invalid pad length accepted")
		}
	}
}
func TestNativeProfileBoundaries(t *testing.T) {
	key, fp, err := Load(fixture(t, "openssl-3.5-3072.pem"), []byte(fixturePassword))
	if err != nil {
		t.Fatal(err)
	}
	der, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		t.Fatal(err)
	}
	defer wipe(der)
	for _, saltSize := range []int{16, 64} {
		for _, iterations := range []int64{600000, 2000000} {
			for _, length := range []*int64{nil, intPtr(32)} {
				p := standard(t)
				p.salt = bytes.Repeat([]byte{9}, saltSize)
				p.iterations = iterations
				p.length = length
				encoded := encryptTest(t, p, der)
				started := time.Now()
				loaded, actual, err := Load(encoded, []byte(fixturePassword))
				t.Logf("salt=%d iterations=%d explicitLength=%v native KDF+unlock=%s", saltSize, iterations, length != nil, time.Since(started))
				if err != nil || loaded == nil || actual != fp {
					t.Fatal("supported profile boundary rejected")
				}
			}
		}
	}
}
func encryptTest(t testing.TB, p testProfile, der []byte) []byte {
	t.Helper()
	derived, err := pbkdf2.Key(sha256.New, fixturePassword, p.salt, int(p.iterations), 32)
	if err != nil {
		t.Fatal(err)
	}
	defer wipe(derived)
	padded := append([]byte{}, der...)
	padding := 16 - len(padded)%16
	padded = append(padded, bytes.Repeat([]byte{byte(padding)}, padding)...)
	defer wipe(padded)
	block, err := aes.NewCipher(derived)
	if err != nil {
		t.Fatal(err)
	}
	p.ciphertext = make([]byte, len(padded))
	cipher.NewCBCEncrypter(block, p.iv).CryptBlocks(p.ciphertext, padded)
	return encodeProfile(t, p)
}
func TestInnerStrictnessAndCleanup(t *testing.T) {
	key, _, err := Load(fixture(t, "openssl-3.5-3072.pem"), []byte(fixturePassword))
	if err != nil {
		t.Fatal(err)
	}
	der, _ := x509.MarshalPKCS8PrivateKey(key)
	defer wipe(der)
	var base asn1.RawValue
	asn1.Unmarshal(der, &base)
	for _, path := range [][]int{{}, {1}} {
		mutated := mutateSequence(t, base, path, func(fields []asn1.RawValue) asn1.RawValue { return seq(t, append(fields, raw(t, 0))...) })
		if _, err := parsePrivate(mutated.FullBytes); err != ErrUnlock {
			t.Fatal("extra inner wrapper fields accepted")
		}
	}
	if _, err := parsePrivate(append(append([]byte{}, der...), 0)); err != ErrUnlock {
		t.Fatal("trailing private DER accepted")
	}
	fields, _ := sequence(base, 3, 3)
	inner, _ := sequenceDER(fields[2].Bytes, 9, 9)
	for _, index := range []int{0, 1, 2, 3, 4, 5, 6, 7, 8} {
		copyFields := append([]asn1.RawValue{}, inner...)
		replacement := 0
		if index == 0 {
			replacement = 1
		}
		copyFields[index] = raw(t, replacement)
		copyOuter := append([]asn1.RawValue{}, fields...)
		copyOuter[2] = raw(t, seq(t, copyFields...).FullBytes)
		if _, err := parsePrivate(seq(t, copyOuter...).FullBytes); err != ErrUnlock {
			t.Fatal("invalid RSA member accepted")
		}
	}
	ecKey, err := x509.ParsePKCS8PrivateKey(der)
	if err != nil || ecKey == nil {
		t.Fatal(err)
	}
	encoded := fixture(t, "openssl-3.5-3072.pem")
	password := []byte(fixturePassword)
	derived := make([]byte, 32)
	if _, _, err := loadWithKDF(encoded, password, func(string, []byte, int) ([]byte, error) { return derived, errors.New("stub failure") }); err != ErrUnlock {
		t.Fatal("KDF error escaped")
	}
	if !bytes.Equal(derived, make([]byte, 32)) {
		t.Fatal("derived bytes not wiped")
	}
	oversize := bytes.Repeat([]byte{'a'}, MaxPasswordBytes+1)
	if _, _, err := Load(encoded, oversize); err != ErrUnlock || !bytes.Equal(oversize, make([]byte, len(oversize))) {
		t.Fatal("password bound/cleanup failed")
	}
}
func TestParseBounds(t *testing.T) {
	if _, err := parseProfile(bytes.Repeat([]byte{'x'}, MaxPEMBytes+1)); err != ErrUnlock {
		t.Fatal("large file accepted")
	}
	p := standard(t)
	parsed, err := parseProfile(encodeProfile(t, p))
	if err != nil {
		t.Fatal(err)
	}
	defer wipe(parsed.der)
	if allocations := testing.AllocsPerRun(100, func() {
		profile, err := parseProfile(encodeProfile(t, p))
		if err != nil {
			panic(err)
		}
		wipe(profile.der)
	}); allocations > 300 {
		t.Fatalf("unexpected parse allocation growth: %.0f", allocations)
	}
	random := make([]byte, 4096)
	rand.Read(random)
	assertPreKDF(t, random)
}
