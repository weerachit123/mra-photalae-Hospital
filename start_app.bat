@echo off
title MRA Audit System - Local Server

REM Change directory to where the bat file is located (fixes Administrator run issue)
cd /d "%~dp0"

echo ===================================================
echo      MRA Audit System (Medical Record Audit)
echo ===================================================

REM Check if Node.js is installed
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js (https://nodejs.org/) and try again.
    echo.
    pause
    exit /b
)

echo [INFO] Installing required packages... (Please wait)
call npm install
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install packages. Please check your internet connection.
    echo.
    pause
    exit /b
)

echo.
echo [INFO] Starting server on Port 3000...
echo [INFO] If Windows Security Alert (Firewall) appears, please click "Allow access"
echo.

REM Set Port
set PORT=3000

REM Open browser in the background (timeout 3s alternative)
start "" "http://localhost:3000"

REM Run the server
call npm run dev
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Server crashed or failed to start.
    echo.
    pause
)

pause
