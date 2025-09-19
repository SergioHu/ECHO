# Echo App Development Server Launcher
# This script starts both the backend and frontend servers for development

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " ECHO APP DEVELOPMENT ENVIRONMENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if backend is already running
$backendPort = 3000
$backendRunning = Test-NetConnection -ComputerName localhost -Port $backendPort -InformationLevel Quiet -WarningAction SilentlyContinue

if ($backendRunning) {
    Write-Host "✓ Backend already running on port $backendPort" -ForegroundColor Green
} else {
    Write-Host "Starting backend server on port $backendPort..." -ForegroundColor Yellow
    
    # Start backend in a new PowerShell window
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", @"
        cd '$PSScriptRoot'
        Write-Host '========================================' -ForegroundColor Green
        Write-Host ' ECHO BACKEND SERVER' -ForegroundColor Green
        Write-Host '========================================' -ForegroundColor Green
        Write-Host ''
        Write-Host 'Starting backend with dev stubs enabled...' -ForegroundColor Yellow
        node backend\face-blur-service-minimal.js
"@
    
    # Wait for backend to start
    Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    # Verify backend is running
    $backendRunning = Test-NetConnection -ComputerName localhost -Port $backendPort -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($backendRunning) {
        Write-Host "✓ Backend started successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ Backend failed to start. Please check the backend window for errors." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Starting Expo development server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host " EXPO FRONTEND SERVER" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# Start Expo in the current window
node_modules/.bin/expo start --clear