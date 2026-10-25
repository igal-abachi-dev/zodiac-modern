[CmdletBinding()]
param([ValidateSet('Avalonia','Electron','WinUI','Reactor','Flutter','Both')][string]$Candidate='Both',[switch]$LayoutOnly)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
Push-Location $PSScriptRoot
try {
    & dotnet restore CandidateChecks.csproj --locked-mode --configfile NuGet.Config
    if($LASTEXITCODE){throw 'Checker restore failed.'}
    & dotnet build CandidateChecks.csproj -c Release --no-restore -o ../.cache/candidate-checks-bin
    if($LASTEXITCODE){throw 'Checker build failed.'}
    $names=if($Candidate -eq 'Both'){@('Avalonia','Electron')}else{@($Candidate)}
    foreach($name in $names){
        $native=$name -ne 'Electron'
        $relative=if($name -eq 'WinUI'){'out/win-x64/NeutronStar-WinUI-Mvvm.exe'}elseif($name -eq 'Reactor'){'out/win-x64/NeutronStar-WinUI-Reactor.exe'}elseif($name -eq 'Flutter'){'build/windows/x64/runner/Release/neutronstar_flutter.exe'}elseif($native){'out/win-x64/NeutronStar-Avalonia.exe'}else{'out/NeutronStar-Electron-win32-x64/NeutronStar-Electron.exe'}
        $appRoot=Join-Path $root $(if($name -eq 'WinUI'){'WinUI3-cs-native-mvvm'}elseif($name -eq 'Reactor'){'WinUI3-cs-native-reactor'}else{$name})
        $runner=Join-Path $appRoot $relative
        if(-not(Test-Path -LiteralPath $runner)){throw "Build $name first."}
        $output=Join-Path $appRoot ('.cache/check-'+[Guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $output -Force|Out-Null
        $config=@{App=$name;Runner=$runner;Assets=(Join-Path $appRoot 'dist');Profile=(Join-Path $output 'profile');Output=$output;Arguments=@();NativeUi=$native;LayoutOnly=[bool]$LayoutOnly}
        if($name -eq 'WinUI'){$config.EngineKind='native WinUI 3 / C# MVVM'}
        if($name -eq 'Reactor'){$config.EngineKind='native WinUI 3 / Reactor';$config.SemanticTimeoutMs=180000;$config.UiaTimeoutSeconds=30}
        if($name -eq 'Flutter'){$config.EngineKind='Flutter / Dart AOT'}
        $file=Join-Path $output 'config.json'
        [IO.File]::WriteAllText($file,($config|ConvertTo-Json))
        & dotnet ../.cache/candidate-checks-bin/CandidateChecks.dll $file
        if($LASTEXITCODE){throw "Candidate check failed; retain $output."}
    }
} finally {Pop-Location}
