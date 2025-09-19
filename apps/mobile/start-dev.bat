@echo off
setlocal enabledelayedexpansion

echo ========================================
echo  ECHO APP DEVELOPMENT ENVIRONMENT
echo ========================================
echo.

REM Free Expo-related ports so the CLI can start clean
set PORTS=8081 19000 19002 19006
for %%P in (%PORTS%) do call :killPort %%P

REM Check if backend is already running
netstat -an | find ":3000" | find "LISTENING" >nul
if %errorlevel%==0 (
    echo Backend already running on port 3000
) else (
    echo Starting backend simple dev server on port 3000...
    start "Echo Backend" cmd /k "cd /d %~dp0 && node backend\simple-dev-server.js"
    echo Waiting for backend to start...
    timeout /t 3 /nobreak >nul
)

echo.
echo Starting Expo development server (web)...
echo.
echo ========================================
echo  EXPO FRONTEND SERVER

echo ========================================
echo.

cd /d %~dp0
call node_modules\.bin\expo start --web
exit /b

:killPort
set PORT=%1
for /f "tokens=5" %%A in ('netstat -ano ^| findstr /r ":%PORT% .*LISTENING"') do (
    echo Stopping process %%A on port %PORT%...
    taskkill /PID %%A /F >nul 2>&1
)
exit /b
