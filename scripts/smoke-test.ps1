$ErrorActionPreference = "Stop"

$BaseUrl = $env:ASSISTANT_BASE_URL
if (-not $BaseUrl) {
  $BaseUrl = "http://localhost:3001"
}

Write-Host "Smoke test: $BaseUrl"

function Assert-Ok($Url) {
  Write-Host "GET $Url"
  $res = Invoke-RestMethod -Uri $Url -Method Get
  if (-not $res) { throw "No response" }
  return $res
}

Assert-Ok "$BaseUrl/health" | Out-Null
Assert-Ok "$BaseUrl/debug/paths" | Out-Null

Write-Host "Smoke test OK"
