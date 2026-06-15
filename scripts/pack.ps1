# NS Turing - CCX Packaging Script
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DistDir     = Join-Path $ProjectRoot "dist"
$CcxFile     = Join-Path $DistDir "NS-Turing-v1.0.0.ccx"

# Clean
if (Test-Path $DistDir) { Remove-Item -Recurse -Force $DistDir -ErrorAction SilentlyContinue }
Start-Sleep 1
New-Item -ItemType Directory -Path $DistDir -Force | Out-Null

# Collect only needed files into temp staging dir
$StageDir = Join-Path $env:TEMP "ns-turing-ccx-stage"
if (Test-Path $StageDir) { Remove-Item -Recurse -Force $StageDir -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $StageDir -Force | Out-Null

# Copy root-level files (manifest.json, index.html, main.js, style.css)
$ExcludeRoot = @("test.psd", "debug.json", "DEVELOPMENT.md")
Get-ChildItem -Path $ProjectRoot -File | ForEach-Object {
    if ($ExcludeRoot -contains $_.Name) { return }
    Copy-Item $_.FullName -Destination $StageDir
}

# Copy js/ tree
$JsDir = Join-Path $ProjectRoot "js"
if (Test-Path $JsDir) {
    Copy-Item $JsDir -Destination (Join-Path $StageDir "js") -Recurse
}

# Copy icons/ tree
$IconsDir = Join-Path $ProjectRoot "icons"
if (Test-Path $IconsDir) {
    Copy-Item $IconsDir -Destination (Join-Path $StageDir "icons") -Recurse
}

$count = (Get-ChildItem -Path $StageDir -Recurse -File).Count
Write-Host "Staged $count files"

# Create CCX
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($StageDir, $CcxFile, [System.IO.Compression.CompressionLevel]::Optimal, $false)

# Cleanup stage
Remove-Item -Recurse -Force $StageDir -ErrorAction SilentlyContinue

$Size = [math]::Round((Get-Item $CcxFile).Length / 1KB, 1)
Write-Host "CCX packed: $Size KB, $count files"
