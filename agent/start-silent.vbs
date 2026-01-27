Set WshShell = CreateObject("WScript.Shell")
' 0 = Hidden completely (No Window)
WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File ""start-agent.ps1""", 0, False
