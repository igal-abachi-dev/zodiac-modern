[CmdletBinding()]param([string]$Label='2026-11-05')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$desktop=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$output=Join-Path $PSScriptRoot "results/$Label"
New-Item -ItemType Directory -Path $output -Force|Out-Null
$apps=@('Tauri-v2-Svelte5','Avalonia','Electron','Flutter','Qt','react-native-windows','slint-rust','WinUI3-cs-native-mvvm','WinUI3-cs-native-reactor','wxWidgets','Dear-ImGui-dx11-12')
$evidence=@()
$gallery=[Drawing.Bitmap]::new(1920,1056)
$g=[Drawing.Graphics]::FromImage($gallery)
$g.Clear([Drawing.Color]::White)
$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$font=[Drawing.Font]::new('Segoe UI',12)
try {
    foreach($app in $apps){
        $checks=@(Get-ChildItem (Join-Path $desktop "$app/.cache") -Directory -Filter 'check-*'|Sort-Object LastWriteTime -Descending)
        $selected=$null
        $receipt=Join-Path $desktop "$app/.cache/build-receipt.json"
        if(-not(Test-Path -LiteralPath $receipt)){$receipt=Join-Path $desktop "$app/.cache-build-receipt.json"}
        $receiptHash=if(Test-Path -LiteralPath $receipt){(Get-FileHash -LiteralPath $receipt).Hash}else{$null}
        foreach($check in $checks){
            $file=Join-Path $check.FullName 'result.json'
            if(-not(Test-Path -LiteralPath $file)){continue}
            $result=Get-Content -LiteralPath $file -Raw|ConvertFrom-Json
            $current=if($app -eq 'Dear-ImGui-dx11-12'){$result.runnerSha256 -eq (Get-FileHash -LiteralPath (Join-Path $desktop "$app/out/clang-cl-ninja-x64/neutronstar_imgui_probe.exe")).Hash}else{$receiptHash -and $result.buildReceiptSha256 -eq $receiptHash}
            if($current -and $result.status -eq 'passed'  -and ($app -ne 'Dear-ImGui-dx11-12' -or ($result.requested -eq 'dx12' -and $result.scope -notlike 'production*'))){$selected=$check;break}
        }
        if(-not $selected){throw "No accepted capture for $app"}
        $names=if($app -eq 'Dear-ImGui-dx11-12'){@('main.png','narrow.png','running.png','workbench.png','filter-focus.png')}else{@('initial-main-client.png','about-client.png','workbench-client.png','narrow-client.png','running-client.png','filter-focus-client.png','wide-client.png')}
        $dest=Join-Path $output $app
        New-Item -ItemType Directory -Path $dest -Force|Out-Null
        $files=@()
        foreach($name in $names){
            $source=Join-Path $selected.FullName $name
            if(Test-Path -LiteralPath $source){Copy-Item -LiteralPath $source -Destination $dest -Force;$files+=@{path="$app/$name";sha256=(Get-FileHash -LiteralPath $source).Hash}}
        }
        Copy-Item -LiteralPath (Join-Path $selected.FullName 'result.json') -Destination $dest -Force
        $receipt=Join-Path $desktop "$app/.cache/build-receipt.json"
        if(-not(Test-Path -LiteralPath $receipt)){$receipt=Join-Path $desktop "$app/.cache-build-receipt.json"}
        if(Test-Path -LiteralPath $receipt){Copy-Item -LiteralPath $receipt -Destination (Join-Path $dest 'build-receipt.json') -Force}
        $evidence+=@{app=$app;check=$selected.FullName.Substring($desktop.Length+1).Replace('\','/');status=$result.status;runnerSha256=$result.runnerSha256;captures=$files}
        $image=[Drawing.Image]::FromFile((Join-Path $dest $names[0]))
        try {
            $i=$evidence.Count-1;$x=($i%4)*480;$y=[Math]::Floor($i/4)*352
            $g.DrawString($app,$font,[Drawing.Brushes]::Black,$x+8,$y+4)
            $g.DrawImage($image,[Drawing.Rectangle]::new($x,$y+32,480,320))
        }finally{$image.Dispose()}
    }
    $gallery.Save((Join-Path $output 'main-gallery.png'),[Drawing.Imaging.ImageFormat]::Png)
    @{scope='Visual QA; 960x640 DIP client; standard controls, no replacement painting; not comparative performance or a percentage score';evidence=$evidence}|ConvertTo-Json -Depth 8|Set-Content (Join-Path $output 'manifest.json') -Encoding UTF8
}finally{$font.Dispose();$g.Dispose();$gallery.Dispose()}
Write-Output $output
