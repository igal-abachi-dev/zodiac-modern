[CmdletBinding()]param([ValidateSet('auto','dx12','dx11')][string]$Renderer='auto',[switch]$AllowSoftware)
$ErrorActionPreference='Stop'
$runner=Join-Path $PSScriptRoot 'out/win-x64/neutronstar_imgui.exe'
if(-not(Test-Path $runner)){throw 'Build first with Build.ps1.'}
$arguments=@('--renderer',$Renderer)
if($AllowSoftware){$arguments+='--allow-software'}
Start-Process -FilePath $runner -ArgumentList $arguments -WorkingDirectory (Split-Path $runner) -WindowStyle Normal
