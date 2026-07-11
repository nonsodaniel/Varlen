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

# ── Safety check: ensure this is the backend, not mobile ─────────
PKG_NAME=$(node -e "console.log(require('./package.json').name)" 2>/dev/null || echo "unknown")
if [[ "$PKG_NAME" != "api" ]]; then
  echo "ERROR: package.json name is '$PKG_NAME', expected 'api'."
  echo "       You may be deploying from the wrong directory."
  exit 1
fi

# Verify backend source files exist
if [[ ! -f "$BACKEND_DIR/src/main.ts" ]]; then
  echo "ERROR: src/main.ts not found. This doesn't look like the backend."
  exit 1
fi

echo "✓ Verified: deploying backend (package: $PKG_NAME)"

# ── Build ─────────────────────────────────────────────────────────
echo "→ Building project..."
npm run build
echo "✓ Build complete"

# ── Deploy ────────────────────────────────────────────────────────
echo "→ Deploying to Railway..."
npx @railway/cli up --service sivena-api --detach
echo "✓ Deployment initiated from apps/backend"
