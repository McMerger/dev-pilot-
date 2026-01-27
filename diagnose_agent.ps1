
# diagnose_agent.ps1
$AgentUrl = "http://localhost:4001"
$ProjectId = "proj_devpilot"

Write-Host "🕵️ Starting Deep Diagnostic..." -ForegroundColor Cyan

function Test-AgentTool {
    param($Name, $Tool, $Params)
    Write-Host "Testing $Name... " -NoNewline
    try {
        $body = @{ projectId = $ProjectId }
        foreach ($key in $Params.Keys) { $body[$key] = $Params[$key] }
        $json = $body | ConvertTo-Json -Depth 4
        $response = Invoke-RestMethod -Uri "$AgentUrl/tools/$Tool" -Method Post -ContentType "application/json" -Body $json -ErrorAction Stop
        
        if ($Tool -eq "apply_patch") {
            if ($response.applied -eq 1) { Write-Host "PASS" -ForegroundColor Green }
            else { Write-Host "FAIL (Applied=0)" -ForegroundColor Red; Write-Host ($response | ConvertTo-Json) }
        }
        elseif ($Tool -eq "read_file") {
            if ($response.content) { Write-Host "PASS" -ForegroundColor Green }
            else { Write-Host "FAIL (Empty)" -ForegroundColor Red }
        }
        else {
            Write-Host "PASS" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "FAIL (Error)" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}

# 1. List Files (Root)
Test-AgentTool "List Files (Root)" "list_files" @{ path = "." }

# 2. List Files (Subdir)
Test-AgentTool "List Files (src)" "list_files" @{ path = "src" }

# 3. Read File (Root)
Test-AgentTool "Read File (package.json)" "read_file" @{ path = "package.json" }

# 4. Read File (Subdir - Forward Slash)
Test-AgentTool "Read File (src/App.tsx)" "read_file" @{ path = "src/App.tsx" }

# 5. Read File (Subdir - Back Slash)
Test-AgentTool "Read File (src\App.tsx)" "read_file" @{ path = "src\App.tsx" }

# 6. Read File (Missing)
Test-AgentTool "Read File (Missing)" "read_file" @{ path = "missing.txt" }

# 7. Write File (Create)
Test-AgentTool "Write File (src/diag.txt)" "apply_patch" @{ operations = @(@{ op = "create"; path = "src/diag.txt"; content = "Diagnostic" }) }

# 8. Read Written File
Test-AgentTool "Read Written File" "read_file" @{ path = "src/diag.txt" }

# 9. Delete File
Test-AgentTool "Delete File" "apply_patch" @{ operations = @(@{ op = "delete"; path = "src/diag.txt" }) }

Write-Host "Diagnostic Complete."
