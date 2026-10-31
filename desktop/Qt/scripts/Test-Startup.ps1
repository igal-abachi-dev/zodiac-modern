[CmdletBinding()]param()
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$folder=Join-Path $root ('.cache/startup-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $folder | Out-Null
$app=Join-Path $root 'out/win-x64/neutronstar_qt.exe'
$probe=Join-Path $root 'out/clang-cl-ninja-x64/Release/neutronstar_qt_probe.exe'
$kit=if($env:QT_ROOT){$env:QT_ROOT}else{[IO.Path]::GetFullPath((Join-Path $root '../.cache/qt-toolchain/6.12.0/msvc2022_64'))}
$results=@()
function Read-Events([string]$path,[switch]$Final) {
 if(-not(Test-Path -LiteralPath $path)){if($Final){throw 'Missing diagnostic report'};return}
 $stream=[IO.File]::Open($path,[IO.FileMode]::Open,[IO.FileAccess]::Read,([IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete))
 $reader=[IO.StreamReader]::new($stream,[Text.Encoding]::UTF8,$true)
 try{$text=$reader.ReadToEnd()}finally{$reader.Dispose()}
 $end=$text.LastIndexOf("`n")
 if($Final -and $end -ne $text.Length-1){throw 'Incomplete diagnostic record after exit'}
 if($end -lt 0){return}
 $text.Substring(0,$end+1) -split '\r?\n' | Where-Object {$_} | ForEach-Object {$_|ConvertFrom-Json}
}
function Run-Case([string]$name,[string]$exe,[string[]]$extra,[string]$expected,[string]$backend='', [bool]$live=$false) {
 $report=Join-Path $folder ($name+'.jsonl')
 $start=New-Object Diagnostics.ProcessStartInfo
 $start.FileName=$exe;$start.WorkingDirectory=$folder;$start.UseShellExecute=$false;$start.CreateNoWindow=$true
 $start.WindowStyle='Hidden'
 foreach($key in @($start.EnvironmentVariables.Keys)){if($key -match '^(QT_|QML|QSG_)'){$start.EnvironmentVariables.Remove($key)}}
 $start.EnvironmentVariables['PATH']=if($exe -eq $app){"$env:SystemRoot/System32;$env:SystemRoot"}else{(Join-Path $kit 'bin')+";$env:SystemRoot/System32;$env:SystemRoot"}
 if($backend){$start.EnvironmentVariables['QT_QUICK_BACKEND']=$backend}
 if($name -eq 'software-adapter-refused'){$start.EnvironmentVariables['QSG_RHI_PREFER_SOFTWARE_RENDERER']='1'}
 $start.Arguments='--no-dialogs --diagnostics "'+$report+'" '+($extra -join ' ')
 $p=[Diagnostics.Process]::Start($start)
 try {
  if($live){
   $deadline=[DateTime]::UtcNow.AddSeconds(30)
   do {Start-Sleep -Milliseconds 50;$events=@(Read-Events $report);if(@($events|Where-Object event -eq 'ready').Count){break}}while(-not $p.HasExited -and [DateTime]::UtcNow -lt $deadline)
   if(-not @($events|Where-Object event -eq 'ready').Count){throw 'Isolated deployment never reached verified Ready'}
   $published=[IO.Path]::GetDirectoryName($app)
   $modules=@($p.Modules|Where-Object {$_.ModuleName -match '^(Qt6|msvcp140|vcruntime140)'})
   if(-not $modules.Count){throw 'No Qt/CRT modules observed'}
   foreach($module in $modules){if([IO.Path]::GetDirectoryName($module.FileName) -ne $published){throw 'Qt/CRT dependency escaped the published app folder'}}
   $script:results+=@{case='isolated-module-origins';status='passed';modules=@($modules|ForEach-Object {$_.ModuleName})}
   if(-not $p.CloseMainWindow()){throw 'Unable to close isolated deployment window'}
  }
  if(-not $p.WaitForExit(35000)){throw "$name exceeded deadline"};$p.Refresh()
  $events=@(Read-Events $report -Final)
  if($expected -eq 'ready'){if($p.ExitCode -ne 0 -or -not @($events|Where-Object {$_.event -eq 'ready' -and $_.verifiedHardware}).Count){throw "$name did not verify hardware"}}
  elseif($p.ExitCode -ne 2 -or -not @($events|Where-Object {$_.event -eq 'failed' -and $_.code -eq $expected}).Count){throw "$name failed with the wrong diagnostic"}
  $script:results+=@{case=$name;status='passed';exitCode=$p.ExitCode;report=$report}
 }finally{if(-not $p.HasExited){$null=$p.CloseMainWindow();$null=$p.WaitForExit(5000)};$p.Dispose()}
}
Run-Case 'isolated-deployment' $app @() 'ready' '' $true
Run-Case 'font-failure' $probe @('--inject','font') 'font'
Run-Case 'qml-failure' $probe @('--inject','qml') 'qml'
Run-Case 'scene-graph-policy' $probe @('--inject','scene-graph') 'scene-graph'
Run-Case 'software-backend-refused' $app @() 'graphics-api' 'software'
Run-Case 'software-adapter-refused' $app @() 'software-adapter'
Run-Case 'renderer-override-refused' $app @('--verify-startup') 'renderer-override' 'software'
$results|ConvertTo-Json -Depth 6|Set-Content -Encoding UTF8 (Join-Path $folder 'result.json')
Write-Output "PASS startup/deployment diagnostics: $folder"
