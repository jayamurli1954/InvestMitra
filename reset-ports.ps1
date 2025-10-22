# reset-ports.ps1
$ports = @(3000, 8000)
foreach ($port in $ports) {
    $pid = (netstat -ano | findstr ":$port" | Select-String -Pattern "LISTENING").ToString().Split()[-1]
    if ($pid) {
        Write-Host "Killing process on port $port (PID $pid)..."
        taskkill /PID $pid /F
    } else {
        Write-Host "No process found on port $port"
    }
}
