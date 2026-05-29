
@echo off
echo ==========================================
echo NK 3D CUSTOMIZER - STARTING
echo ==========================================
if not exist node_modules (
    echo node_modules not found. Running setup first...
    call setup.bat
)
echo Launching development server...
npm run dev
pause
