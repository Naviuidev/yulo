#!/usr/bin/env bash
set -euo pipefail

# One-command deploy: build locally → rsync to MilesWeb
# Usage:
#   ./scripts/deploy.sh              # deploy all
#   ./scripts/deploy.sh website      # website only
#   ./scripts/deploy.sh admin        # admin only
#   ./scripts/deploy.sh api          # api only
#   ./scripts/deploy.sh website admin

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$ROOT/deploy.env" ]]; then
  echo "Missing deploy.env"
  echo "Run:  cp deploy.env.example deploy.env"
  echo "Then edit deploy.env with your MilesWeb SSH user/host."
  exit 1
fi

# shellcheck disable=SC1091
source "$ROOT/deploy.env"

: "${DEPLOY_HOST:?Set DEPLOY_HOST in deploy.env}"
: "${DEPLOY_USER:?Set DEPLOY_USER in deploy.env}"
: "${DEPLOY_PORT:=22}"
: "${REMOTE_WEBSITE:?Set REMOTE_WEBSITE in deploy.env}"
: "${REMOTE_ADMIN:?Set REMOTE_ADMIN in deploy.env}"
: "${REMOTE_API:?Set REMOTE_API in deploy.env}"

# Guard: unquoted ~/... in deploy.env expands to your Mac home and breaks rsync
if [[ "$REMOTE_WEBSITE" == /Users/* || "$REMOTE_ADMIN" == /Users/* || "$REMOTE_API" == /Users/* ]]; then
  echo "ERROR: Remote paths look like Mac paths (got $REMOTE_WEBSITE)."
  echo "In deploy.env use single quotes: REMOTE_WEBSITE='~/public_html'"
  echo "Or absolute server paths: REMOTE_WEBSITE=/home/$DEPLOY_USER/public_html"
  exit 1
fi

SSH=(ssh -p "$DEPLOY_PORT" -o StrictHostKeyChecking=accept-new)
RSYNC=(rsync -avz --delete --exclude '.env' --exclude '.DS_Store' -e "ssh -p $DEPLOY_PORT -o StrictHostKeyChecking=accept-new")
TARGET="$DEPLOY_USER@$DEPLOY_HOST"

TARGETS=("$@")
if [[ ${#TARGETS[@]} -eq 0 ]]; then
  TARGETS=(website admin api)
fi

deploy_website() {
  echo ""
  echo "==> Building website..."
  (cd "$ROOT/frontend" && npm run build)

  echo "==> Uploading website → $REMOTE_WEBSITE"
  "${RSYNC[@]}" \
    --exclude 'uploads' \
    "$ROOT/frontend/dist/" \
    "$TARGET:$REMOTE_WEBSITE/"
  echo "✓ Website deployed → https://yulowear.in"
}

deploy_admin() {
  echo ""
  echo "==> Building admin..."
  (cd "$ROOT/admin" && npm run build)

  echo "==> Uploading admin → $REMOTE_ADMIN"
  "${RSYNC[@]}" \
    "$ROOT/admin/dist/" \
    "$TARGET:$REMOTE_ADMIN/"
  echo "✓ Admin deployed → https://admin.yulowear.in"
}

deploy_api() {
  echo ""
  echo "==> Uploading API → $REMOTE_API"
  # Never overwrite production .env or wipe uploaded media
  "${RSYNC[@]}" \
    --exclude '.env' \
    --exclude 'uploads/***' \
    --exclude 'vendor/***' \
    --exclude '.git' \
    --exclude 'database/*.sql' \
    "$ROOT/backend/" \
    "$TARGET:$REMOTE_API/"

  # Ensure vendor exists on server (upload if missing locally we have it)
  if [[ -d "$ROOT/backend/vendor" ]]; then
    rsync -avz -e "ssh -p $DEPLOY_PORT" \
      "$ROOT/backend/vendor/" \
      "$TARGET:$REMOTE_API/vendor/"
  fi

  echo "✓ API deployed → https://api.yulowear.in/api/health"
  echo "  (production .env on server was kept — not overwritten)"
}

for t in "${TARGETS[@]}"; do
  case "$t" in
    website|web|frontend) deploy_website ;;
    admin) deploy_admin ;;
    api|backend) deploy_api ;;
    *)
      echo "Unknown target: $t"
      echo "Use: website | admin | api"
      exit 1
      ;;
  esac
done

echo ""
echo "All done."
echo "Test:"
echo "  https://yulowear.in"
echo "  https://admin.yulowear.in"
echo "  https://api.yulowear.in/api/health"
