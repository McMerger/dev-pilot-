$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -ExecutionPolicy Bypass -File ""$PSScriptRoot\start-agent.ps1"""
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive

Register-ScheduledTask -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -TaskName "SplitlineAgent" -Description "Background local agent for Splitline AI" -Force

Write-Host "✅ Splitline Service Installed!" -ForegroundColor Green
Write-Host "The agent will now start automatically whenever you log in."
Write-Host "To start it immediately without logging out, run: Start-ScheduledTask -TaskName 'SplitlineAgent'"
