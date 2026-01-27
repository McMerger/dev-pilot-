$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting DevPilot Local Bridge..." -ForegroundColor Cyan

# 0. Self-Healing: Kill Zombies on Port 4001
try {
    $zombie = Get-NetTCPConnection -LocalPort 4001 -ErrorAction SilentlyContinue
    if ($zombie) {
        Write-Host "   > Found zombie process (PID $($zombie.OwningProcess)) on port 4001. Killing..." -ForegroundColor Yellow
        Stop-Process -Id $zombie.OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}
catch {}

# 0b. Clean up previous artifacts
if (Test-Path "tunnel.log") { 
    try { Remove-Item "tunnel.log" -Force -ErrorAction SilentlyContinue } catch {}
}

# 1. Start Cloudflare Tunnel
Write-Host "   > Initializing Secure Tunnel..." -ForegroundColor Gray
$tunnelProcess = Start-Process -FilePath "..\cloudflared.exe" -ArgumentList "tunnel --url http://localhost:4001" -PassThru -NoNewWindow -RedirectStandardError "tunnel.log"

# 2. Wait for Tunnel to provide URL
Write-Host "   > Waiting for Public URL..." -ForegroundColor Gray
$maxRetries = 20
$url = ""

for ($i = 0; $i -lt $maxRetries; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path "tunnel.log") {
        # Use Select-String to find the line directly
        $match = Select-String -Path "tunnel.log" -Pattern "https://[a-zA-Z0-9-]+\.trycloudflare\.com" | Select-Object -First 1
        if ($match) {
            # Extract the URL from the matching line using the same regex
            if ($match.Line -match "https://[a-zA-Z0-9-]+\.trycloudflare\.com") {
                $url = $matches[0]
                break
            }
        }
    }
}

if ([string]::IsNullOrEmpty($url)) {
    Write-Error "Failed to get Tunnel URL. Check tunnel.log"
    Stop-Process -Id $tunnelProcess.Id -Force
    exit 1
}

Write-Host "   > Tunnel Live: " -NoNewline -ForegroundColor Green
Write-Host $url -ForegroundColor Yellow

# 3. Start Local Agent with the Public URL
Write-Host "   > Connecting Agent to Cloud Brain..." -ForegroundColor Gray
Write-Host "   > (Press Ctrl+C to stop)" -ForegroundColor DarkGray

try {
    # Run the compiled agent
    .\devpilot-agent.exe $url
}
finally {
    Write-Host "`n🛑 Shutting down..." -ForegroundColor Red
    Stop-Process -Id $tunnelProcess.Id -Force
    if (Test-Path "tunnel.log") { Remove-Item "tunnel.log" }
}
