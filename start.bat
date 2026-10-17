@echo off
setlocal enabledelayedexpansion
title Dataset Augmentation Studio

echo ===================================================
echo       Dataset Augmentation Studio Launcher
echo ===================================================
echo.

:: 1. Check for Python
where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PY_CMD=py"
) else (
    where python >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set "PY_CMD=python"
    ) else (
        echo [ERROR] Python is not installed or not in PATH.
        echo Please install Python 3.9+ from https://www.python.org/
        goto :error
    )
)

:: 2. Check for Node.js and npm
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm / Node.js is not installed or not in PATH.
    echo Please install Node.js 18+ from https://nodejs.org/
    goto :error
)

:: 3. Check for virtualenv or backend dependencies
set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"

if exist "%BACKEND_DIR%\.venv\Scripts\activate.bat" (
    echo [INFO] Using virtual environment at backend\.venv
    set "RUN_BACKEND=call .venv\Scripts\activate.bat && python main.py"
) else (
    echo [INFO] Virtual environment not found; using system Python (%PY_CMD%)
    set "RUN_BACKEND=%PY_CMD% main.py"
)

:: 4. Start backend in a separate window
echo [INFO] Starting Backend (FastAPI on http://127.0.0.1:8000)...
start "AugmentStudio - Backend" cmd /k "cd /d "%BACKEND_DIR%" && %RUN_BACKEND%"

:: 5. Brief wait to give backend a head start
timeout /t 3 /nobreak > nul

:: 6. Start frontend in a separate window
echo [INFO] Starting Frontend (Vite on http://localhost:5173)...
start "AugmentStudio - Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

:: 7. Success summary and open browser
echo.
echo ===================================================
echo Servers are launching:
echo   - Backend API:  http://127.0.0.1:8000
echo   - Swagger Docs: http://127.0.0.1:8000/docs
echo   - Frontend UI:  http://localhost:5173
echo ===================================================
echo.
echo Opening browser at http://localhost:5173 ...
timeout /t 2 /nobreak > nul
start http://localhost:5173

echo.
echo Keep the backend and frontend terminal windows open.
echo Press any key in this window to exit this launcher script.
pause > nul
exit /b 0

:error
echo.
echo Launcher stopped due to an error. Press any key to close.
pause > nul
exit /b 1
