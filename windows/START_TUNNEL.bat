@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   AUCTION XI -- CLOUDFLARE MULTIPLAYER TUNNEL
echo ===================================================

where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] cloudflared is not installed or not in PATH.
    echo Please install cloudflared or check your environment.
    pause
    exit /b 1
)

set /p PORT="Enter local frontend port [default: 5173]: "
if "%PORT%"=="" set PORT=5173

echo.
echo Launching Cloudflare Tunnel on http://localhost:%PORT%...
echo Share the generated HTTPS URL with mobile devices to test multiplayer.
echo ===================================================
echo.

cloudflared tunnel --url http://localhost:%PORT%
pause
