#!/bin/sh
# Run from the repo root to copy app assets into the extension.
# These copies are committed — re-run whenever the app's JS, CSS, or fonts change.
#
# Usage: sh chrome-extension/sync-assets.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EXT_DIR="$SCRIPT_DIR"

echo "Syncing assets from $REPO_ROOT into $EXT_DIR ..."

# Replace each copy so nothing nests inside it and files removed from the app don't linger.
for dir in js css fonts; do
  [ -d "$REPO_ROOT/$dir" ] || { echo "Missing $REPO_ROOT/$dir" >&2; exit 1; }
  rm -rf "${EXT_DIR:?}/$dir"
  cp -R "$REPO_ROOT/$dir" "$EXT_DIR/$dir"
done

echo "Done. Load chrome-extension/ as an unpacked extension in chrome://extensions"
