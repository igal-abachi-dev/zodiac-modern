using System.Security.Cryptography;
using System.Text.Json;

namespace NeutronStar.WinUIHost;

// Small immutable manifest-verified snapshot; no filesystem/native methods
// are exposed to JavaScript and requests never resolve arbitrary disk paths.
internal sealed class AssetStore
{
    private readonly Dictionary<string, byte[]> files = new(StringComparer.Ordinal);
    internal AssetStore(string root, string manifestPath)
    {
        root = Path.GetFullPath(root);
        RejectReparseAncestors(root);
        RejectReparseAncestors(manifestPath);
        using var manifest = JsonDocument.Parse(File.ReadAllBytes(manifestPath));
        foreach (var item in manifest.RootElement.GetProperty("files").EnumerateArray())
        {
            var name = item.GetProperty("path").GetString() ?? throw new InvalidDataException();
            if (!name.IsAscii() || AssetPolicy.ResourcePath(AssetPolicy.Origin + name) != name ||
                !AssetPolicy.Mime.ContainsKey(Path.GetExtension(name))) throw new InvalidDataException("Invalid asset name");
            var path = Path.GetFullPath(Path.Combine(root, name.Replace('/', Path.DirectorySeparatorChar)));
            if (!ContainsPath(root, path)) throw new InvalidDataException();
            RejectReparseAncestors(path);
            using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
            var size = item.GetProperty("bytes").GetInt32();
            if (size < 0 || size > AssetPolicy.MaxBytes || stream.Length != size) throw new InvalidDataException("Asset size mismatch");
            var bytes = new byte[size];
            stream.ReadExactly(bytes);
            if (!Convert.ToHexStringLower(SHA256.HashData(bytes)).Equals(item.GetProperty("sha256").GetString(), StringComparison.Ordinal))
                throw new InvalidDataException("Asset hash mismatch");
            files.Add(name, bytes);
        }
        var actual = Collect(root).Select(path => Path.GetRelativePath(root, path).Replace('\\', '/')).ToHashSet(StringComparer.Ordinal);
        if (!actual.SetEquals(files.Keys) || !files.ContainsKey("index.html")) throw new InvalidDataException("Asset set mismatch");
    }
    private static IEnumerable<string> Collect(string root)
    {
        foreach (var path in Directory.EnumerateFileSystemEntries(root))
        {
            RejectReparseAncestors(path);
            if (Directory.Exists(path)) { foreach (var child in Collect(path)) yield return child; }
            else yield return path;
        }
    }
    internal (int Status, string Mime, byte[] Bytes) Response(string method, string uri)
    {
        var path = AssetPolicy.ResourcePath(uri);
        if (method != "GET" || path is null || !AssetPolicy.Mime.TryGetValue(Path.GetExtension(path), out var mime))
            return (403, "text/plain; charset=utf-8", []);
        return files.TryGetValue(path, out var bytes) ? (200, mime, bytes) : (404, "text/plain; charset=utf-8", []);
    }
    internal static bool ContainsPath(string parent, string child) =>
        string.Equals(Path.GetFullPath(parent).TrimEnd(Path.DirectorySeparatorChar), Path.GetFullPath(child).TrimEnd(Path.DirectorySeparatorChar), StringComparison.OrdinalIgnoreCase) ||
        Path.GetFullPath(child).StartsWith(Path.GetFullPath(parent).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase);
    internal static void RejectReparseAncestors(string path)
    {
        string? current = Path.GetFullPath(path);
        while (current is not null)
        {
            if ((File.Exists(current) || Directory.Exists(current)) && (File.GetAttributes(current) & FileAttributes.ReparsePoint) != 0)
                throw new InvalidDataException("Reparse paths not accepted");
            current = Path.GetDirectoryName(current);
        }
    }
}

internal static class TextExtensions
{
    internal static bool IsAscii(this string value) => value.All(c => c < 128);
}
