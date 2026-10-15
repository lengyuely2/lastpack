param([switch]$NoBrowser,[ValidateRange(0,65535)][int]$Port=0)
$ErrorActionPreference = 'Stop'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$gameNode = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $gameNode)) { throw 'Please install Node.js 22 or newer.' }
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules\ws'))) { throw 'Install dependencies first with npm install or pnpm install.' }
$gamePort = 0
$gameUrl = ''
$gamePortFile = Join-Path $PSScriptRoot 'server-port.txt'
function Test-GameServer {
    try { return (Invoke-RestMethod -Uri "$gameUrl/health" -TimeoutSec 1).ok -eq $true }
    catch { return $false }
}
$candidatePorts = if ($Port) { @($Port) } else { @(8787,8793,8794,8795,8796) }
if (-not $Port -and (Test-Path -LiteralPath $gamePortFile)) {
    $savedGamePort = (Get-Content -LiteralPath $gamePortFile -Raw).Trim()
    if ($savedGamePort -match '^\d{1,5}$' -and [int]$savedGamePort -gt 0 -and [int]$savedGamePort -le 65535) { $candidatePorts = @([int]$savedGamePort) + $candidatePorts }
}
foreach ($candidatePort in ($candidatePorts | Select-Object -Unique)) {
    $gameUrl = "http://localhost:$candidatePort"
    if (Test-GameServer) { $gamePort = $candidatePort; break }
    $portProbe = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any,$candidatePort)
    try { $portProbe.Start(); $gamePort = $candidatePort; break }
    catch { Write-Host "Port $candidatePort is unavailable; trying another local port." }
    finally { $portProbe.Stop() }
}
if (-not $gamePort) { throw 'No available game port. Try Start-Game.ps1 -Port with an available port.' }
$gameUrl = "http://localhost:$gamePort"
if (-not (Test-GameServer)) {
    $gameServer = Join-Path $PSScriptRoot 'server.mjs'
    $gameProcess = Start-Process -FilePath $gameNode -ArgumentList @(('"' + $gameServer + '"'),"--port=$gamePort") -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'server.log') -RedirectStandardError (Join-Path $PSScriptRoot 'server-error.log') -PassThru
    $gameProcess.Id | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'server.pid')
    for ($attempt = 0; $attempt -lt 15; $attempt++) {
        if (Test-GameServer) { break }
        if ($gameProcess.HasExited) { throw 'Game server could not start. See server-error.log.' }
        Start-Sleep -Milliseconds 200
    }
    if (-not (Test-GameServer)) { throw 'Game server did not respond. See server-error.log.' }
}
$gamePort | Set-Content -LiteralPath $gamePortFile
Write-Host "LASTPACK is running: $gameUrl"
if (-not $NoBrowser) { Start-Process $gameUrl }
