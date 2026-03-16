#!/bin/bash
# NyayaSahayak — Production Deploy Script
# Usage: ./deploy.sh <server_user>@<server_ip> [--key /path/to/key.pem]
#
# Example:
#   ./deploy.sh root@62.72.13.191
#   ./deploy.sh ubuntu@62.72.13.191 --key ~/.ssh/nyaya.pem

set -e

SERVER="${1:-root@62.72.13.191}"
KEY=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --key) KEY="-i $2"; shift 2 ;;
    *) shift ;;
  esac
done

SSH_OPTS="-o StrictHostKeyChecking=accept-new $KEY"
REMOTE_DIR="/opt/nyayasahayak"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NyayaSahayak Deploy → $SERVER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Sync source files (excluding node_modules and .next)
echo ""
echo "📦 Syncing source to server..."
rsync -az --delete \
  $KEY \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.env.local \
  --exclude=storage \
  --exclude="*.log" \
  "$LOCAL_DIR/" \
  "$SERVER:$REMOTE_DIR/"

echo "✅ Source synced"

# Step 2: Remote build + restart
echo ""
echo "🔨 Building on server..."
ssh $SSH_OPTS "$SERVER" bash << 'REMOTE_SCRIPT'
  set -e
  cd /opt/nyayasahayak

  # Load nvm if available
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

  echo "[1/4] Installing dependencies..."
  npm ci --legacy-peer-deps --silent

  echo "[2/4] Generating Prisma client..."
  npm run db:generate

  echo "[3/4] Building Next.js..."
  npm run build

  echo "[4/4] Restarting application..."
  # Try PM2 first, then fallback to systemctl
  if command -v pm2 &>/dev/null; then
    pm2 restart nyayasahayak 2>/dev/null || pm2 start npm --name nyayasahayak -- start
    pm2 save
    echo "✅ Restarted via PM2"
  elif systemctl is-active --quiet nyayasahayak 2>/dev/null; then
    systemctl restart nyayasahayak
    echo "✅ Restarted via systemctl"
  else
    echo "⚠️  No process manager found. Start manually: cd $REMOTE_DIR && npm start"
  fi

REMOTE_SCRIPT

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Deploy complete!"
echo "  Live at: https://case.ade-technologies.com"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
