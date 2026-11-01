[CmdletBinding()]
param([ValidateSet('Avalonia','Electron','WinUI','Reactor','Flutter','Qt','Slint','ReactNative','Wx','Both')][string]$Candidate='Both',[switch]$LayoutOnly,
 [string]$RunnerPath,[switch]$HighContrastProbe)
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
        $relative=if($name -eq 'WinUI'){'out/win-x64/NeutronStar-WinUI-Mvvm.exe'}elseif($name -eq 'Reactor'){'out/win-x64/NeutronStar-WinUI-Reactor.exe'}elseif($name -eq 'Flutter'){'build/windows/x64/runner/Release/neutronstar_flutter.exe'}elseif($name -eq 'Qt'){'out/win-x64/neutronstar_qt.exe'}elseif($name -eq 'Slint'){'out/win-x64/neutronstar-slint.exe'}elseif($name -eq 'Wx'){'out/win-x64/neutronstar_wx.exe'}elseif($name -eq 'ReactNative'){'out/win-x64/NeutronStar.exe'}elseif($native){'out/win-x64/NeutronStar-Avalonia.exe'}else{'out/NeutronStar-Electron-win32-x64/NeutronStar-Electron.exe'}
        $appRoot=Join-Path $root $(if($name -eq 'WinUI'){'WinUI3-cs-native-mvvm'}elseif($name -eq 'Reactor'){'WinUI3-cs-native-reactor'}elseif($name -eq 'Slint'){'slint-rust'}elseif($name -eq 'Wx'){'wxWidgets'}elseif($name -eq 'ReactNative'){'react-native-windows'}else{$name})
        $runner=Join-Path $appRoot $relative
        if($RunnerPath){$runner=[IO.Path]::GetFullPath($RunnerPath)}
        if($HighContrastProbe -and ($name -ne 'Qt' -or -not $RunnerPath)){throw 'HighContrastProbe requires an explicit Qt test runner.'}
        if(-not(Test-Path -LiteralPath $runner)){throw "Build $name first."}
        $output=Join-Path $appRoot ('.cache/check-'+[Guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $output -Force|Out-Null
        $config=@{App=$name;Runner=$runner;Assets=(Join-Path $appRoot 'dist');Profile=(Join-Path $output 'profile');Output=$output;Arguments=@();NativeUi=$native;LayoutOnly=[bool]$LayoutOnly}
        if($HighContrastProbe){$config.Arguments=@('--inject','contrast')}
        if($name -eq 'WinUI'){$config.EngineKind='native WinUI 3 / C# MVVM'}
        if($name -eq 'Reactor'){$config.EngineKind='native WinUI 3 / Reactor';$config.SemanticTimeoutMs=180000;$config.UiaTimeoutSeconds=30}
        if($name -eq 'Flutter'){$config.EngineKind='Flutter / Dart AOT'}
        if($name -eq 'Qt'){$config.EngineKind='Qt Quick / C++ / D3D11'}
        if($HighContrastProbe){$config.EngineKind+=' / test-only contrast palette (not OS high contrast)'}
        if($name -eq 'Slint'){$config.EngineKind='Slint / Rust / Skia'}
        if($name -eq 'Wx'){$config.EngineKind='wxWidgets / wxMSW Win32'}
        if($name -eq 'ReactNative'){$config.EngineKind='React Native Windows / Fabric / Hermes';$config.SemanticTimeoutMs=120000}
        $file=Join-Path $output 'config.json'
        [IO.File]::WriteAllText($file,($config|ConvertTo-Json))
        & dotnet ../.cache/candidate-checks-bin/CandidateChecks.dll $file
        if($LASTEXITCODE){throw "Candidate check failed; retain $output."}
    }
} finally {Pop-Location}
