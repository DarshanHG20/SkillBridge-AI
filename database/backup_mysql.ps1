<#
.SYNOPSIS
    Automated backup script for SkillBridge AI MySQL Database on Windows / PowerShell.
.DESCRIPTION
    Dumps the database with transaction isolation and generates a timestamped SQL archive.
#>

param(
    [string]$DbHost = "127.0.0.1",
    [int]$DbPort = 3306,
    [string]$DbUser = "skillbridge_user",
    [string]$DbPassword = $env:MYSQL_PASSWORD,
    [string]$DbName = "skillbridge_prod",
    [string]$BackupDir = ".\database\backups"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "skillbridge_${DbName}_${Timestamp}.sql"

Write-Host "[INFO] Starting database backup for $DbName..." -ForegroundColor Cyan

if (-not $DbPassword) {
    Write-Host "[WARN] MYSQL_PASSWORD environment variable not set. Prompting for password:" -ForegroundColor Yellow
    $DbPassword = Read-Host -Prompt "Enter DB Password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DbPassword)
    $DbPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

$dumpCmd = "mysqldump -h $DbHost -P $DbPort -u $DbUser --password=`"$DbPassword`" --single-transaction --quick --routines --triggers $DbName"
Invoke-Expression "$dumpCmd" | Out-File -FilePath $BackupFile -Encoding utf8

if (Test-Path $BackupFile) {
    $size = (Get-Item $BackupFile).Length / 1KB
    Write-Host "[SUCCESS] Backup created successfully: $BackupFile ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Backup failed. Output file was not created." -ForegroundColor Red
    exit 1
}
