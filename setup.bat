
@echo off
echo ==========================================
echo NK 3D CUSTOMIZER - SETUP
echo ==========================================
echo Checking for Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed. Please install it from https://nodejs.org/
    pause
    exit /b
)
echo Installing dependencies...
call npm install
echo.
echo Setup complete! You can now run start.bat
echo.
pause
