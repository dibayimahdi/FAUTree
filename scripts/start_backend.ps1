$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "FAUTree backend listening on http://localhost:8000"
python -m backend.fautree.api.server

