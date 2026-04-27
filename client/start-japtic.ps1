param(
  [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$serverDir = Join-Path $repoRoot "server"
$clientDir = Join-Path $repoRoot "client"
$serverEnv = Join-Path $serverDir ".env"
$serverEnvExample = Join-Path $serverDir ".env.example"

if (!(Test-Path $serverDir)) {
  Write-Error "Could not find server folder at: $serverDir"
}

if (!(Test-Path $clientDir)) {
  Write-Error "Could not find client folder at: $clientDir"
}

if (!(Test-Path $serverEnv)) {
  $defaultJwt = "dev-" + ([guid]::NewGuid().ToString("N"))
  $envTemplate = @"
# Japtic Cards local development environment
MONGO_URI=mongodb://127.0.0.1:27017/japticcards
JWT_SECRET=$defaultJwt
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
"@
  Set-Content -LiteralPath $serverEnv -Value $envTemplate -NoNewline

  Write-Host ""
  Write-Host "Created missing server .env with local defaults:" -ForegroundColor Yellow
  Write-Host "  $serverEnv"
  Write-Host "Edit it if you want to use a different MongoDB URI or secret."
}

if (!(Test-Path $serverEnvExample)) {
  $exampleTemplate = @"
# Copy this file to .env and customize values for your environment.
MONGO_URI=mongodb://127.0.0.1:27017/japticcards
JWT_SECRET=replace-with-a-strong-secret
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
"@
  Set-Content -LiteralPath $serverEnvExample -Value $exampleTemplate -NoNewline
}

function Ensure-Dependencies($dir, $name) {
  if ($SkipInstall) {
    return
  }

  $nodeModules = Join-Path $dir "node_modules"
  if (!(Test-Path $nodeModules)) {
    Write-Host "Installing $name dependencies..." -ForegroundColor Cyan
    Push-Location $dir
    npm install
    $code = $LASTEXITCODE
    Pop-Location
    if ($code -ne 0) {
      throw "npm install failed in $name"
    }
  }
}

Ensure-Dependencies $serverDir "backend"
Ensure-Dependencies $clientDir "client"

$backendCommand = "Set-Location -LiteralPath '$serverDir'; npm start"
$clientCommand = "Set-Location -LiteralPath '$clientDir'; npm start"

Write-Host "Starting backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand | Out-Null

Start-Sleep -Seconds 2

Write-Host "Starting client..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $clientCommand | Out-Null

Start-Sleep -Seconds 2
Start-Process "http://localhost:3000" | Out-Null

Write-Host ""
Write-Host "Japtic Cards is launching." -ForegroundColor Green
Write-Host "Backend: http://localhost:5000"
Write-Host "Client:  http://localhost:3000"
Write-Host "Note: make sure MongoDB is running on mongodb://127.0.0.1:27017"
Write-Host ""
Write-Host "Tip: run with -SkipInstall to skip dependency checks."
