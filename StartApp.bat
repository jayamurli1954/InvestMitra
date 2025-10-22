@echo off
REM Start Investment Framework - Backend and Frontend

REM Navigate to backend directory
cd /d C:\Users\Dell\investment_framework\backend

REM Open new command window for backend
start cmd /k "call conda activate investenv && uvicorn server:app --reload --host 0.0.0.0 --port 8000"

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