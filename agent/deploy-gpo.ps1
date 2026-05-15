#Requires -Version 5.1
<#
.SYNOPSIS
    Deploie kah-agent.exe sur tous les postes d'un domaine AD.
.USAGE
    .\deploy-gpo.ps1 -AgentSource "\\serveur\partage\agent"
    .\deploy-gpo.ps1 -AgentSource "\\serveur\partage\agent" -OUPath "OU=Postes,DC=corp,DC=local"
    .\deploy-gpo.ps1 -AgentSource "\\serveur\partage\agent" -ComputerList "PC1,PC2,PC3"
    .\deploy-gpo.ps1 -AgentSource "\\serveur\partage\agent" -DryRun
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$AgentSource,

    [string]$OUPath       = "",
    [string]$ComputerList = "",
    [string]$TaskName     = "KAH-IT-Agent",
    [string]$DestDir      = "C:\Program Files\KAH-Agent",
    [int]$MaxParallel     = 10,
    [int]$AgentPort       = 47878,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

# ─── Validation source ───────────────────────────────────────────────────────
if (-not (Test-Path $AgentSource)) {
    Write-Error "AgentSource inaccessible : $AgentSource"
    exit 1
}
$exePath = Join-Path $AgentSource "kah-agent.exe"
if (-not $DryRun -and -not (Test-Path $exePath)) {
    Write-Error "kah-agent.exe introuvable dans : $AgentSource"
    exit 1
}

# ─── Récupération des PC cibles ──────────────────────────────────────────────
function Get-TargetComputers {
    param([string]$OUPath, [string]$ComputerList)

    if ($ComputerList -ne "") {
        return $ComputerList -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
    }

    try {
        $adParams = @{ Filter = "*"; Properties = "Name" }
        if ($OUPath -ne "") { $adParams["SearchBase"] = $OUPath }
        return (Get-ADComputer @adParams).Name
    } catch {
        Write-Error "Impossible de requeter AD : $_"
        exit 1
    }
}

$computers = Get-TargetComputers -OUPath $OUPath -ComputerList $ComputerList
if ($computers.Count -eq 0) {
    Write-Warning "Aucun PC trouve."
    exit 0
}

Write-Host ""
Write-Host "=== KAH-Agent Deploiement ===" -ForegroundColor Cyan
Write-Host "Source    : $AgentSource"
Write-Host "Dest      : $DestDir"
Write-Host "Tache     : $TaskName"
Write-Host "PCs       : $($computers.Count)"
Write-Host "Parallele : $MaxParallel"
if ($DryRun) { Write-Host "[DRY-RUN] Aucune modification ne sera effectuee." -ForegroundColor Yellow }
Write-Host ""

# ─── Script de deploiement distant ───────────────────────────────────────────
$deployScript = {
    param($AgentSource, $DestDir, $TaskName, $AgentPort, $DryRun)

    $result = [PSCustomObject]@{
        Hostname  = $env:COMPUTERNAME
        Status    = "OK"
        Detail    = ""
        Timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    }

    try {
        if (-not $DryRun) {
            # Creer le dossier destination
            if (-not (Test-Path $DestDir)) {
                New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
            }

            # Copier l'exe
            $src = Join-Path $AgentSource "kah-agent.exe"
            $dst = Join-Path $DestDir "kah-agent.exe"
            Copy-Item -Path $src -Destination $dst -Force

            # Copier les fichiers de config supplementaires si presents
            $configFiles = @("config.json", ".env", "kah-agent.cfg")
            foreach ($cf in $configFiles) {
                $srcCf = Join-Path $AgentSource $cf
                if (Test-Path $srcCf) {
                    Copy-Item -Path $srcCf -Destination (Join-Path $DestDir $cf) -Force
                }
            }

            # Creer/mettre a jour la tache planifiee
            $exeFull = Join-Path $DestDir "kah-agent.exe"
            $action  = New-ScheduledTaskAction -Execute $exeFull
            $trigger = New-ScheduledTaskTrigger -AtStartup
            $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
            $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

            $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
            if ($existing) {
                Set-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal | Out-Null
            } else {
                Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
            }

            # Demarrer la tache immediatement
            Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

            # Attendre que l'agent reponde (jusqu'a 15s)
            $agentOk = $false
            for ($i = 0; $i -lt 5; $i++) {
                Start-Sleep -Seconds 3
                try {
                    $resp = Invoke-WebRequest -Uri "http://localhost:$AgentPort/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
                    if ($resp.StatusCode -eq 200) { $agentOk = $true; break }
                } catch { }
            }

            if ($agentOk) {
                $result.Status = "OK"
                $result.Detail = "Agent actif sur port $AgentPort"
            } else {
                $result.Status = "WARN"
                $result.Detail = "Installe mais agent non joignable sur :$AgentPort"
            }
        } else {
            $result.Status = "DRY-RUN"
            $result.Detail = "Simulation uniquement"
        }
    } catch {
        $result.Status = "ERREUR"
        $result.Detail = $_.Exception.Message
    }

    return $result
}

# ─── Deploiement en parallele ─────────────────────────────────────────────────
$jobs     = @()
$results  = @()
$total    = $computers.Count
$done     = 0
$queue    = [System.Collections.Queue]::new()
$computers | ForEach-Object { $queue.Enqueue($_) }

while ($queue.Count -gt 0 -or $jobs.Count -gt 0) {

    # Lancer de nouveaux jobs si place disponible
    while ($queue.Count -gt 0 -and $jobs.Count -lt $MaxParallel) {
        $pc = $queue.Dequeue()

        if ($DryRun) {
            # En DryRun, pas de connexion reseau reelle
            $results += [PSCustomObject]@{
                Hostname  = $pc
                Status    = "DRY-RUN"
                Detail    = "Simulation uniquement"
                Timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            }
            $done++
            $pct = [int](($done / $total) * 100)
            Write-Progress -Activity "Deploiement KAH-Agent" -Status "$done/$total PCs" -PercentComplete $pct
            continue
        }

        $job = Invoke-Command -ComputerName $pc -ScriptBlock $deployScript `
            -ArgumentList $AgentSource, $DestDir, $TaskName, $AgentPort, $false `
            -AsJob -ErrorAction SilentlyContinue

        if ($job) {
            $jobs += [PSCustomObject]@{ Job = $job; PC = $pc }
        } else {
            $results += [PSCustomObject]@{
                Hostname  = $pc
                Status    = "ERREUR"
                Detail    = "Connexion impossible (WinRM indisponible ?)"
                Timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
            }
            $done++
            $pct = [int](($done / $total) * 100)
            Write-Progress -Activity "Deploiement KAH-Agent" -Status "$done/$total PCs" -PercentComplete $pct
        }
    }

    # Collecter les jobs termines
    $stillRunning = @()
    foreach ($entry in $jobs) {
        $state = $entry.Job.State
        if ($state -eq "Completed" -or $state -eq "Failed") {
            if ($state -eq "Completed") {
                $out = Receive-Job -Job $entry.Job -ErrorAction SilentlyContinue
                if ($out) {
                    $results += $out
                } else {
                    $results += [PSCustomObject]@{
                        Hostname  = $entry.PC
                        Status    = "ERREUR"
                        Detail    = "Pas de reponse du job distant"
                        Timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
                    }
                }
            } else {
                $results += [PSCustomObject]@{
                    Hostname  = $entry.PC
                    Status    = "ERREUR"
                    Detail    = "Job echoue (PC injoignable ou acces refuse)"
                    Timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
                }
            }
            Remove-Job -Job $entry.Job -Force -ErrorAction SilentlyContinue
            $done++
            $pct = [int](($done / $total) * 100)
            Write-Progress -Activity "Deploiement KAH-Agent" -Status "$done/$total PCs" -PercentComplete $pct
        } else {
            $stillRunning += $entry
        }
    }
    $jobs = $stillRunning

    if ($jobs.Count -gt 0) { Start-Sleep -Milliseconds 500 }
}

Write-Progress -Activity "Deploiement KAH-Agent" -Completed

# ─── Rapport final ────────────────────────────────────────────────────────────
$timestamp  = Get-Date -Format "yyyyMMdd_HHmmss"
$reportPath = "KAH-Deploy-Report_$timestamp.csv"
$results | Export-Csv -Path $reportPath -NoTypeInformation -Encoding UTF8

$ok   = ($results | Where-Object { $_.Status -eq "OK" }).Count
$warn = ($results | Where-Object { $_.Status -eq "WARN" }).Count
$err  = ($results | Where-Object { $_.Status -eq "ERREUR" }).Count
$dry  = ($results | Where-Object { $_.Status -eq "DRY-RUN" }).Count

Write-Host ""
Write-Host "=== Rapport ===" -ForegroundColor Cyan
Write-Host "Total    : $total"
Write-Host "OK       : $ok"  -ForegroundColor Green
if ($warn -gt 0) { Write-Host "WARN     : $warn" -ForegroundColor Yellow }
if ($err  -gt 0) { Write-Host "ERREUR   : $err"  -ForegroundColor Red }
if ($dry  -gt 0) { Write-Host "DRY-RUN  : $dry"  -ForegroundColor Gray }
Write-Host ""
Write-Host "Rapport CSV : $reportPath" -ForegroundColor Cyan

if ($err -gt 0) {
    Write-Host ""
    Write-Host "PCs en erreur :" -ForegroundColor Red
    $results | Where-Object { $_.Status -eq "ERREUR" } | ForEach-Object {
        Write-Host "  - $($_.Hostname) : $($_.Detail)" -ForegroundColor Red
    }
}
