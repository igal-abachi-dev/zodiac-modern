using NeutronStar.WinUIHost;

var assertions = 0;
void Check(bool condition) { assertions++; if (!condition) throw new Exception($"Assertion {assertions} failed"); }
var origin = AssetPolicy.Origin;
Check(AssetPolicy.ResourcePath(origin) == "index.html");
Check(AssetPolicy.ResourcePath(origin + "assets/index.js?v=1#route") == "assets/index.js");
foreach (var path in new[] { "../index.html", "%2e%2e/index.html", "assets%2findex.js", "%5cindex.html", "%ff.html", "%", "%00.html", "CON.txt", "LPT1.js", "a//b.js", "a./b.js", "a%3ab.js", "a%252eb.js", "a%20/b.js" })
    Check(AssetPolicy.ResourcePath(origin + path) is null);
foreach (var uri in new[] { "http://neutronstar.invalid/", "https://neutronstar.invalid.evil/index.html", "https://user@neutronstar.invalid/index.html", "file:///index.html" })
    Check(AssetPolicy.ResourcePath(uri) is null);
Check(AssetPolicy.Headers("text/html").Contains("style-src-attr 'none'"));
var root = Path.GetFullPath(args[0]);
var store = new AssetStore(root, root + ".manifest.json");
Check(store.Response("GET", origin).Status == 200);
Check(store.Response("GET", origin + "missing.js").Status == 404);
Check(store.Response("GET", origin + "missing.map").Status == 403);
Check(store.Response("POST", origin).Status == 403);
Check(store.Response("GET", "https://example.com/").Status == 403);
// Mutate a task-owned fixture to verify integrity and exact-set rejection.
var scratch = Path.Combine(Path.GetDirectoryName(root)!, ".cache", "policy-" + Guid.NewGuid().ToString("N"));
Directory.CreateDirectory(scratch);
File.WriteAllText(Path.Combine(scratch, "index.html"), "changed");
var manifest = scratch + ".manifest.json";
File.WriteAllText(manifest, "{\"files\":[{\"path\":\"index.html\",\"bytes\":7,\"sha256\":\"bad\"}]}");
try { _ = new AssetStore(scratch, manifest); Check(false); }
catch (InvalidDataException) { Check(true); }
File.WriteAllText(Path.Combine(scratch, "index.html"), "ok");
var hash = Convert.ToHexStringLower(System.Security.Cryptography.SHA256.HashData("ok"u8));
File.WriteAllText(manifest, $"{{\"files\":[{{\"path\":\"index.html\",\"bytes\":2,\"sha256\":\"{hash}\"}}]}}");
_ = new AssetStore(scratch, manifest);
File.WriteAllText(Path.Combine(scratch, "extra.txt"), "extra");
try { _ = new AssetStore(scratch, manifest); Check(false); }
catch (InvalidDataException) { Check(true); }
Check(!AssetStore.ContainsPath(root, root + "-other"));
Check(AssetStore.ContainsPath(root, Path.Combine(root, "index.html")));
Console.WriteLine($"PASS {assertions} policy/integrity assertions");
