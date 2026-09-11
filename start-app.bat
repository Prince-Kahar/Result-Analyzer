@echo off
title VNSGU Result Analyzer Launcher
color 0b
cls

echo ====================================================================
echo   VNSGU Student Result Analyzer (React + Node.js + Supabase)
echo   Veer Narmad South Gujarat University Examination Division
echo ====================================================================
echo.

echo [*] Starting Node.js Backend Server (Port 5050)...
cd /d "%~dp0backend"
start "VNSGU-Backend-Server" cmd /k "npm start"

timeout /t 2 /nobreak >nul

echo [*] Starting React Frontend Server (Port 5173)...
cd /d "%~dp0frontend"
start "VNSGU-Frontend-Server" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo [*] Opening Web Browser at http://localhost:5173...
start http://localhost:5173

echo.
echo ====================================================================
echo  [OK] Both Servers Running!
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:5050
echo ====================================================================
echo.
echo Do not close the command windows while using the website.
pause
