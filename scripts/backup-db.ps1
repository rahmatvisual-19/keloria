# Skrip backup basis data PostgreSQL Kelo-ERP untuk Windows (PowerShell)
# Penggunaan: $env:DATABASE_URL="postgresql://..."; .\scripts\backup-db.ps1

param(
    [string]$BackupDir = ".\backups"
)

$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
    Write-Error "Variabel lingkungan DATABASE_URL belum disetel."
    exit 1
}

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outputFile = Join-Path $BackupDir "kelo_erp_$timestamp.sql"

pg_dump $env:DATABASE_URL --file $outputFile
Write-Host "Backup berhasil dibuat: $outputFile"
