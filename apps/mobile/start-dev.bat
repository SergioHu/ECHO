@echo off
echo ========================================
echo  ECHO APP DEVELOPMENT ENVIRONMENT
echo ========================================
echo.

REM Check if backend is running
netstat -an | find "3000" | find "LISTENING" >nul
if %errorlevel%==0 (
    echo Backend already running on port 3000
) else (
    echo Starting backend server...
    start "Echo Backend" cmd /k "node backend\face-blur-service-minimal.js"
    echo Waiting for backend to start...
    timeout /t 3 /nobreak >nul
)

echo.
echo Starting Expo development server...
echo.
echo ========================================
echo  EXPO FRONTEND SERVER
echo ========================================
echo.

call node_modules\.bin\expo start --clear