// The M0 receiver currently exposes key verification only. Authenticated message
// decryption and exclusive private output belong to REC-02 and are not enabled.
package main

import (
	"bytes"
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/signal"
	"runtime"
	"zodiac-modern/receiver/internal/cli"
	"zodiac-modern/receiver/internal/keyfile"
)

func main() { os.Exit(run(os.Args[1:])) }
func run(args []string) int {
	return runWithPrompt(args, cli.Prompt)
}
func runWithPrompt(args []string, prompt func(context.Context) ([]byte, error)) int {
	if len(args) == 1 && (args[0] == "--help" || args[0] == "help") {
		fmt.Println("zodiac-decrypt verify-key --key encrypted.pem --public public.pem\nM0 development build; decrypt is not yet implemented. Passphrases are entered only in a hidden controlling-terminal prompt.")
		return 0
	}
	if len(args) == 1 && args[0] == "--version" {
		fmt.Println("zodiac-decrypt 0.0.1-dev (unreviewed, unsigned)")
		return 0
	}
	if len(args) == 0 || args[0] != "verify-key" {
		fmt.Fprintln(os.Stderr, "expected verify-key; use --help")
		return 2
	}
	flags := flag.NewFlagSet("verify-key", flag.ContinueOnError)
	flags.SetOutput(io.Discard)
	keyPath := flags.String("key", "", "encrypted private PEM path")
	publicPath := flags.String("public", "", "public SPKI PEM path")
	if flags.Parse(args[1:]) != nil || flags.NArg() != 0 || *keyPath == "" || *publicPath == "" {
		fmt.Fprintln(os.Stderr, "verify-key requires --key and --public paths")
		return 2
	}
	canonical, code, err := readPublic(*publicPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return code
	}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()
	password, err := prompt(ctx)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		if errors.Is(err, cli.ErrCanceled) {
			return 130
		}
		return 2
	}
	defer func() { clear(password); runtime.KeepAlive(password) }()
	private, fingerprint, err := keyfile.LoadFile(*keyPath, password)
	if err != nil {
		if errors.Is(err, keyfile.ErrUnlock) {
			fmt.Fprintln(os.Stderr, keyfile.ErrUnlock)
			return 3
		}
		fmt.Fprintln(os.Stderr, "unable to read key file")
		return 5
	}
	defer func() { private = nil }()
	actual, _ := x509.MarshalPKIXPublicKey(&private.PublicKey)
	if !bytes.Equal(actual, canonical) {
		fmt.Fprintln(os.Stderr, "public key does not match private key")
		return 2
	}
	fmt.Printf("RSA-%d SHA-256 %s\n", private.N.BitLen(), fingerprint)
	return 0
}
func readPublic(path string) ([]byte, int, error) {
	invalid := errors.New("invalid public key")
	file, err := os.Open(path)
	if err != nil {
		return nil, 5, errors.New("unable to read public file")
	}
	defer file.Close()
	publicPEM, err := io.ReadAll(io.LimitReader(file, 16385))
	if err != nil || len(publicPEM) > 16384 {
		return nil, 2, invalid
	}
	trimmed := bytes.Trim(publicPEM, " \t\r\n")
	block, rest := pem.Decode(trimmed)
	if !bytes.HasPrefix(trimmed, []byte("-----BEGIN PUBLIC KEY-----")) || bytes.Count(trimmed, []byte("-----BEGIN ")) != 1 || block == nil || block.Type != "PUBLIC KEY" || len(block.Headers) != 0 || len(bytes.Trim(rest, " \t\r\n")) != 0 {
		return nil, 2, invalid
	}
	public, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, 2, invalid
	}
	rsaPublic, ok := public.(*rsa.PublicKey)
	if !ok || rsaPublic.E != 65537 || (rsaPublic.N.BitLen() != 3072 && rsaPublic.N.BitLen() != 4096) {
		return nil, 2, invalid
	}
	canonical, err := x509.MarshalPKIXPublicKey(rsaPublic)
	if err != nil || !bytes.Equal(canonical, block.Bytes) {
		return nil, 2, invalid
	}
	return canonical, 0, nil
}
