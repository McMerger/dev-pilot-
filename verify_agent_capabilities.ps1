
# verify_agent_capabilities.ps1
$AgentUrl = "http://localhost:4001"
$ProjectId = "proj_devpilot"
$TestFile = "src/test_agent_write.txt"
$TestContent = "DevPilot Agent Write Verification " + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")

Write-Host "Verifying DevPilot Agent Capabilities..." -ForegroundColor Cyan

# 1. Test Writing
Write-Host "[1/3] Testing Write Capability..." -NoNewline
try {
    $body = @{
        projectId  = $ProjectId
        operations = @(
            @{
                op      = "create"
                path    = $TestFile
                content = $TestContent
            }
        )
    } | ConvertTo-Json -Depth 4

    $response = Invoke-RestMethod -Uri "$AgentUrl/tools/apply_patch" -Method Post -ContentType "application/json" -Body $body -ErrorAction Stop
    
    if ($response.applied -eq 1) {
        Write-Host " PASS" -ForegroundColor Green
    }
    else {
        Write-Host " FAIL" -ForegroundColor Red
        Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Yellow
        exit
    }
}
catch {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit
}

# 2. Test Reading
Write-Host "[2/3] Testing Read Capability..." -NoNewline
try {
    $body = @{
        projectId = $ProjectId
        path      = $TestFile
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$AgentUrl/tools/read_file" -Method Post -ContentType "application/json" -Body $body -ErrorAction Stop

    if ($response.content -eq $TestContent) {
        Write-Host " PASS" -ForegroundColor Green
    }
    else {
        Write-Host " FAIL (Mismatch)" -ForegroundColor Red
        exit
    }
}
catch {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit
}

# 3. Test Deleting
Write-Host "[3/3] Testing Delete Capability..." -NoNewline
try {
    $body = @{
        projectId  = $ProjectId
        operations = @(
            @{
                op   = "delete"
                path = $TestFile
            }
        )
    } | ConvertTo-Json -Depth 4

    $response = Invoke-RestMethod -Uri "$AgentUrl/tools/apply_patch" -Method Post -ContentType "application/json" -Body $body -ErrorAction Stop

    if ($response.applied -eq 1) {
        Write-Host " PASS" -ForegroundColor Green
    }
    else {
        Write-Host " FAIL" -ForegroundColor Red
        Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Yellow
        exit
    }
}
catch {
    Write-Host " ERROR" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit
}

Write-Host "SUCCESS: Agent is fully capable of Read/Write/Delete operations." -ForegroundColor Green
