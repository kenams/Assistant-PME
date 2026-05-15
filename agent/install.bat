@echo off
setlocal EnableDelayedExpansion

set TASK_NAME=KAH-IT-Agent
set AGENT_DIR=%~dp0
set AGENT_SCRIPT=%AGENT_DIR%agent.js
set LOG=%AGENT_DIR%install.log

echo [KAH] =============================================
echo [KAH]  Installation de l'agent IT Kah-Digital
echo [KAH] =============================================
echo.

:: Verifier si Node.js est installe
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [KAH] Node.js non detecte. Installation automatique...
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements >"%LOG%" 2>&1
    if !ERRORLEVEL! neq 0 (
        echo [KAH] Winget echoue. Tentative via chocolatey...
        choco install nodejs-lts -y >>"%LOG%" 2>&1
        if !ERRORLEVEL! neq 0 (
            echo [KAH] ERREUR: Impossible d'installer Node.js automatiquement.
            echo [KAH] Installez Node.js manuellement: https://nodejs.org/
            pause
            exit /b 1
        )
    )
    :: Recharger PATH
    call refreshenv >nul 2>nul
    where node >nul 2>nul
    if !ERRORLEVEL! neq 0 (
        echo [KAH] Node.js installe. Relancez ce script.
        pause
        exit /b 0
    )
)

for /f "tokens=*" %%v in ('node --version 2^>nul') do set NODE_VER=%%v
echo [KAH] Node.js detecte: %NODE_VER%

:: Supprimer ancienne tache si elle existe
schtasks /query /tn "%TASK_NAME%" >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [KAH] Suppression de l'ancienne tache...
    schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1
)

:: Creer la tache planifiee (demarrage a la connexion, utilisateur courant)
echo [KAH] Creation de la tache de demarrage automatique...
schtasks /create /tn "%TASK_NAME%" ^
  /tr "node \"%AGENT_SCRIPT%\"" ^
  /sc onlogon ^
  /delay 0000:10 ^
  /f >nul 2>&1

if %ERRORLEVEL% equ 0 (
    echo [KAH] Tache creee avec succes.
) else (
    echo [KAH] AVERTISSEMENT: Impossible de creer la tache planifiee.
    echo [KAH] L'agent sera lance manuellement.
)

:: Demarrer l'agent immediatement (en arriere-plan)
echo [KAH] Demarrage de l'agent...
taskkill /f /im node.exe /fi "WINDOWTITLE eq KAH*" >nul 2>nul
start "" /b node "%AGENT_SCRIPT%"

:: Verifier que l'agent repond
timeout /t 2 /nobreak >nul
curl -s --max-time 2 http://localhost:47878 >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [KAH] Agent operationnel sur http://localhost:47878
) else (
    echo [KAH] Agent demarre (verification impossible sans curl).
)

echo.
echo [KAH] Installation terminee !
echo [KAH] L'agent demarrera automatiquement a chaque connexion Windows.
echo.
pause
