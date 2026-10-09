// Offline receiver. Plaintext is written only to a new private local disk file,
// after authentication. No listener, secret arguments or plaintext stdout.
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
	"zodiac-modern/receiver/internal/envelope"
	"zodiac-modern/receiver/internal/keyfile"
	"zodiac-modern/receiver/internal/localfile"
)

func main() { os.Exit(run(os.Args[1:])) }
func run(args []string) int {
	return runWithPrompt(args, cli.Prompt)
}
func runWithPrompt(args []string, prompt func(context.Context) ([]byte, error)) int {
	return runWithPromptAndFinish(args, prompt, cli.WaitForFinish)
}
func runWithPromptAndFinish(args []string, prompt func(context.Context) ([]byte, error), finish func(context.Context) error) int {
	if len(args) == 1 && (args[0] == "--help" || args[0] == "help") {
		fmt.Println("zodiac-decrypt verify-key --key encrypted.pem --public public.pem\nzodiac-decrypt decrypt --key encrypted.pem --in ciphertext.txt --out new-message.txt [--cleanup-output] [--single-use-key]\nUnsigned development build; Windows local fixed-disk files only. Passphrases use a hidden controlling-terminal prompt. Plaintext files persist unless best-effort cleanup is explicitly requested. --single-use-key explicitly opts in to best-effort deletion of this private-key file after successful decryption and a finish prompt. No erasure guarantee. Exits: input/usage 2, key unlock 3, message failure 4, local I/O/cleanup 5, cancel 130.")
		return 0
	}
	if len(args) == 1 && args[0] == "--version" {
		fmt.Println("zodiac-decrypt 0.0.1-dev (unreviewed, unsigned)")
		return 0
	}
	if len(args) > 0 && args[0] == "decrypt" {
		return runDecrypt(args[1:], prompt, finish)
	}
	if len(args) == 0 || args[0] != "verify-key" {
		fmt.Fprintln(os.Stderr, "expected verify-key or decrypt; use --help")
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
	private, fingerprint, err := readKey(*keyPath, password)
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
	publicPEM, err := localfile.Read(path, 16384)
	if errors.Is(err, localfile.ErrLimit) {
		return nil, 2, invalid
	}
	if err != nil {
		return nil, 5, errors.New("unable to read public file")
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

func readKey(path string, password []byte) (*rsa.PrivateKey, string, error) {
	defer func() { clear(password); runtime.KeepAlive(password) }()
	encoded, err := localfile.Read(path, keyfile.MaxPEMBytes)
	defer func() { clear(encoded); runtime.KeepAlive(encoded) }()
	if errors.Is(err, localfile.ErrLimit) {
		return nil, "", keyfile.ErrUnlock
	}
	if err != nil {
		return nil, "", err
	}
	return keyfile.Load(encoded, password)
}

func runDecrypt(args []string, prompt func(context.Context) ([]byte, error), finish func(context.Context) error) int {
	flags := flag.NewFlagSet("decrypt", flag.ContinueOnError)
	flags.SetOutput(io.Discard)
	keyPath := flags.String("key", "", "encrypted private PEM path")
	inPath := flags.String("in", "", "canonical ciphertext file")
	outPath := flags.String("out", "", "new private plaintext file")
	cleanupOutput := flags.Bool("cleanup-output", false, "after a finish prompt, best-effort overwrite and delete the output file")
	singleUseKey := flags.Bool("single-use-key", false, "explicitly mark this key file single-use and best-effort overwrite/delete it after decryption")
	if flags.Parse(args) != nil || flags.NArg() != 0 || *keyPath == "" || *inPath == "" || *outPath == "" {
		fmt.Fprintln(os.Stderr, "decrypt requires --key, --in and --out paths")
		return 2
	}
	for _, path := range []string{*keyPath, *inPath, *outPath} {
		if localfile.Validate(path) != nil {
			fmt.Fprintln(os.Stderr, localfile.ErrPath)
			return 5
		}
	}
	if *cleanupOutput || *singleUseKey {
		fmt.Fprintln(os.Stderr, localfile.SnapshotAdvisory())
	}
	raw, err := localfile.Read(*inPath, envelope.MaxRaw)
	if errors.Is(err, localfile.ErrLimit) {
		fmt.Fprintln(os.Stderr, envelope.ErrInput)
		return 2
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, "unable to read ciphertext file")
		return 5
	}
	encoded, err := envelope.Decode(raw)
	if err != nil {
		fmt.Fprintln(os.Stderr, envelope.ErrInput)
		return 2
	}
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt)
	defer cancel()
	password, err := prompt(ctx)
	defer func() { clear(password); runtime.KeepAlive(password) }()
	if err != nil {
		if errors.Is(err, cli.ErrCanceled) || errors.Is(err, context.Canceled) {
			fmt.Fprintln(os.Stderr, cli.ErrCanceled)
			return 130
		}
		fmt.Fprintln(os.Stderr, "unable to read hidden passphrase")
		return 2
	}
	private, _, err := readKey(*keyPath, password)
	if ctx.Err() != nil {
		fmt.Fprintln(os.Stderr, cli.ErrCanceled)
		return 130
	}
	if err != nil {
		if errors.Is(err, keyfile.ErrUnlock) {
			fmt.Fprintln(os.Stderr, keyfile.ErrUnlock)
			return 3
		}
		fmt.Fprintln(os.Stderr, "unable to read key file")
		return 5
	}
	plain, err := envelope.Decrypt(encoded, private)
	private = nil
	defer func() { clear(plain); runtime.KeepAlive(plain) }()
	if ctx.Err() != nil {
		fmt.Fprintln(os.Stderr, cli.ErrCanceled)
		return 130
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, envelope.ErrDecrypt)
		return 4
	}
	if err := localfile.Write(ctx, *outPath, plain); err != nil {
		if errors.Is(err, context.Canceled) {
			fmt.Fprintln(os.Stderr, cli.ErrCanceled)
			return 130
		}
		fmt.Fprintln(os.Stderr, "unable to create new private local output file")
		return 5
	}
	fmt.Println("Authenticated message written to the requested new private file.")
	clear(plain)
	runtime.KeepAlive(plain)
	plain = nil
	if !*cleanupOutput && !*singleUseKey {
		return 0
	}
	finishErr := finish(ctx)
	if finishErr != nil && !errors.Is(finishErr, cli.ErrCanceled) && !errors.Is(finishErr, context.Canceled) {
		fmt.Fprintln(os.Stderr, "cleanup skipped: unable to wait safely on the controlling terminal; files remain")
		return 5
	}
	finishCanceled := errors.Is(finishErr, cli.ErrCanceled) || errors.Is(finishErr, context.Canceled)
	cleanupFailed := false
	if *cleanupOutput {
		if err := localfile.SecureDelete(*outPath); err != nil {
			fmt.Fprintln(os.Stderr, "plaintext output cleanup failed; file may remain")
			cleanupFailed = true
		} else {
			fmt.Println("Plaintext output best-effort overwrite/delete completed; physical erasure is not guaranteed.")
		}
	}
	if *singleUseKey {
		if err := localfile.SecureDelete(*keyPath); err != nil {
			fmt.Fprintln(os.Stderr, "single-use private-key cleanup failed; file may remain")
			cleanupFailed = true
		} else {
			fmt.Println("Selected private-key file best-effort overwrite/delete completed; other copies are not checked.")
		}
	}
	if cleanupFailed {
		return 5
	}
	if finishCanceled || ctx.Err() != nil {
		return 130
	}
	return 0
}
