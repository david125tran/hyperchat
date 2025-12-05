@echo off
echo ===============================
echo   Starting Python Backend
echo ===============================
echo.

cd /d "%~dp0backend"

where python >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Python is not installed or not in PATH.
    pause
    exit /b
)

echo Starting backend on http://localhost:4000 ...
python -m uvicorn app.main:app --reload --port 4000

echo.
echo Backend stopped.
pause
