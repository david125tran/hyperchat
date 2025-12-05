@echo off
setlocal

echo ================================
echo   Starting React App (Vite)
echo ================================
echo.

:: Change to the frontend folder
cd /d "%~dp0frontend"
echo Current directory: %cd%
echo.

:: Check that package.json exists here
IF NOT EXIST "package.json" (
    echo ERROR: package.json not found in %cd%
    echo Make sure your frontend folder has package.json.
    pause
    exit /b
)

:: Ensure node is available
where node >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    pause
    exit /b
)

:: Ensure npm is available
where npm >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm is not installed or not in PATH.
    pause
    exit /b
)

:: Install dependencies if node_modules is missing
IF NOT EXIST "node_modules" (
    echo node_modules not found. Installing dependencies...
    npm install
    IF %ERRORLEVEL% NEQ 0 (
        echo ERROR: npm install failed.
        pause
        exit /b
    )
)

echo.
echo Starting development server...
echo.

call npm start

echo.
echo Dev server exited with code %ERRORLEVEL%.
pause
endlocal
