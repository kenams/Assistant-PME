$ErrorActionPreference = "Stop"

function Invoke-WithRetry {
  param(
    [ScriptBlock]$Action,
    [int]$Retries = 3,
    [int]$DelayMs = 300
  )
  for ($i = 0; $i -lt $Retries; $i++) {
    try {
      return & $Action
    } catch {
      if ($i -ge ($Retries - 1)) { throw }
      Start-Sleep -Milliseconds $DelayMs
    }
  }
}

$BaseUrl = $env:ASSISTANT_BASE_URL
if (-not $BaseUrl) { $BaseUrl = "http://localhost:3001" }

$Email = $env:ASSISTANT_SMOKE_EMAIL
if (-not $Email) { $Email = "admin@assistant.local" }

$Password = $env:ASSISTANT_SMOKE_PASSWORD
if (-not $Password) { $Password = "admin123" }

Write-Host "Smoke test full: $BaseUrl"

Invoke-WithRetry { Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get } | Out-Null

$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
$login = Invoke-WithRetry {
  Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
}

if (-not $login.token) {
  throw "Login failed: missing token"
}

$headers = @{ Authorization = "Bearer $($login.token)" }

Invoke-WithRetry { Invoke-RestMethod -Uri "$BaseUrl/auth/me" -Method Get -Headers $headers } | Out-Null
Invoke-WithRetry { Invoke-RestMethod -Uri "$BaseUrl/chat/quick-issues" -Method Get -Headers $headers } | Out-Null

$chatBody = @{ message = "Outlook ne s'ouvre pas" } | ConvertTo-Json -Compress
$chat = Invoke-WithRetry {
  Invoke-RestMethod -Uri "$BaseUrl/chat" -Method Post -ContentType "application/json" -Body $chatBody -Headers $headers
}

if (-not $chat.conversation_id) {
  throw "Chat failed: missing conversation_id"
}

$feedbackBody = @{
  conversation_id = $chat.conversation_id
  resolved = $false
  comment = "Toujours en panne"
} | ConvertTo-Json -Compress

Invoke-WithRetry {
  Invoke-RestMethod -Uri "$BaseUrl/chat/feedback" -Method Post -ContentType "application/json" -Body $feedbackBody -Headers $headers
} | Out-Null
$second = Invoke-WithRetry {
  Invoke-RestMethod -Uri "$BaseUrl/chat/feedback" -Method Post -ContentType "application/json" -Body $feedbackBody -Headers $headers
}

if (-not $second.ticket_created) {
  throw "Ticket not created after escalation feedback"
}

$tickets = Invoke-WithRetry {
  Invoke-RestMethod -Uri "$BaseUrl/tickets/conversation/$($chat.conversation_id)" -Method Get -Headers $headers
}
if (-not $tickets.items -or $tickets.items.Count -lt 1) {
  throw "No ticket found for conversation"
}

Write-Host "Smoke test full OK"
