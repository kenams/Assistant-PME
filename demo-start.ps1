# ============================================================
#  DEMO START — Assistant PME IA
#  Lance tout en autonome : GLPI + Tunnel + Render sync
#  Usage : .\demo-start.ps1
# ============================================================

# Secrets chargés depuis demo-config.ps1 (non versionné)
$configFile = Join-Path $PSScriptRoot "demo-config.ps1"
if (Test-Path $configFile) { . $configFile }
else {
    # Fallback : variables d'environnement système
    $RENDER_API_KEY = $env:RENDER_API_KEY
    $RENDER_SVC_ID  = $env:RENDER_SVC_ID
    $GLPI_APP_TOKEN = $env:GLPI_APP_TOKEN
    $GLPI_LOGIN     = if ($env:GLPI_LOGIN) { $env:GLPI_LOGIN } else { "glpi" }
    $GLPI_PASSWORD  = if ($env:GLPI_PASSWORD) { $env:GLPI_PASSWORD } else { "glpi" }
}
if (-not $RENDER_API_KEY) { Write-ERR "RENDER_API_KEY manquant — creer demo-config.ps1"; exit 1 }
$GLPI_LOCAL_PORT = 8082
$APP_URL         = "https://assistant-pme.onrender.com"

function Write-Step { param($msg) Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-ERR  { param($msg) Write-Host "    [ERR] $msg" -ForegroundColor Red }
function Write-INFO { param($msg) Write-Host "    $msg" -ForegroundColor Yellow }

# ── 1. GLPI Docker ──────────────────────────────────────────
Write-Step "Verification GLPI Docker..."
$glpiRunning = docker inspect -f '{{.State.Running}}' kah-glpi 2>$null
if ($glpiRunning -ne "true") {
    Write-INFO "Demarrage conteneur kah-glpi..."
    docker start kah-glpi kah-mariadb 2>$null | Out-Null
    Start-Sleep -Seconds 5
}
$glpiRunning = docker inspect -f '{{.State.Running}}' kah-glpi 2>$null
if ($glpiRunning -eq "true") {
    Write-OK "GLPI tourne sur localhost:$GLPI_LOCAL_PORT"
} else {
    Write-ERR "GLPI Docker introuvable. Lance: docker start kah-glpi kah-mariadb"
    exit 1
}

# ── 2. Kill tunnel existant ──────────────────────────────────
Write-Step "Arret ancien tunnel..."
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1
Write-OK "Ancien tunnel arrete"

# ── 3. Nouveau tunnel Cloudflare ────────────────────────────
Write-Step "Demarrage tunnel Cloudflare..."
$tunnelLog = "$env:TEMP\cf-tunnel.log"
Remove-Item $tunnelLog -ErrorAction SilentlyContinue
$cfProc = Start-Process -FilePath "cloudflared" `
    -ArgumentList "tunnel --url http://localhost:$GLPI_LOCAL_PORT" `
    -RedirectStandardError $tunnelLog `
    -NoNewWindow -PassThru

Write-INFO "Attente URL tunnel (30s max)..."
$tunnelUrl = $null
$deadline = (Get-Date).AddSeconds(30)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 2
    if (Test-Path $tunnelLog) {
        $content = Get-Content $tunnelLog -Raw -ErrorAction SilentlyContinue
        if ($content -match "https://[a-z0-9\-]+\.trycloudflare\.com") {
            $tunnelUrl = $Matches[0]
            break
        }
    }
}
if (-not $tunnelUrl) {
    Write-ERR "Impossible d'obtenir l'URL du tunnel. Verifier cloudflared.exe dans PATH."
    exit 1
}
Write-OK "Tunnel actif : $tunnelUrl"

# ── 4. Mise a jour Render env vars ──────────────────────────
Write-Step "Mise a jour GLPI_BASE_URL sur Render..."
$envPayload = @{
    envVars = @(
        @{ key = "GLPI_BASE_URL";   value = $tunnelUrl }
        @{ key = "GLPI_APP_TOKEN";  value = $GLPI_APP_TOKEN }
        @{ key = "GLPI_LOGIN";      value = $GLPI_LOGIN }
        @{ key = "GLPI_PASSWORD";   value = $GLPI_PASSWORD }
        @{ key = "GLPI_ENABLED";    value = "true" }
    )
} | ConvertTo-Json -Depth 5

$headers = @{
    "Authorization" = "Bearer $RENDER_API_KEY"
    "Content-Type"  = "application/json"
}
$resp = Invoke-RestMethod -Method PUT `
    -Uri "https://api.render.com/v1/services/$RENDER_SVC_ID/env-vars" `
    -Headers $headers -Body $envPayload -ErrorAction Stop
Write-OK "Env vars mises a jour"

# ── 5. Redeploy Render ──────────────────────────────────────
Write-Step "Redeploiement Render..."
$deploy = Invoke-RestMethod -Method POST `
    -Uri "https://api.render.com/v1/services/$RENDER_SVC_ID/deploys" `
    -Headers $headers -Body '{"clearCache":"do_not_clear"}' -ErrorAction Stop
$deployId = $deploy.id
Write-OK "Deploy lance : $deployId"

# ── 6. Attente deploy live ──────────────────────────────────
Write-Step "Attente Render (3-4min)..."
$deployDone = $false
$deadline = (Get-Date).AddMinutes(6)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 15
    try {
        $status = Invoke-RestMethod -Method GET `
            -Uri "https://api.render.com/v1/services/$RENDER_SVC_ID/deploys/$deployId" `
            -Headers $headers
        $s = $status.status
        Write-INFO "  Status : $s"
        if ($s -eq "live") { $deployDone = $true; break }
        if ($s -eq "failed") { Write-ERR "Deploy echoue !"; break }
    } catch { }
}
if (-not $deployDone) {
    Write-ERR "Timeout deploy — verifie dashboard Render"
    Write-INFO "App URL : $APP_URL"
    exit 1
}
Write-OK "Render live !"

# ── 7. Verification sante backend ───────────────────────────
Write-Step "Verification sante backend..."
Start-Sleep -Seconds 3
try {
    $health = Invoke-RestMethod -Uri "$APP_URL/health" -TimeoutSec 10
    Write-OK "Backend OK : $($health | ConvertTo-Json -Compress)"
} catch {
    Write-INFO "Health check non critique, backend probablement OK"
}

# ── 8. Verification GLPI API via tunnel ─────────────────────
Write-Step "Verification GLPI via tunnel..."
try {
    $glpiHeaders = @{
        "App-Token"     = $GLPI_APP_TOKEN
        "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("${GLPI_LOGIN}:${GLPI_PASSWORD}"))
        "Content-Type"  = "application/json"
    }
    $session = Invoke-RestMethod -Method GET `
        -Uri "$tunnelUrl/apirest.php/initSession" `
        -Headers $glpiHeaders -TimeoutSec 10
    Write-OK "GLPI API OK — session token obtenu"
} catch {
    Write-ERR "GLPI API inaccessible via tunnel — verifie que GLPI tourne"
}

# ── RESUME FINAL ────────────────────────────────────────────
Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "  DEMO PRETE" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  App client   : $APP_URL" -ForegroundColor White
Write-Host "  GLPI tunnel  : $tunnelUrl" -ForegroundColor White
Write-Host "  GLPI tickets : $tunnelUrl/front/ticket.php" -ForegroundColor White
Write-Host ""
Write-Host "  Compte demo client :" -ForegroundColor Gray
Write-Host "    Email : client.test@pme-test.fr" -ForegroundColor Gray
Write-Host "    Pass  : TestClient123!" -ForegroundColor Gray
Write-Host "    Code  : DEFAULT" -ForegroundColor Gray
Write-Host ""
Write-Host "  Compte GLPI admin :" -ForegroundColor Gray
Write-Host "    Login : glpi / glpi" -ForegroundColor Gray
Write-Host ""
Write-Host "  NE PAS FERMER CETTE FENETRE (tunnel actif)" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Magenta

# Garde le tunnel actif
Wait-Process -Id $cfProc.Id
