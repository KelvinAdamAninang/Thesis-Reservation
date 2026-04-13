@echo off
REM VacanSee Reservation API Startup Script using Gunicorn (Windows)

cd python-scheduler-api

REM Set environment variables
set DEBUG=%DEBUG:False%
set FLASK_ENV=%FLASK_ENV:production%
set PORT=%PORT:5000%

echo Starting VacanSee Reservation API...
echo   Bind: 0.0.0.0:%PORT%
echo   Environment: %FLASK_ENV%

REM Start gunicorn with config file
gunicorn --config gunicorn_config.py --bind 0.0.0.0:%PORT% app:app

pause
