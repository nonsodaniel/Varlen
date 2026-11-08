#!/usr/bin/env bash
# Android production deploy script.
# Run from apps/mobile: ./scripts/deploy-android.sh [internal|beta|production]
# Default track: production
set -euo pipefail

TRACK="${1:-production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$MOBILE_DIR"

echo "=== Pre-deploy checks ==="

# 1. TypeScript check
echo "▶ TypeScript..."
npx tsc --noEmit -p tsconfig.json
echo "✔ TypeScript clean"

# 2. Ensure no uncommitted changes (except app.json which EAS bumps)
DIRTY=$(git status --short | grep -v "app.json" | grep -v "android/app/build.gradle" || true)
if [[ -n "$DIRTY" ]]; then
  echo "✘ Uncommitted changes detected. Commit or stash before deploying."
  git status --short
  exit 1
fi
echo "✔ Working tree clean"

# 3. Build + auto-submit
echo "=== Building for Android ($TRACK) ==="
EAS_SKIP_AUTO_FINGERPRINT=1 CI=1 eas build \
  --platform android \
  --profile production \
  --auto-submit-with-profile "$TRACK" \
  --no-wait

echo "=== Build queued. Monitor at: ==="
echo "    https://expo.dev/accounts/sivena-mobile/projects/sivena/builds"

# 4. Commit the versionCode bump EAS applied
git add app.json android/app/build.gradle 2>/dev/null || true
if ! git diff --cached --quiet; then
  git commit -m "chore: bump android versionCode (EAS auto-increment)"
  git push origin main
  echo "✔ versionCode bump committed"
fi

echo "=== Done ==="
