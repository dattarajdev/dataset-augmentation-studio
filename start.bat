@echo off
title Dataset Augmentation Studio

echo Starting Dataset Augmentation Studio...
echo.

:: Start backend in a new window (uses Python 3.11 which has all packages installed)
start "Backend - FastAPI" cmd /k "cd /d %~dp0backend && py -3.11 main.py"

:: Wait a moment for backend to start
timeout /t 2 /nobreak > nul

:: Start frontend in a new window
start "Frontend - Vite" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers are starting...
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo.
echo Open http://localhost:5173 in your browser.
pause
