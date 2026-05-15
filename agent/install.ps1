# KAH IT Agent — Installateur PowerShell
# Peut etre deploye via GPO ou MDM (Intune, etc.)
# Usage: powershell -ExecutionPolicy Bypass -File install.ps1

$TaskName = "KAH-IT-Agent"
$AgentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentScript = Join-Path $AgentDir "agent.js"

Write-Host "[KAH] Installation de l'agent IT Kah-Digital..." -ForegroundColor Cyan

# Verifier Node.js
$NodePath = (Get-Command node -ErrorAction SilentlyContinue)?.Source
if (-not $NodePath) {
    Write-Host "[KAH] Node.js non trouve. Installation via winget..." -ForegroundColor Yellow
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    $NodePath = (Get-Command node -ErrorAction SilentlyContinue)?.Source
    if (-not $NodePath) {
        Write-Host "[KAH] ERREUR: Node.js introuvable apres installation. Relancez le script." -ForegroundColor Red
        exit 1
    }
}

$NodeVersion = & node --version 2>$null
Write-Host "[KAH] Node.js: $NodeVersion" -ForegroundColor Green

# Supprimer l'ancienne tache
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "[KAH] Suppression ancienne tache..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Creer la tache planifiee
$Action = New-ScheduledTaskAction -Execute $NodePath -Argument "`"$AgentScript`""
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

try {
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Force | Out-Null
    Write-Host "[KAH] Tache planifiee creee." -ForegroundColor Green
} catch {
    Write-Host "[KAH] AVERTISSEMENT: Impossible de creer la tache: $_" -ForegroundColor Yellow
}

# Demarrer l'agent immediatement
Write-Host "[KAH] Demarrage de l'agent..." -ForegroundColor Cyan
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "KAH*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Process -FilePath $NodePath -ArgumentList "`"$AgentScript`"" -WindowStyle Hidden

Start-Sleep -Seconds 2

try {
    $resp = Invoke-WebRequest -Uri "http://localhost:47878" -TimeoutSec 2 -UseBasicParsing
    $info = $resp.Content | ConvertFrom-Json
    Write-Host "[KAH] Agent operationnel!" -ForegroundColor Green
    Write-Host "  Poste  : $($info.hostname)" -ForegroundColor White
    Write-Host "  User   : $($info.username)" -ForegroundColor White
    Write-Host "  IP LAN : $($info.local_ip)" -ForegroundColor White
    Write-Host "  OS     : $($info.os)" -ForegroundColor White
} catch {
    Write-Host "[KAH] Agent demarre (verification reseau non disponible)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[KAH] Installation terminee. L'agent demarrera a chaque connexion." -ForegroundColor Green
