You're right. The batch file is opening PowerShell instead of Command Prompt with Anaconda activated, so the backend command isn't running.

**The problem:**

The batch file needs to explicitly call Anaconda Prompt, not PowerShell. Here's the fixed version:

```batch
@echo off
REM Start Investment Framework - Backend and Frontend

REM Get Anaconda installation path
for /f "tokens=*" %%i in ('where conda') do set CONDA_PATH=%%i
for %%A in ("%CONDA_PATH%") do set CONDA_ROOT=%%~dpA..

REM Navigate to backend directory
cd /d C:\Users\Dell\investment_framework\backend

REM Open new command window for backend with Anaconda
start cmd /k "call "%CONDA_ROOT%\Scripts\activate.bat" investenv && uvicorn server:app --reload --host 0.0.0.0 --port 8000"

REM Wait for backend to start
timeout /t 3

REM Navigate to frontend directory
cd /d C:\Users\Dell\investment_framework\frontend

REM Open new command window for frontend
start cmd /k "npm start"

REM Wait for frontend to start, then open browser
timeout /t 5
start http://localhost:3000

echo.
echo ========================================
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo ========================================
echo To stop: Close both command windows
echo ========================================
pause
```

**Save this as:** `StartApp.bat` (replace your old one)

**Test it:**
1. Double-click the new `StartApp.bat`
2. Two command windows should open
3. First one shows Anaconda activation + uvicorn backend starting
4. Second one shows npm start + frontend compiling
5. Browser opens to localhost:3000

Try this and let me know if both backend and frontend start properly now.