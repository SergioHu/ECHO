# Echo App Development Server Launcher
# Starts backend simple dev server and Expo in one go

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " ECHO APP DEVELOPMENT ENVIRONMENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Stop-PortProcess {
    param([int]$Port)
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($pid in $pids) {
                try {
                    $proc = Get-Process -Id $pid -ErrorAction Stop
                    Write-Host "Stopping process $($proc.ProcessName) (PID $pid) on port $Port..." -ForegroundColor Yellow
                    Stop-Process -Id $pid -Force -ErrorAction Stop
                } catch {
                    Write-Host "Unable to stop process on port $Port: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
        }
    } catch {
        Write-Host "Failed to inspect port $Port: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Free Expo-related ports so the CLI can start cleanly
$frontendPorts = @(8081, 19000, 19002, 19006)
foreach ($port in $frontendPorts) {
    Stop-PortProcess -Port $port
}

# Ensure backend server is running
$backendPort = 3000
$backendRunning = Test-NetConnection -ComputerName localhost -Port $backendPort -InformationLevel Quiet -WarningAction SilentlyContinue

if ($backendRunning) {
    Write-Host "? Backend already running on port $backendPort" -ForegroundColor Green
} else {
    Write-Host "Starting backend simple dev server on port $backendPort..." -ForegroundColor Yellow

    Start-Process pwsh -ArgumentList "-NoExit", "-Command", @"
        cd '$PSScriptRoot'
        Write-Host '========================================' -ForegroundColor Green
        Write-Host ' ECHO BACKEND SERVER' -ForegroundColor Green
        Write-Host '========================================' -ForegroundColor Green
        Write-Host ''
        Write-Host 'Starting backend simple-dev-server.js (all stubs enabled)...' -ForegroundColor Yellow
        node backend/simple-dev-server.js
"@

    Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3

    $backendRunning = Test-NetConnection -ComputerName localhost -Port $backendPort -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($backendRunning) {
        Write-Host "? Backend started successfully!" -ForegroundColor Green
    } else {
        Write-Host "? Backend failed to start. Check the backend window for errors." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Starting Expo development server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host " EXPO FRONTEND SERVER" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# Start Expo in the current window so logs stay visible
node_modules/.bin/expo start --web
