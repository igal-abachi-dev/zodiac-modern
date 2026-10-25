$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$lock=Get-Content -LiteralPath (Join-Path $root 'packages.lock.json') -Raw | ConvertFrom-Json
$packages=@{}
foreach($framework in $lock.dependencies.PSObject.Properties){foreach($item in $framework.Value.PSObject.Properties){$packages[$item.Name]=$item.Value.resolved}}
$text=New-Object Text.StringBuilder
[void]$text.AppendLine('NeutronStar native WinUI dependency notices - resolved NuGet graph (includes build dependencies).')
[void]$text.AppendLine('The application uses standard WinUI Fluent controls and Microsoft.UI.Reactor (experimental preview). No commercial control package is selected.')
Add-Type -AssemblyName System.IO.Compression.FileSystem
foreach($name in ($packages.Keys|Sort-Object)){
    $version=$packages[$name]
    $lower=$name.ToLowerInvariant()
    $package=Join-Path $env:USERPROFILE ".nuget/packages/$lower/$version/$lower.$version.nupkg"
    if(-not(Test-Path -LiteralPath $package)){throw "Missing restored package for notices: $name $version"}
    [void]$text.AppendLine("`n=== $name $version ===")
    $archive=[IO.Compression.ZipFile]::OpenRead($package)
    try{
        foreach($entry in $archive.Entries){
            if($entry.Length -gt 1048576){continue}
            if($entry.Name -notmatch '(?i)^(LICENSE|COPYING|NOTICE|THIRD.PARTY.NOTICES|OFL)([._-].*)?$' -and -not $entry.Name.EndsWith('.nuspec')){continue}
            $reader=New-Object IO.StreamReader($entry.Open())
            try{[void]$text.AppendLine($entry.FullName);[void]$text.AppendLine($reader.ReadToEnd())}finally{$reader.Dispose()}
        }
    }finally{$archive.Dispose()}
}
foreach($file in Get-ChildItem -LiteralPath (Join-Path $root 'Assets/Notices') -File){[void]$text.AppendLine("`n=== $($file.Name) ===");[void]$text.AppendLine([IO.File]::ReadAllText($file.FullName))}
[void]$text.AppendLine([IO.File]::ReadAllText((Join-Path $root 'Assets/Fonts/OFL-NotoSansHebrew.txt')))
[IO.File]::WriteAllText((Join-Path $root 'out/win-x64/THIRD-PARTY-NOTICES.txt'),$text.ToString(),(New-Object Text.UTF8Encoding($false)))
