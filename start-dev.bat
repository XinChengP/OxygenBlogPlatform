@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo ========================================
echo   Blog Dev Server - Clear Cache and Start
echo ========================================
echo.

:RESTART
echo [1/4] Clearing .next cache...
if exist ".next" (
    rmdir /s /q ".next"
    echo     Done: .next removed
) else (
    echo     Skip: .next not found
)

echo.
echo [2/4] Clearing out directory...
if exist "out" (
    rmdir /s /q "out"
    echo     Done: out removed
) else (
    echo     Skip: out not found
)

echo.
echo [3/4] Clearing node_modules cache...
if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache"
    echo     Done: node_modules\.cache removed
) else (
    echo     Skip: node_modules\.cache not found
)

echo.
echo [4/4] Checking and stopping processes on port 7120...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":7120" ^| find "LISTENING"') do (
    echo     Stopping process PID %%a...
    taskkill /f /pid %%a >nul 2>&1
    if !errorlevel! equ 0 (
        echo     Done: Process %%a stopped
    ) else (
        echo     Failed: Could not stop process %%a
    )
)
echo     Done: Port 7120 is now free

echo.
echo [5/5] Starting dev server...
echo.
echo ========================================
echo   Server starting...
echo   Press Ctrl+C to stop
echo ========================================
echo.

start "Blog Dev Server" npm run dev

echo Waiting for server to start...
set MAX_WAIT=60
set WAIT_COUNT=0

:WAIT_SERVER
ping -n 2 127.0.0.1 >nul
set /a WAIT_COUNT+=1
echo Checking server... [%WAIT_COUNT%/%MAX_WAIT%]

powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:7120' -TimeoutSec 2 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>&1

if !errorlevel! equ 0 (
    echo Server is ready!
    goto START_ELECTRON
)

if !WAIT_COUNT! lss !MAX_WAIT! (
    goto WAIT_SERVER
)

echo.
echo Server failed to start within %MAX_WAIT% seconds
echo Please check if port 7120 is already in use.
pause
exit /b 1

:START_ELECTRON
echo.
echo Starting Electron Dev Preview...
echo.

REM Check if electron.exe exists
if not exist "node_modules\electron\electron.exe" (
    echo Electron binary not found. Please check Electron installation.
    echo You may need to manually extract the Electron package.
    pause
    exit /b 1
)

REM Start Electron app directly with warnings suppressed
set ELECTRON_DISABLE_SECURITY_WARNINGS=true
start "" "node_modules\electron\electron.exe" .

echo.
echo ========================================
echo   Dev server is running
echo   Electron window opened
echo   Close this window to stop everything
echo ========================================
echo.

REM Keep the batch running to maintain the dev server
echo Press any key to stop the dev server...
pause >nul

echo.
echo Stopping dev server...
taskkill /FI "WINDOWTITLE eq Blog Dev Server*" /F >nul 2>&1
echo Goodbye!
