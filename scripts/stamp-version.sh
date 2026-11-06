#!/bin/sh
# Stamp a cache-busting version onto every local JS/CSS reference.
#
# Usage: scripts/stamp-version.sh <version> [directory]   (directory defaults to .)
#
# Run at deploy time (see .github/workflows/deploy-pages.yml) so nobody has to
# hand-edit "?v=" values. Rewrites the given directory IN PLACE, so run it on a
# copy or on a CI checkout, never commit the result.
#   - js/*.js (top level): relative `from "./x.js"`, `import("./x.js")` and bare
#     `import "./x.js"` get "?v=<version>" (an existing "?..." is replaced).
#   - index.html: every "./js/*.js" and "./css/**/*.css" reference likewise.
# Every reference gets the same version, so the browser loads one instance of
# each module. url(...) font references and chrome-extension/ are not touched.
# Idempotent. Works with GNU and BSD (macOS) sed: no `sed -i`, temp file + cat.
set -eu

[ $# -ge 1 ] || { echo "usage: $0 <version> [directory]" >&2; exit 2; }
V=$1
DIR=${2:-.}
case $V in
  *[!A-Za-z0-9._-]*|'') echo "invalid version: $V" >&2; exit 2 ;;
esac
[ -f "$DIR/index.html" ] && [ -d "$DIR/js" ] || { echo "not a site dir: $DIR" >&2; exit 2; }

rewrite() { # file, sed script
  tmp="$1.stamp.$$"
  sed -E "$2" "$1" > "$tmp"
  cat "$tmp" > "$1" && rm -f "$tmp"   # keep original file mode
}

for f in "$DIR"/js/*.js; do
  rewrite "$f" "
    s#(from[[:space:]]*|import[[:space:]]*\(?[[:space:]]*)\"(\./[^\"?]*\.js)(\?[^\"]*)?\"#\1\"\2?v=$V\"#g
    s#(from[[:space:]]*|import[[:space:]]*\(?[[:space:]]*)'(\./[^'?]*\.js)(\?[^']*)?'#\1'\2?v=$V'#g
  "
done

rewrite "$DIR/index.html" "
  s#(\./(js|css)/[^\"'?]*\.(js|css))(\?[^\"']*)?([\"'])#\1?v=$V\5#g
"
