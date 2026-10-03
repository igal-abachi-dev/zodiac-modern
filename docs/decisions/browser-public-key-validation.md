# Exact public RSA modulus validation

KEY-01's real-browser negative corpus exposed a Firefox compatibility difference:
a synthetic SPKI with an actual 3071-bit modulus was imported with
`RsaHashedKeyAlgorithm.modulusLength` reported as 3072. The prior metadata-only
policy therefore accepted a key outside the specified support set. The adjacent
4095-bit case is included in the same regression corpus.

The browser now exports the imported **public** key as native JWK and checks its
actual integer representation: modulus is exactly 384 or 512 bytes with its high
bit set, exponent is canonical `AQAB` (65537), and algorithm metadata agrees.
Native SPKI re-export still must equal the full original DER byte-for-byte before
the canonical SPKI SHA-256 fingerprint is computed. There is no handwritten
ASN.1 parser or cryptographic primitive. Public extractability is needed for
these validation exports; AES remains nonextractable in the separate hybrid core.

The [WebCrypto specification](https://www.w3.org/TR/WebCryptoAPI/#rsa-oaep)
defines SPKI/JWK RSA-OAEP import/export and modulus metadata. Explicitly validating
the native-exported public integer avoids relying on a runtime's metadata
rounding. This preserves the existing exact RSA-3072/4096/e=65537 policy and
compatible envelope; it introduces no new algorithm or key format accepted by
the website. JWK export is internal validation, not a user-facing import format.

Both Node build validation and browser validation reject canonical-Base64 aliases,
trailing DER, malformed containers, wrong labels/types/sizes/exponents and
oversized inputs. Accepted ASCII PEM is bounded before UTF-8/DER allocation.
Browser errors use controlled descriptions and never return pasted key data.
Real Chromium/Firefox tests are the evidence; Node WebCrypto alone would not
have exercised this browser difference.
