$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$nodeModules = Join-Path $backend "node_modules"

Set-Location $backend
if (-not (Test-Path $nodeModules)) {
  npm install
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$backend`"; npm run dev"
Start-Sleep -Seconds 2
Start-Process "http://localhost:3001/app/"
