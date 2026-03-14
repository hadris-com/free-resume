#!/bin/sh
# Run from the repo root to copy app assets into the extension.
# These copies are gitignored — re-run whenever the app's JS, CSS, or fonts change.
#
# Usage: sh chrome-extension/sync-assets.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EXT_DIR="$SCRIPT_DIR"

echo "Syncing assets from $REPO_ROOT into $EXT_DIR ..."

cp -r "$REPO_ROOT/js"    "$EXT_DIR/js"
cp -r "$REPO_ROOT/css"   "$EXT_DIR/css"
cp -r "$REPO_ROOT/fonts" "$EXT_DIR/fonts"

echo "Done. Load chrome-extension/ as an unpacked extension in chrome://extensions"
