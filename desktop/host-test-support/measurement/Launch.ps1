[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ConfigPath,[Parameter(Mandatory=$true)][string]$ReceiptPath)
$ErrorActionPreference='Stop'
$began=[Diagnostics.Stopwatch]::GetTimestamp()
$config=Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$argsList=@($config.arguments)+@('--profile',$config.profile)
if($argsList | Where-Object {$_ -match '["\r\n]'}){throw 'Unsupported launch argument'}
$arguments=($argsList | ForEach-Object {'"'+$_+'"'}) -join ' '
$process=Start-Process -FilePath $config.runner -ArgumentList $arguments -WorkingDirectory (Split-Path $config.runner) -WindowStyle Normal -PassThru
$record=@{pid=$process.Id;scriptStartedQpc=$began;processStartedQpc=[Diagnostics.Stopwatch]::GetTimestamp()}
$temp=$ReceiptPath+'.tmp'
$record | ConvertTo-Json -Compress | Set-Content -LiteralPath $temp -Encoding UTF8
Move-Item -LiteralPath $temp -Destination $ReceiptPath
