@echo off
REM VacanSee Application Startup Script

echo.
echo ========================================
echo   VacanSee - Reservation System
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.8+ from python.org
    pause
    exit /b 1
)

REM Go to the app directory
cd /d "%~dp0python-scheduler-api"

REM Check if venv exists, if not create it
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
    echo Virtual environment created!
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install/update dependencies
echo.
echo Installing dependencies...
pip install -r requirements.txt -q

REM Run setup route notification
echo.
echo ========================================
echo Setup Instructions:
echo ========================================
echo.
echo 1. Starting Flask server...
echo    The app will run at: http://localhost:5000
echo.
echo 2. IMPORTANT - On First Run:
echo    Visit http://localhost:5000/setup
echo    This initializes the database with test users and rooms
echo.
echo 3. Default Test Credentials:
echo    Admin:   admin / admin123
echo    Student: ccs / 1234
echo.
echo ========================================
echo.

REM Start Flask app
python app.py

pause
