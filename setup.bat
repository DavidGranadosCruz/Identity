@echo off
chcp 65001 >nul 2>&1
setlocal

echo.
echo  ╔══════════════════════════════════════╗
echo  ║     IDENTITY — Quick Setup           ║
echo  ╚══════════════════════════════════════╝
echo.

REM ── 1. Check Docker is installed and running ──────────────────
echo [1/3] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ERROR: Docker is not running or not installed.
    echo  Install Docker Desktop from: https://www.docker.com/products/docker-desktop
    echo  Start Docker Desktop and re-run this script.
    echo.
    pause
    exit /b 1
)
echo       Docker OK

REM ── 2. Generate .env if it does not exist ─────────────────────
echo [2/3] Configuring environment...
if not exist ".env" (
    copy ".env.example" ".env" >nul
    echo       .env created from template
) else (
    echo       .env already exists (skipped)
)

REM ── 3. Build and start all services ───────────────────────────
echo [3/3] Starting all services (this may take a few minutes the first time)...
echo.
docker compose up --build -d

if errorlevel 1 (
    echo.
    echo  ERROR: docker compose failed. Check the output above for details.
    pause
    exit /b 1
)

echo.
echo  ╔══════════════════════════════════════╗
echo  ║          Setup complete!             ║
echo  ╠══════════════════════════════════════╣
echo  ║                                      ║
echo  ║  App:          http://localhost:3000  ║
echo  ║  MinIO panel:  http://localhost:9001  ║
echo  ║                                      ║
echo  ║  To stop:   docker compose down      ║
echo  ║  To restart: docker compose up -d    ║
echo  ║                                      ║
echo  ╚══════════════════════════════════════╝
echo.
pause
