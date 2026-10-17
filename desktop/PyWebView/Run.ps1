[CmdletBinding()]
param([string]$ProfilePath,[switch]$Source)
$ErrorActionPreference='Stop'
if(-not $ProfilePath){$ProfilePath=Join-Path $PSScriptRoot '.cache/interactive-profile'}
$ProfilePath=[IO.Path]::GetFullPath($ProfilePath)
if($ProfilePath.Contains('"')){throw 'Invalid profile path.'}
$exe=Join-Path $PSScriptRoot 'dist/neutronstar-pywebview/neutronstar-pywebview.exe'
$arguments=@('--profile',('"'+$ProfilePath+'"'))
if($Source){$exe=Join-Path $PSScriptRoot '.venv/Scripts/pythonw.exe';$arguments=@(('"'+(Join-Path $PSScriptRoot 'app.py')+'"'))+$arguments}
if(-not(Test-Path -LiteralPath $exe)){throw 'Run init.cmd / Build.ps1 first.'}
Start-Process -FilePath $exe -ArgumentList $arguments -WorkingDirectory $PSScriptRoot -WindowStyle Normal
