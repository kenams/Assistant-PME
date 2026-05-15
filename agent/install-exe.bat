@echo off
setlocal EnableDelayedExpansion

set TASK_NAME=KAH-IT-Agent
set AGENT_DIR=%~dp0
set AGENT_EXE=%AGENT_DIR%dist\kah-agent.exe

echo [KAH] Installation de l'agent IT Kah-Digital (standalone)...

if not exist "%AGENT_EXE%" (
    echo [KAH] ERREUR: kah-agent.exe introuvable dans dist\
    echo [KAH] Compilez d'abord avec: npm run build
    pause
    exit /b 1
)

:: Supprimer ancienne tache
schtasks /query /tn "%TASK_NAME%" >nul 2>nul
if %ERRORLEVEL% equ 0 (
    schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1
)

:: Creer la tache (demarrage a la connexion, 10s de delai)
schtasks /create /tn "%TASK_NAME%" ^
  /tr "\"%AGENT_EXE%\"" ^
  /sc onlogon ^
  /delay 0000:10 ^
  /f >nul 2>&1

if %ERRORLEVEL% equ 0 (
    echo [KAH] Tache creee avec succes.
) else (
    echo [KAH] AVERTISSEMENT: creation tache echouee (essayez en admin).
)

:: Demarrer maintenant
taskkill /f /im kah-agent.exe >nul 2>nul
start "" /b "%AGENT_EXE%"
timeout /t 2 /nobreak >nul

curl -s --max-time 2 http://localhost:47878 >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [KAH] Agent operationnel!
) else (
    echo [KAH] Agent demarre.
)

echo [KAH] Termine. Demarrage automatique active.
pause
