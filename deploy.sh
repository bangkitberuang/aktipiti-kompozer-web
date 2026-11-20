#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "[ERROR] Docker Compose tidak ditemukan."
  exit 1
fi

TRAEFIK_DIR="${TRAEFIK_DYNAMIC_DIR:-/data/coolify/proxy/dynamic}"
if [ -d "$TRAEFIK_DIR" ]; then
  echo "[*] Memasang routing Traefik ke $TRAEFIK_DIR/aktipiti.yaml ..."
  cp traefik/aktipiti.yaml "$TRAEFIK_DIR/aktipiti.yaml"
else
  echo "[!] Direktori $TRAEFIK_DIR tidak ditemukan. Salin traefik/aktipiti.yaml ke direktori Traefik dynamic Anda."
fi

echo "[*] Membangun dan menjalankan container aktipiti-web..."
$DC up -d --build

echo "[OK] Aktipiti Kompozer Web aktif di https://aktipiti.bangkit.io"
