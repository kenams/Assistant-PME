# ─── configure-glpi.ps1 ───────────────────────────────────────
# Usage: .\configure-glpi.ps1 -AppToken "xxx" -UserToken "yyy"
# ──────────────────────────────────────────────────────────────
param(
  [string]$AppToken  = "",
  [string]$UserToken = "",
  [string]$BaseUrl   = "https://kah-digital.fr34.glpi-network.cloud",
  [string]$Backend   = "http://localhost:3001",
  [string]$AdminEmail = "admin@assistant.local",
  [string]$AdminPass  = "admin123"
)

Write-Host "`n=== GLPI Auto-Config ===" -ForegroundColor Cyan

if (-not $AppToken -or -not $UserToken) {
  Write-Host "Usage: .\configure-glpi.ps1 -AppToken 'TON_APP_TOKEN' -UserToken 'TON_USER_TOKEN'" -ForegroundColor Yellow
  exit 1
}

# 1. Login admin
Write-Host "`n[1/4] Login admin backend..." -ForegroundColor Gray
$loginBody = @{ email = $AdminEmail; password = $AdminPass } | ConvertTo-Json
try {
  $loginResp = Invoke-RestMethod -Uri "$Backend/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
  $token = $loginResp.token
  Write-Host "     OK - Token obtenu" -ForegroundColor Green
} catch {
  Write-Host "     ERREUR login: $_" -ForegroundColor Red
  exit 1
}

$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }

# 2. Configurer GLPI dans org/settings
Write-Host "[2/4] Configuration GLPI..." -ForegroundColor Gray
$glpiBody = @{
  glpi_enabled    = $true
  glpi_base_url   = $BaseUrl
  glpi_app_token  = $AppToken
  glpi_user_token = $UserToken
} | ConvertTo-Json

try {
  $null = Invoke-RestMethod -Uri "$Backend/org/settings" -Method PUT -Headers $headers -Body $glpiBody
  Write-Host "     OK - GLPI configuré: $BaseUrl" -ForegroundColor Green
} catch {
  Write-Host "     ERREUR config: $_" -ForegroundColor Red
  exit 1
}

# 3. Test connexion GLPI
Write-Host "[3/4] Test connexion GLPI..." -ForegroundColor Gray
try {
  $testResp = Invoke-RestMethod -Uri "$Backend/admin/glpi/test" -Method GET -Headers $headers
  if ($testResp.ok) {
    Write-Host "     OK - Connexion GLPI reussie!" -ForegroundColor Green
  } else {
    Write-Host "     ERREUR: $($testResp.error)" -ForegroundColor Red
    exit 1
  }
} catch {
  $errBody = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
  Write-Host "     ERREUR connexion GLPI: $($errBody.error ?? $_)" -ForegroundColor Red
  exit 1
}

# 4. Creer un ticket de test
Write-Host "[4/4] Creation ticket de test..." -ForegroundColor Gray
$ticketBody = @{
  title    = "Test integration SupportAI - GLPI"
  summary  = "Ticket de test cree automatiquement par SupportAI. Connexion GLPI validee avec succes."
  category = "software"
  priority = "low"
} | ConvertTo-Json

try {
  $ticketResp = Invoke-RestMethod -Uri "$Backend/tickets" -Method POST -Headers $headers -Body $ticketBody
  Write-Host "     OK - Ticket local cree: $($ticketResp.id)" -ForegroundColor Green
  if ($ticketResp.external_id) {
    Write-Host "     OK - Ticket GLPI cree: #$($ticketResp.external_id)" -ForegroundColor Green
    Write-Host "     URL: $($ticketResp.external_url)" -ForegroundColor Cyan
  } else {
    Write-Host "     INFO: Ticket local cree, pas de sync GLPI (verifier les tokens)" -ForegroundColor Yellow
  }
} catch {
  Write-Host "     ERREUR creation ticket: $_" -ForegroundColor Red
}

Write-Host "`n=== Configuration terminee ===" -ForegroundColor Cyan
Write-Host "Interface admin: http://localhost:3001/app/admin.html" -ForegroundColor White
