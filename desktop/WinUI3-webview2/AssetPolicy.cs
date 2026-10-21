using System.Text;

namespace NeutronStar.WinUIHost;

internal static class AssetPolicy
{
    internal const string Origin = "https://neutronstar.invalid/";
    internal const string Csp = "default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none'; img-src 'self'; font-src 'self'; connect-src 'self'; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
    internal const int MaxBytes = 32 * 1024 * 1024;
    internal static readonly Dictionary<string, string> Mime = new(StringComparer.Ordinal)
    {
        [".html"]="text/html; charset=utf-8",[".js"]="text/javascript; charset=utf-8",[".mjs"]="text/javascript; charset=utf-8",
        [".css"]="text/css; charset=utf-8",[".json"]="application/json",[".txt"]="text/plain; charset=utf-8",
        [".svg"]="image/svg+xml",[".png"]="image/png",[".jpg"]="image/jpeg",[".jpeg"]="image/jpeg",
        [".webp"]="image/webp",[".ico"]="image/x-icon",[".woff"]="font/woff",[".woff2"]="font/woff2"
    };
    internal static string? ResourcePath(string uri)
    {
        if (uri.Length > 8192 || !uri.StartsWith(Origin, StringComparison.Ordinal)) return null;
        var encoded = uri[Origin.Length..].Split('?', '#')[0];
        if (encoded.Length == 0) return "index.html";
        if (encoded.Any(c => c > 127)) return null;
        var bytes = new List<byte>(encoded.Length);
        for (var i = 0; i < encoded.Length; i++)
        {
            byte value;
            if (encoded[i] == '%')
            {
                if (i + 2 >= encoded.Length || !byte.TryParse(encoded.AsSpan(i + 1, 2), System.Globalization.NumberStyles.AllowHexSpecifier, System.Globalization.CultureInfo.InvariantCulture, out value)) return null;
                i += 2;
                if (value is (byte)'/' or (byte)'\\') return null;
            }
            else value = (byte)encoded[i];
            bytes.Add(value);
        }
        string decoded;
        try { decoded = new UTF8Encoding(false, true).GetString(bytes.ToArray()); }
        catch (DecoderFallbackException) { return null; }
        return decoded.Split('/').All(SafeSegment) ? decoded : null;
    }
    internal static bool SafeSegment(string part)
    {
        if (part.Length == 0 || part is "." or ".." || part.EndsWith('.') || part.EndsWith(' ') ||
            part.Any(c => c < 32 || c == 127 || "\\:%<>\"|?*".Contains(c))) return false;
        var stem = part.Split('.')[0].ToUpperInvariant();
        if (stem is "CON" or "PRN" or "AUX" or "NUL" or "CONIN$" or "CONOUT$") return false;
        return !(stem.Length == 4 && (stem.StartsWith("COM", StringComparison.Ordinal) || stem.StartsWith("LPT", StringComparison.Ordinal)) &&
            (char.IsAsciiDigit(stem[3]) || "¹²³".Contains(stem[3])));
    }
    internal static string Headers(string mime) =>
        $"Content-Type: {mime}\r\nContent-Security-Policy: {Csp}\r\nX-Content-Type-Options: nosniff\r\nCache-Control: no-store\r\nReferrer-Policy: no-referrer\r\n";
}
