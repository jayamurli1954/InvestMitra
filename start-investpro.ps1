# start-investpro.ps1
# InvestPro launcher: starts MongoDB (service or mongod), then backend and frontend.

Write-Host "`n🚀  Starting InvestPro (MongoDB + backend + frontend)" -ForegroundColor Cyan

# ---------- CONFIG ----------
$backendPath  = "C:\Users\Dell\investment_framework\backend"
$frontendPath = "C:\Users\Dell\investment_framework\frontend"
$backendPort  = 8000
$frontendPort = 3000
$condaEnv     = "investenv"
# If you have a custom mongod.exe path, set it here (uncomment and edit)
# $mongodPath   = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
# ----------------------------

function Kill-PortIfListening {
    param($Port)
    $lines = netstat -ano | findstr ":$Port"
    if ($lines) {
        $pids = ($lines -split "`n" | ForEach-Object { $_.Trim() } | ForEach-Object {
            $parts = $_ -split '\s+'
            $parts[-1]
        }) | Select-Object -Unique
        foreach ($pid in $pids) {
            if ($pid -and $pid -ne "0") {
                Write-Host "🔴 Killing PID $pid using port $Port..." -ForegroundColor Yellow
                taskkill /PID $pid /F | Out-Null
            }
        }
    } else {
        Write-Host "🟢 Port $Port is free" -ForegroundColor Green
    }
}

# Kill old processes on configured ports
Kill-PortIfListening -Port $backendPort
Kill-PortIfListening -Port $frontendPort

# ---------- Start / Ensure MongoDB ----------
function Try-StartMongoService {
    param($name)
    try {
        Write-Host "Trying to start Windows service '$name'..." -ForegroundColor Cyan
        $out = net start $name 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Service '$name' started." -ForegroundColor Green
            return $true
        } else {
            # net start prints a message; inspect it for "was started"
            if ($out -match "already been started|was started|running") {
                Write-Host "ℹ️ Service '$name' appears to be running." -ForegroundColor Green
                return $true
            }
            return $false
        }
    } catch {
        return $false
    }
}

$mongoStarted = $false
$serviceNames = @("MongoDB","MongoDBServer","mongodb")
foreach ($s in $serviceNames) {
    if (Try-StartMongoService -name $s) {
        $mongoStarted = $true
        break
    }
}

if (-not $mongoStarted) {
    Write-Host "⚠️ Could not start MongoDB as a named service. Trying to locate mongod.exe..." -ForegroundColor Yellow

    # If user provided explicit path earlier, try that first
    if ($mongodPath) {
        if (Test-Path $mongodPath) {
            $startMongodPath = $mongodPath
        }
    }

    if (-not $startMongodPath) {
        # Common locations
        $possible = @(
            "C:\Program Files\MongoDB\Server\*\bin\mongod.exe",
            "C:\Program Files (x86)\MongoDB\Server\*\bin\mongod.exe",
            "C:\mongodb\bin\mongod.exe"
        )
        foreach ($p in $possible) {
            $matches = Get-ChildItem -Path $p -ErrorAction SilentlyContinue
            if ($matches) {
                $startMongodPath = $matches[0].FullName
                break
            }
        }
    }

    if ($startMongodPath -and (Test-Path $startMongodPath)) {
        Write-Host "📍 Found mongod at: $startMongodPath" -ForegroundColor Cyan
        Write-Host "🟢 Launching mongod in a new PowerShell window (will run until you close it)..." -ForegroundColor Cyan
        Start-Process powershell -ArgumentList @(
            "-NoExit",
            "-Command",
            "`"$startMongodPath`" --dbpath `"$env:USERPROFILE\mongodb-data`" --port 27017"
        ) -WindowStyle Normal
        Start-Sleep -Seconds 3
        $mongoStarted = $true
    } else {
        Write-Host "❌ Could not find mongod.exe automatically. Please install MongoDB or run it as a service." -ForegroundColor Red
        Write-Host "If you have mongod.exe, set the \$mongodPath variable in this script to its full path." -ForegroundColor Yellow
    }
}

# ---------- Start Backend (Uvicorn) ----------
if ($mongoStarted) {
    Write-Host "`n⚙️  Launching Backend (FastAPI/Uvicorn on port $backendPort)..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "conda activate $condaEnv;
         cd '$backendPath';
         set MONGO_URL=mongodb://localhost:27017;
         set DB_NAME=investdb;
         uvicorn server:app --reload --port $backendPort"
    ) -WindowStyle Normal
} else {
    Write-Host "`n⚠️ Skipping backend start because MongoDB is not running." -ForegroundColor Yellow
    Write-Host "Start MongoDB and re-run this script." -ForegroundColor Yellow
}

Start-Sleep -Seconds 3

# ---------- Start Frontend (React) ----------
Write-Host "`n🌐  Launching Frontend (React on port $frontendPort)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$frontendPath';
     set PORT=$frontendPort;
     npm start"
) -WindowStyle Normal

Write-Host "`n✅  Launcher finished. Check the new windows for logs." -ForegroundColor Green
Write-Host "   Backend → http://127.0.0.1:$backendPort"
Write-Host "   Frontend → http://localhost:$frontendPort/auth`n" -ForegroundColor Yellow
