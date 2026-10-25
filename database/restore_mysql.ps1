<#
.SYNOPSIS
    Database restore script for SkillBridge AI MySQL Database on Windows / PowerShell.
.DESCRIPTION
    Restores a timestamped SQL backup into the target database.
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$DbHost = "127.0.0.1",
    [int]$DbPort = 3306,
    [string]$DbUser = "skillbridge_user",
    [string]$DbPassword = $env:MYSQL_PASSWORD,
    [string]$DbName = "skillbridge_prod"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    Write-Host "[ERROR] Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "[CAUTION] This operation will overwrite existing data in '$DbName'." -ForegroundColor Yellow
$confirmation = Read-Host "Type 'RESTORE' to confirm"
if ($confirmation -ne "RESTORE") {
    Write-Host "[INFO] Operation cancelled by user." -ForegroundColor Gray
    exit 0
}

Write-Host "[INFO] Restoring database from $BackupFile..." -ForegroundColor Cyan

if (-not $DbPassword) {
    $DbPassword = Read-Host -Prompt "Enter DB Password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($DbPassword)
    $DbPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

Get-Content $BackupFile | mysql -h $DbHost -P $DbPort -u $DbUser --password="$DbPassword" $DbName

Write-Host "[SUCCESS] Database restored successfully from $BackupFile." -ForegroundColor Green
