#!/usr/bin/env bash
# OTA (JS-only) update — no native build required.
# Run from apps/mobile: ./scripts/deploy-ota.sh "message"
set -euo pipefail

MESSAGE="${1:-OTA update}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$MOBILE_DIR"

echo "=== Pre-deploy checks ==="

# 1. TypeScript check
echo "▶ TypeScript..."
npx tsc --noEmit -p tsconfig.json
echo "✔ TypeScript clean"

# 2. Push latest code
git push origin main

# 3. OTA publish
echo "=== Publishing OTA to production branch ==="
EAS_SKIP_AUTO_FINGERPRINT=1 eas update \
  --branch production \
  --message "$MESSAGE"

echo "=== OTA published ==="
