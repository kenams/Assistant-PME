@echo off
set NODE_TLS_REJECT_UNAUTHORIZED=0
cd /d "%~dp0backend"
echo Serveur demarrage sur http://localhost:3001
node src/index.js
