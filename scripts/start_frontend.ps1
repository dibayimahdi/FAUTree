$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "FAUTree frontend listening on http://localhost:5173/frontend/"
python -m http.server 5173

