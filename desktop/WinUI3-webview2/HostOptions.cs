namespace NeutronStar.WinUIHost;

internal sealed record HostOptions(string Profile)
{
    internal static HostOptions Parse(string[] args)
    {
        if (Environment.GetEnvironmentVariables().Keys.Cast<string>().Any(key => key.StartsWith("WEBVIEW2_", StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException("Remove WebView2 environment overrides");
        var profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "NeutronStar", "WinUI3-WebView2", "Profile");
        if (args.Length != 0)
        {
            if (args.Length != 2 || args[0] != "--profile" || !Path.IsPathFullyQualified(args[1]))
                throw new ArgumentException("Only --profile <absolute directory> is supported");
            profile = args[1];
        }
        profile = Path.GetFullPath(profile);
        if (profile.StartsWith(@"\\", StringComparison.Ordinal)) throw new ArgumentException("Local profile required");
        var assets = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "Frontend"));
        if (AssetStore.ContainsPath(assets, profile) || AssetStore.ContainsPath(profile, assets))
            throw new ArgumentException("Separate profile and assets required");
        AssetStore.RejectReparseAncestors(profile);
        Directory.CreateDirectory(profile);
        AssetStore.RejectReparseAncestors(profile);
        return new(profile);
    }
}
