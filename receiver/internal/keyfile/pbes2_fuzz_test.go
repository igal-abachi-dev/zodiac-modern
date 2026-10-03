package keyfile

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/x509"
	"encoding/asn1"
	"encoding/pem"
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
	for _, prf := range []asn1.RawValue{
		alg(f, asn1.ObjectIdentifier{1, 2, 840, 113549, 2, 7}, raw(f, asn1.RawValue{Tag: asn1.TagNull})),
		seq(f, raw(f, oidSHA256)),
		alg(f, oidSHA256, raw(f, 0)),
	} {
		p := standard(f)
		p.prf = prf
		f.Add(encodeProfile(f, p))
	}
	for _, size := range []int{0, 1, 15, 17} {
		p := standard(f)
		p.ciphertext = make([]byte, size)
		f.Add(encodeProfile(f, p))
	}
	basePEM := encodeProfile(f, standard(f))
	for _, encoded := range [][]byte{
		append([]byte("prefix\n"), basePEM...),
		append(append([]byte{}, basePEM...), []byte("suffix")...),
		append(append([]byte{}, basePEM...), basePEM...),
	} {
		f.Add(encoded)
	}
	block, _ := pem.Decode(basePEM)
	var base asn1.RawValue
	if rest, err := asn1.Unmarshal(block.Bytes, &base); err != nil || len(rest) != 0 {
		f.Fatal("bad seed schema")
	}
	addDER := func(der []byte) {
		f.Add(pem.EncodeToMemory(&pem.Block{Type: "ENCRYPTED PRIVATE KEY", Bytes: der}))
	}
	// Every nested SEQUENCE can hide ignored fields when decoded into structs.
	for _, path := range [][]int{{}, {0}, {0, 1}, {0, 1, 0}, {0, 1, 0, 1}, {0, 1, 0, 1, 2}, {0, 1, 1}} {
		addDER(mutateSequence(f, base, path, func(fields []asn1.RawValue) asn1.RawValue {
			return seq(f, append(fields, raw(f, 0))...)
		}).FullBytes)
		addDER(mutateRaw(f, base, path, func(v asn1.RawValue) asn1.RawValue {
			v.Class = asn1.ClassContextSpecific
			v.FullBytes = nil
			return raw(f, v)
		}).FullBytes)
	}
	for _, path := range [][]int{{0, 0}, {0, 1, 0, 0}, {0, 1, 0, 1, 2, 0}, {0, 1, 1, 0}} {
		addDER(mutateRaw(f, base, path, func(asn1.RawValue) asn1.RawValue {
			return raw(f, asn1.ObjectIdentifier{1, 2, 3, 4})
		}).FullBytes)
	}
	addDER(mutateRaw(f, base, []int{0, 1, 0, 1, 0}, func(asn1.RawValue) asn1.RawValue {
		return alg(f, oidSHA256, raw(f, asn1.RawValue{Tag: asn1.TagNull})) // otherSource salt
	}).FullBytes)
	addDER(mutateRaw(f, base, []int{0, 1, 0, 1, 1}, func(asn1.RawValue) asn1.RawValue {
		return raw(f, asn1.RawValue{Tag: asn1.TagInteger, Bytes: []byte{1, 0, 0, 0, 0, 0, 0, 0, 0}})
	}).FullBytes)
	for _, der := range [][]byte{
		append(append([]byte{}, block.Bytes...), 0), block.Bytes[:len(block.Bytes)-1],
		{0x30, 0x80, 0, 0}, {0x30, 0x84, 0x7f, 0xff, 0xff, 0xff}, {0x30, 0x81, 0x7f},
	} {
		addDER(der)
	}
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
	// Start inside valid inner-key and CBC paths rather than relying on random
	// mutations to discover a complete RSA-3072 PKCS#8 object. Only synthetic keys.
	key, _, err := Load(fixture(f, "openssl-3.5-3072.pem"), []byte(fixturePassword))
	if err != nil {
		f.Fatal("synthetic seed unlock failed")
	}
	der, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		f.Fatal("synthetic seed encoding failed")
	}
	defer wipe(der)
	f.Add(append([]byte{}, der...))
	block, _ := aes.NewCipher(make([]byte, 32))
	for padding := 1; padding <= 16; padding++ {
		plain := append(bytes.Repeat([]byte{0x42}, 32-padding), bytes.Repeat([]byte{byte(padding)}, padding)...)
		f.Add(plain)
		bad := append([]byte{}, plain...)
		bad[len(bad)-padding] ^= 1
		f.Add(bad)
	}
	padding := 16 - len(der)%16
	padded := append(append([]byte{}, der...), bytes.Repeat([]byte{byte(padding)}, padding)...)
	f.Add(append([]byte{}, padded...))
	ciphertext := make([]byte, len(padded))
	cipher.NewCBCEncrypter(block, make([]byte, 16)).CryptBlocks(ciphertext, padded)
	f.Add(ciphertext)
	defer wipe(padded)
	fields, _ := sequenceDER(der, 3, 3)
	f.Add(seq(f, append(fields, raw(f, 0))...).FullBytes)
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
