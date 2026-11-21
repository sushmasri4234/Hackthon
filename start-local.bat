@echo off
title CertiFlow - Pragati Skills Mission Platform
echo ============================================================
echo   CertiFlow - Skilling Certificate Issuance Platform
echo   Pragati Skills Mission Demo
echo ============================================================
echo.
echo Starting Backend API on http://localhost:3001 ...
start "CertiFlow Backend" cmd /k "cd /d %~dp0backend && node dist/standalone/standaloneServer.js"

echo Starting Frontend on http://localhost:5173 ...
start "CertiFlow Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================================
echo   CertiFlow is now launching!
echo   Frontend : http://localhost:5173
echo   API      : http://localhost:3001
echo   Demo users are ready for one-click login!
echo ============================================================
echo.
pause
