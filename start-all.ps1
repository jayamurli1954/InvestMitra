# Comprehensive One-Click Startup Script for InvestPro

# --- Configuration ---
$backendPort  = 8000
$frontendPort = 3000
$backendPath  = "C:\Users\Dell\investment_framework\backend"
$frontendPath = "C:\Users\Dell\investment_framework\frontend"
$condaEnv     = "investenv"

# --- Function to Kill Processes by Port ---
function Kill-PortIfListening {
    param($Port)
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in $connections) {
                $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "Port $Port is in use by PID $($process.Id) (`$($process.ProcessName)). Terminating process..." -ForegroundColor Yellow
                    Stop-Process -Id $process.Id -Force
                }
            }
        } else {
            Write-Host "Port $Port is free." -ForegroundColor Green
        }
    } catch {
        Write-Host "An error occurred while trying to check/kill process on port $Port: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# --- Main Script ---
Write-Host "Starting InvestPro..." -ForegroundColor Cyan

# 1. Kill existing processes on ports
Kill-PortIfListening -Port $backendPort
Kill-PortIfListening -Port $frontendPort

# 2. Start Backend
$condaExePath = "C:\users\dell\anaconda3\Scripts\conda.exe"

if (-not (Test-Path $condaExePath)) {
    Write-Host "Error: conda.exe not found at the specified path: $condaExePath. Please verify your Anaconda/Miniconda installation." -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

Write-Host "Starting Backend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$condaExePath' run -n $condaEnv python -m uvicorn server:app --reload --host 0.0.0.0 --port $backendPort"

# Wait for backend to initialize
Start-Sleep -Seconds 5

# 3. Start Frontend
Write-Host "Starting Frontend Development Server..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm start"

# Wait for frontend to compile
Start-Sleep -Seconds 10

# 4. Open Browser
Write-Host "Opening browser at http://localhost:3000"
Start-Process "http://localhost:3000"

Write-Host "InvestPro started successfully!"
Read-Host "Press Enter to exit..."
