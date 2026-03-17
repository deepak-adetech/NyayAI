#!/bin/bash
# NyayaSahayak — Production Deploy Script
# ─────────────────────────────────────────────────────────────
# Usage:
#   ./deploy.sh                            # uses root@62.72.13.191
#   ./deploy.sh --pass yourpassword        # password auth
#   ./deploy.sh --key ~/.ssh/nyaya.pem     # key auth
#   ./deploy.sh ubuntu@1.2.3.4 --pass ... # custom server
#
# Deployment flow:
#   1. rsync source → /docker/nyayasahayak/ on server
#   2. docker build -t nyayasahayak:latest .
#   3. docker compose down && docker compose up -d
# ─────────────────────────────────────────────────────────────

set -e

SERVER="root@62.72.13.191"
KEY=""
PASSWORD=""
REMOTE_DIR="/docker/nyayasahayak"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --key)  KEY="-i $2"; shift 2 ;;
    --pass) PASSWORD="$2"; shift 2 ;;
    -*)     echo "Unknown option: $1"; exit 1 ;;
    *)      SERVER="$1"; shift ;;
  esac
done

SSH_BASE="-o StrictHostKeyChecking=accept-new -o ConnectTimeout=15"

run_ssh() {
  if [ -n "$PASSWORD" ]; then
    printf "%s" "$PASSWORD" > /tmp/.deploy_pass
    sshpass -f /tmp/.deploy_pass ssh $SSH_BASE $KEY "$SERVER" "$@"
    rm -f /tmp/.deploy_pass
  else
    ssh $SSH_BASE $KEY "$SERVER" "$@"
  fi
}

run_rsync() {
  if [ -n "$PASSWORD" ]; then
    printf "%s" "$PASSWORD" > /tmp/.deploy_pass
    sshpass -f /tmp/.deploy_pass rsync "$@"
    rm -f /tmp/.deploy_pass
  else
    rsync "$@"
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NyayaSahayak Deploy → $SERVER:$REMOTE_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Step 1: Sync source ──────────────────────────────────────
echo ""
echo "📦  Syncing source files..."
run_rsync -az --delete \
  $KEY \
  -e "ssh $SSH_BASE" \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.env \
  --exclude=.env.local \
  --exclude=.git \
  --exclude=storage \
  --exclude="*.log" \
  --exclude=electron-dist \
  --exclude="electron/out" \
  --exclude=electron \
  "$LOCAL_DIR/" \
  "$SERVER:$REMOTE_DIR/"
echo "✅  Source synced"

# ── Step 2: Docker build + restart ──────────────────────────
echo ""
echo "🐳  Building Docker image on server..."
run_ssh bash << 'REMOTE'
  set -e
  cd /docker/nyayasahayak

  echo "[1/2] Building image..."
  docker build -t nyayasahayak:latest . 2>&1 | grep -E "^(#[0-9]+ DONE|Step|ERROR|Successfully)" | tail -20

  echo "[2/2] Restarting container..."
  docker compose down 2>/dev/null || docker stop nyayasahayak 2>/dev/null && docker rm nyayasahayak 2>/dev/null || true
  docker compose up -d

  sleep 3
  echo "✅  Container status:"
  docker ps --filter name=nyayasahayak --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  echo ""
  echo "📋  Last 10 log lines:"
  docker logs nyayasahayak --tail=10 2>&1
REMOTE

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Deploy complete!"
echo "  Live at: https://case.ade-technologies.com"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
