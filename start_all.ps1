<#
.SYNOPSIS
SkillBridge AI - Multi-Tier Full-Stack Production & Dev Orchestrator
.DESCRIPTION
Safely starts the complete hybrid SkillBridge AI platform on Windows 11:
1. Node.js Express & MongoDB Main Backend (Port 5001)
2. React 18 + Vite Web Application (Port 5173)
3. Flutter Admin Web Dashboard (Port 8080)
4. Preserved Python FastAPI Reference Backend (Port 8000)
.PARAMETER KillExisting
Automatically terminates any orphan process currently holding required ports.
.PARAMETER AdminPort
Port to serve the Flutter Web Admin Dashboard (default: 8080).
.EXAMPLE
.\start_all.ps1 -KillExisting
#>

param(
    [switch]$KillExisting,
    [int]$AdminPort = 8080
)

$ErrorActionPreference = "Stop"

function Write-Banner {
    Write-Host ""
    Write-Host "=======================================================================" -ForegroundColor Cyan
    Write-Host "         🚀 SKILLBRIDGE AI - FULL-STACK SYSTEM STARTUP               " -ForegroundColor Yellow
    Write-Host "=======================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Clear-OccupiedPort {
    param([int]$Port)
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $pidToKill = $conn[0].OwningProcess
        if ($KillExisting) {
            Write-Host "  [CLEAN] Freeing port $Port (terminating PID $pidToKill)..." -ForegroundColor Yellow
            Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 600
        } else {
            Write-Host "  [ERROR] Port $Port is currently occupied by PID $pidToKill." -ForegroundColor Red
            Write-Host "          Run '.\start_all.ps1 -KillExisting' to automatically free ports." -ForegroundColor Yellow
            return $false
        }
    }
    return $true
}

function Start-Services {
    Write-Host "`n[1/3] Inspecting port availability..." -ForegroundColor Cyan
    $portsToCheck = @(5001, 5173, 8000, $AdminPort)
    foreach ($port in $portsToCheck) {
        $ok = Clear-OccupiedPort -Port $port
        if (-not $ok) { return $false }
    }

    Write-Host "`n[2/3] Launching core services..." -ForegroundColor Cyan

    # 1. Main Node.js Express Backend (Port 5001)
    Write-Host "  -> Starting Node.js Backend on http://localhost:5001 ..." -ForegroundColor White
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'c:\nagmamobileApp\backend-node'; npm start"

    # 2. React Vite Web Frontend (Port 5173)
    Write-Host "  -> Starting React Web App on http://localhost:5173 ..." -ForegroundColor White
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'c:\nagmamobileApp\frontend'; npm run dev -- --host 0.0.0.0 --port 5173"

    # 3. Flutter Web Admin Dashboard (Port 8080)
    Write-Host "  -> Starting Flutter Admin Dashboard Web Server on http://localhost:$AdminPort ..." -ForegroundColor White
    $py = "c:\nagmamobileApp\backend\venv\Scripts\python.exe"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'c:\nagmamobileApp'; & '$py' -m http.server $AdminPort --directory admin_dashboard/build/web"

    # 4. Preserved Python FastAPI Backend (Port 8000)
    Write-Host "  -> Starting Python FastAPI Reference Backend on http://localhost:8000 ..." -ForegroundColor White
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'c:\nagmamobileApp\backend'; & 'venv\Scripts\python.exe' -m uvicorn app.main:app --reload --port 8000"

    return $true
}

function Verify-Health {
    Write-Host "`n[3/3] Waiting for services to initialize..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5

    Write-Host "`n-----------------------------------------------------------------------" -ForegroundColor Green
    Write-Host "               🎉 ALL SERVICES SUCCESSFULLY INITIALIZED                " -ForegroundColor Green
    Write-Host "-----------------------------------------------------------------------" -ForegroundColor Green
    Write-Host "  ⚡ Node.js Express Main API:   http://localhost:5001/api/v1" -ForegroundColor White
    Write-Host "  🏥 Node.js Health Check:       http://localhost:5001/api/v1/health" -ForegroundColor White
    Write-Host "  🌐 React Learner Web App:     http://localhost:5173" -ForegroundColor White
    Write-Host "  🌐 Flutter Admin Web Console:  http://localhost:$AdminPort" -ForegroundColor White
    Write-Host "  🐍 Python Reference Backend:   http://localhost:8000" -ForegroundColor White
    Write-Host ""
    Write-Host "  DEFAULT LOGIN CREDENTIALS:" -ForegroundColor Yellow
    Write-Host "    - Student Account: student@skillbridge.ai / Student@123456" -ForegroundColor White
    Write-Host "    - Admin Account:   admin@skillbridge.ai   / Admin@123456" -ForegroundColor White
    Write-Host "=======================================================================" -ForegroundColor Cyan
}

# --- Main Execution ---
Write-Banner
$started = Start-Services
if ($started) {
    Verify-Health
}
