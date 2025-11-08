# Start Investment Framework - Backend and Frontend

# Start the backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\.venv\Scripts\activate; uvicorn server:app --reload --host 0.0.0.0 --port 8000"

# Wait for the backend to start
Start-Sleep -Seconds 5

# Start the frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start"

# Wait for the frontend to start, then open the browser
Start-Sleep -Seconds 10
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "======================================="
Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:3000"
Write-Host "======================================="
Write-Host "To stop: Close both terminal windows"
Write-Host "======================================="
