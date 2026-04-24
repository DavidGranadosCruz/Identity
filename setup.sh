#!/usr/bin/env bash
set -euo pipefail

echo ""
echo " ╔══════════════════════════════════════╗"
echo " ║     IDENTITY — Quick Setup           ║"
echo " ╚══════════════════════════════════════╝"
echo ""

# ── 1. Check Docker ─────────────────────────────────────────────
echo "[1/3] Checking Docker..."
if ! docker info > /dev/null 2>&1; then
  echo ""
  echo "  ERROR: Docker is not running or not installed."
  echo "  Install it from: https://www.docker.com/products/docker-desktop"
  echo "  Start Docker and re-run this script."
  echo ""
  exit 1
fi
echo "      Docker OK"

# ── 2. Generate .env if missing ─────────────────────────────────
echo "[2/3] Configuring environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "      .env created from template"
else
  echo "      .env already exists (skipped)"
fi

# ── 3. Build and start ─────────────────────────────────────────
echo "[3/3] Starting all services (first run may take a few minutes)..."
echo ""
docker compose up --build -d

echo ""
echo " ╔══════════════════════════════════════╗"
echo " ║          Setup complete!             ║"
echo " ╠══════════════════════════════════════╣"
echo " ║                                      ║"
echo " ║  App:          http://localhost:3000  ║"
echo " ║  MinIO panel:  http://localhost:9001  ║"
echo " ║                                      ║"
echo " ║  To stop:   docker compose down      ║"
echo " ║  To restart: docker compose up -d    ║"
echo " ║                                      ║"
echo " ╚══════════════════════════════════════╝"
echo ""
