#!/usr/bin/env bash
set -euo pipefail

# ── Pre-deploy guard ──────────────────────────────────────────────
# Ensures deployment always runs from apps/backend, regardless of
# where the script is invoked from.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Verify we resolved to the correct directory
if [[ ! -f "$BACKEND_DIR/nest-cli.json" ]]; then
  echo "ERROR: Could not locate apps/backend (expected nest-cli.json at $BACKEND_DIR)"
  exit 1
fi

cd "$BACKEND_DIR"
echo "✓ Working directory: $(pwd)"

# ── Build ─────────────────────────────────────────────────────────
echo "→ Building project..."
npm run build
echo "✓ Build complete"

# ── Deploy ────────────────────────────────────────────────────────
echo "→ Deploying to Railway..."
railway up --service sivena-api --detach
echo "✓ Deployment initiated from apps/backend"
