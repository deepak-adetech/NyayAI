#!/bin/bash
# NyayaSahayak — Production Deploy Script
# ─────────────────────────────────────────────────────────────
# Usage:
#   ./deploy.sh                            # uses root@62.72.13.191, prompts for password
#   ./deploy.sh --key ~/.ssh/nyaya.pem     # uses SSH key
#   ./deploy.sh ubuntu@1.2.3.4 --key ...  # custom server
#
# Requirements on server:
#   - node >= 20, npm, pm2 (npm i -g pm2)
#   - /opt/nyayasahayak/.env.local must already exist with DB_URL, NEXTAUTH_SECRET etc.
# ─────────────────────────────────────────────────────────────

set -e

SERVER="root@62.72.13.191"
KEY=""
PASSWORD=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --key)     KEY="-i $2"; shift 2 ;;
    --pass)    PASSWORD="$2"; shift 2 ;;
    -*)        echo "Unknown option: $1"; exit 1 ;;
    *)         SERVER="$1"; shift ;;
  esac
done

SSH_BASE="-o StrictHostKeyChecking=accept-new -o ConnectTimeout=10"
SSH_OPTS="$SSH_BASE $KEY"
REMOTE_DIR="/opt/nyayasahayak"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NyayaSahayak Deploy → $SERVER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Helper: run ssh with optional sshpass
run_ssh() {
  if [ -n "$PASSWORD" ]; then
    sshpass -p "$PASSWORD" ssh $SSH_OPTS "$SERVER" "$@"
  else
    ssh $SSH_OPTS "$SERVER" "$@"
  fi
}

run_rsync() {
  if [ -n "$PASSWORD" ]; then
    sshpass -p "$PASSWORD" rsync "$@"
  else
    rsync "$@"
  fi
}

# ── Step 1: Sync source ──────────────────────────────────────
echo ""
echo "📦  Syncing source to $SERVER:$REMOTE_DIR ..."
run_rsync -az --delete \
  $KEY \
  -e "ssh $SSH_BASE" \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.env.local \
  --exclude=.git \
  --exclude=storage \
  --exclude="*.log" \
  --exclude=electron-dist \
  --exclude="electron/out" \
  "$LOCAL_DIR/" \
  "$SERVER:$REMOTE_DIR/"
echo "✅  Source synced"

# ── Step 2: Remote build + restart ──────────────────────────
echo ""
echo "🔨  Building on server..."
run_ssh bash << 'REMOTE'
  set -e
  cd /opt/nyayasahayak

  # Load nvm if present
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  export PATH="$HOME/.nvm/versions/node/$(node --version 2>/dev/null || echo v20)/bin:/usr/local/bin:$PATH"

  echo "[1/4] Installing dependencies..."
  npm ci --legacy-peer-deps --prefer-offline 2>&1 | tail -5

  echo "[2/4] Generating Prisma client..."
  npm run db:generate

  echo "[3/4] Building Next.js..."
  npm run build 2>&1 | tail -20

  echo "[4/4] Restarting application..."
  if command -v pm2 &>/dev/null; then
    pm2 restart nyayasahayak 2>/dev/null \
      || pm2 start npm --name nyayasahayak -- start --update-env
    pm2 save --force
    echo "✅  Restarted via PM2"
  elif systemctl list-units --type=service | grep -q nyayasahayak; then
    systemctl restart nyayasahayak
    echo "✅  Restarted via systemctl"
  else
    echo "⚠️   No process manager running. Start manually:"
    echo "     cd /opt/nyayasahayak && pm2 start npm --name nyayasahayak -- start"
  fi

  echo ""
  echo "Server status:"
  pm2 list 2>/dev/null | grep nyaya || true
REMOTE

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Deploy complete!"
echo "  Live at: https://case.ade-technologies.com"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
