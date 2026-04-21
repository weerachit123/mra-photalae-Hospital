@echo off
chcp 65001 >nul
title MRA Audit System - Local Server
echo ===================================================
echo      MRA Audit System (Medical Record Audit)
echo ===================================================

:: Check if Node.js is installed
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] ไม่พบ Node.js ในเครื่อง หรือไม่ได้ตั้งค่า Path
    echo กรุณาติดตั้ง Node.js (https://nodejs.org/) แล้วเปิดไฟล์นี้ใหม่อีกครั้ง
    echo.
    pause
    exit /b
)

echo [INFO] ตรวจสอบและติดตั้งแพ็กเกจที่จำเป็น (รอสักครู่)...
call npm install --no-fund --no-audit

echo.
echo [INFO] กำลังเปิดเซิร์ฟเวอร์ที่ Port 3001...
echo [INFO] หากมีหน้าต่าง Security Alert สีดำ (Firewall) ให้กด "Allow access"
echo.

:: กำหนด Port
set PORT=3001

:: รอ 3 วินาทีแล้วเปิดเบราว์เซอร์อัตโนมัติ
timeout /t 3 >nul
start http://localhost:3001

:: รันเซิร์ฟเวอร์
call npm run dev

pause
