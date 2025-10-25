# Start Investment Framework - Backend and Frontend

# Start Backend
Write-Host "Starting Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command `"cd 'C:\Users\Dell\investment_framework\backend'; conda activate investenv; uvicorn server:app --reload --host 0.0.0.0 --port 8000`""

# Wait for backend
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command `"cd 'C:\Users\Dell\investment_framework\frontend'; npm start`""

# Wait for frontend
Start-Sleep -Seconds 5

# Open browser
Write-Host "Opening browser..." -ForegroundColor Green
Start-Process http://localhost:3000

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "To stop: Close both PowerShell windows" -ForegroundColor Yellow