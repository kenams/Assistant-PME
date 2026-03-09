$ErrorActionPreference = "Stop"

$root = Resolve-Path "$PSScriptRoot\.."
$timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$staging = Join-Path $env:TEMP "assistant_pme_package_$timestamp"
$zipPath = Join-Path $root "assistant_pme_package_$timestamp.zip"

if (Test-Path $staging) {
  Remove-Item -Recurse -Force $staging
}
New-Item -ItemType Directory -Path $staging | Out-Null

robocopy "$root\\app" "$staging\\app" /E /XD node_modules data logs | Out-Null
robocopy "$root\\backend" "$staging\\backend" /E /XD node_modules data logs /XF .env .env.* | Out-Null
robocopy "$root\\docs" "$staging\\docs" /E /XD node_modules data logs | Out-Null

Copy-Item "$root\\README.md" -Destination "$staging\\README.md" -Force
Copy-Item "$root\\start-local.bat" -Destination "$staging\\start-local.bat" -Force
Copy-Item "$root\\start-local.ps1" -Destination "$staging\\start-local.ps1" -Force
Copy-Item "$root\\start-local.sh" -Destination "$staging\\start-local.sh" -Force

if (Test-Path $zipPath) {
  Remove-Item -Force $zipPath
}
Compress-Archive -Path "$staging\\*" -DestinationPath $zipPath -Force

Remove-Item -Recurse -Force $staging

Write-Host "Package created: $zipPath"
