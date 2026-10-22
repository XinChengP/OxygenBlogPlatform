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
REM 新增/修改图片时，predev 会全量重建 public/_responsive 下的 WebP 变体，
REM 实测约 100 秒（218 张源图 / 487 个变体 / 47MB），机器负载高时更久；
REM 图片无变化时 predev 只做哈希校验，通常 1 秒内完成。
REM 等待上限设为 600 秒，避免把「正在生成图片」误判为启动失败，
REM 用户关掉窗口会导致生成中断，留下残缺产物、页面大面积破图。
set MAX_WAIT=600
set WAIT_COUNT=0

:WAIT_SERVER
ping -n 2 127.0.0.1 >nul
set /a WAIT_COUNT+=1
REM 前 150 次轮询更可能处在图片生成阶段，提示语单独区分，避免误以为卡死
if !WAIT_COUNT! lss 150 (
    echo 正在生成响应式图片并启动服务，请勿关闭窗口... [!WAIT_COUNT!/%MAX_WAIT%]
) else (
    echo Checking server... [!WAIT_COUNT!/%MAX_WAIT%]
)

powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:7120' -TimeoutSec 2 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>&1

if !errorlevel! equ 0 (
    echo Server is ready!
    goto START_ELECTRON
)

if !WAIT_COUNT! lss !MAX_WAIT! (
    goto WAIT_SERVER
)

echo.
echo 等待 %MAX_WAIT% 秒后开发服务器仍未就绪。
echo 请不要直接关闭上面弹出的 "Blog Dev Server" 窗口：
echo 图片生成可能仍在进行，强制关闭会留下残缺的 public/_responsive 产物，
echo 导致页面大面积破图（此时需要重新执行 npm run generate:responsive 修复）。
echo 请先查看该窗口的输出，确认是否真的报错；也请检查 7120 端口是否被占用。
pause
exit /b 1

:START_ELECTRON
echo.
echo Starting Electron Dev Preview...
echo.

REM Check if electron.exe exists
if not exist "node_modules\electron\dist\electron.exe" (
    echo Electron binary not found. Please check Electron installation.
    echo You may need to manually extract the Electron package.
    pause
    exit /b 1
)

REM Start Electron app directly with warnings suppressed
set ELECTRON_DISABLE_SECURITY_WARNINGS=true
start "" "node_modules\electron\dist\electron.exe" .

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
