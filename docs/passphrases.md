# Offline key passphrases

Use a cryptographically generated, uniformly random **24–32 character ASCII**
passphrase for OpenSSL key setup. Eight characters is too weak. Length and
upper/lower/digit/symbol checklists cannot establish entropy for a human-chosen
string. With uniform independent selection from 94 printable non-space ASCII
characters, 24 characters has about 157 bits of selection entropy and 32 has
about 210; these calculations describe that generation process, not a promise
about passphrase custody, endpoint compromise or the encrypted key file.

A trusted local password manager is the preferred generator. Never paste a
passphrase into this website or provide it as a command argument, environment
variable or piped receiver input. Use separate random temporary/final
passphrases; protect a recoverable backup separately from the encrypted key.
PBKDF2 slows guessing but cannot rescue a weak passphrase.

The following optional PowerShell example works without `GetInt32`, including
Windows PowerShell 5.1. Run it only on a trusted offline machine, outside any
transcript, screen recording or captured terminal. It deliberately displays the
generated passphrase; terminal scrollback and strings cannot be reliably wiped.
Do not run it inside an assistant session or paste its output into a chat.

The reusable local generator is [New-ZodiacPassphrase.ps1](../scripts/New-ZodiacPassphrase.ps1).
In your own trusted PowerShell console run `& .\scripts\New-ZodiacPassphrase.ps1`.
It defaults to 32 printable ASCII characters, requires explicit local confirmation,
refuses redirected input/output, and uses native `GetInt32(94)` on modern .NET or
cryptographic byte rejection below 188 on Windows PowerShell 5.1. It never writes a
file or copies to the clipboard. `-Length 24` is also supported; shorter than 24
is rejected. `-SelfTest` checks the complete unbiased mapping without generating
or displaying a password. The script cannot detect every transcript/recorder.

```powershell
$length = 32 # Choose 24 through 32.
$alphabet = -join (33..126 | ForEach-Object { [char]$_ })
$sample = New-Object byte[] 1
$characters = New-Object char[] $length
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
    for ($index = 0; $index -lt $length;) {
        $rng.GetBytes($sample)
        if ($sample[0] -ge 188) { continue } # 188 = 2 * 94; reject bias.
        $characters[$index] = $alphabet[$sample[0] % 94]
        $index++
    }
    Write-Host (-join $characters)
} finally {
    $rng.Dispose()
    [Array]::Clear($sample, 0, $sample.Length)
    [Array]::Clear($characters, 0, $characters.Length)
}
```

```csharp
     private const string ValidChars = "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";

        // Generates a password with symbols, numbers, upper, lower
        public static string GeneratePassword(int length = 32)
        {
            if (length < 24) throw new ArgumentOutOfRangeException(nameof(length));
            while (true)
            {
                // Native cryptographic randomness with unbiased alphabet selection.
                // The API does not promise a specific DRBG on every platform.
                string pwd = RandomNumberGenerator.GetString(ValidChars, length);
                if (MeetsPasswordComplexity(pwd))
                {
                    return pwd;
                }
            }
        }

        private static bool MeetsPasswordComplexity(string pwd)
        {
            bool hasLower = false;
            bool hasUpper = false;
            bool hasDigit = false;
            bool hasSymbol = false;
            foreach (char c in pwd)
            {
                if (char.IsAsciiLetterLower(c))
                    hasLower = true;
                else if (char.IsAsciiLetterUpper(c))
                    hasUpper = true;
                else if (char.IsAsciiDigit(c))
                    hasDigit = true;
                else
                    hasSymbol = true;

                if (hasLower && hasUpper && hasDigit && hasSymbol)
                    return true;
            }
            return false;
        }
```

Each accepted index has exactly two equally likely source bytes. Repeatedly
filling the same array only overwrites prior draws; it does not increase the
entropy of its final contents. No complexity retry loop is necessary for
uniform random selection. Modern .NET also offers `RandomNumberGenerator.GetString`
with a caller-supplied alphabet; its cryptographic RNG contract does not promise
one particular platform-independent DRBG construction. See Microsoft's
[RandomNumberGenerator API](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.randomnumbergenerator)
and [runtime implementation](https://github.com/dotnet/runtime/blob/main/src/libraries/System.Security.Cryptography/src/System/Security/Cryptography/RandomNumberGenerator.cs).

ASCII-only is currently a portability recommendation. UTF-8 file fixtures pass,
but Windows OpenSSL/receiver **interactive** non-ASCII compatibility is still
unclaimed. The receiver does not silently change, normalize or truncate a
passphrase or enforce a new key-file password policy.
