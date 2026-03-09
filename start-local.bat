@echo off
set ROOT=%~dp0
cd /d "%ROOT%backend"
if not exist node_modules npm install
start "Assistant Backend" cmd /k "npm run dev"
start "Assistant Frontend" cmd /k "npm run frontend:watch"
timeout /t 2 >nul
start http://localhost:3001/app/user/
