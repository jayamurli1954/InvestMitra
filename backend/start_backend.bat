@echo off
REM Quick Backend Launcher - Installs dependencies if needed
cd /d "%~dp0"

echo.
echo ====================================
echo    InvestMitra Backend Server
echo ====================================
echo.

REM Activate virtual environment
echo [1/3] Activating virtual environment...
if not exist .venv (
    echo ERROR: .venv folder not found!
    echo Please create virtual environment first.
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat
echo Virtual environment activated.
echo.

REM Check if dependencies are installed
echo [2/3] Checking dependencies...
python -c "import motor" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Dependencies not found. Installing from requirements.txt...
    pip install -r requirements.txt
    echo.
    echo Dependencies installed successfully!
    echo.
) else (
    echo Dependencies already installed.
    echo.
)

REM Start the server
if "%PORT%"=="" set PORT=5500
echo [3/3] Starting FastAPI server on port %PORT%...
echo.
echo ====================================
echo Backend is now running!
echo ====================================
echo Press CTRL+C to stop the server
echo.
uvicorn server:app --reload --host 0.0.0.0 --port %PORT%
