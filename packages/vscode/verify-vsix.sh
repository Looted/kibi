#!/bin/bash

set -euo pipefail

VSCODE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TEMP_DIR"
}

trap cleanup EXIT

VSIX_FILE="$(ls -1t "$VSCODE_DIR"/*.vsix 2>/dev/null | head -1 || true)"

if [ -z "$VSIX_FILE" ]; then
  echo "ERROR: No .vsix file found in $VSCODE_DIR" >&2
  exit 1
fi

unzip -q "$VSIX_FILE" -d "$TEMP_DIR"

PACKAGE_JSON="$TEMP_DIR/extension/package.json"
EXTENSION_JS="$TEMP_DIR/extension/dist/extension.js"

if [ ! -f "$PACKAGE_JSON" ]; then
  echo "ERROR: Missing extension/package.json in VSIX" >&2
  exit 1
fi

if [ ! -f "$EXTENSION_JS" ]; then
  echo "ERROR: Missing extension/dist/extension.js in VSIX" >&2
  exit 1
fi

MAIN_VALUE="$(node -e 'const fs=require("fs"); const p=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(p.main || "");' "$PACKAGE_JSON")"
if [ "$MAIN_VALUE" != "./dist/extension.js" ]; then
  echo "ERROR: extension/package.json main must be ./dist/extension.js (found: ${MAIN_VALUE:-<missing>})" >&2
  exit 1
fi

if ! grep -q '"kibi-knowledge-base"' "$PACKAGE_JSON"; then
  echo "ERROR: extension/package.json must contain kibi-knowledge-base view" >&2
  exit 1
fi

if ! grep -q '"kibi.refreshTree"' "$PACKAGE_JSON"; then
  echo "ERROR: extension/package.json must contain kibi.refreshTree command" >&2
  exit 1
fi

# Also verify the bundled extension.js contains the runtime registrations
if ! grep -q 'kibi-knowledge-base' "$EXTENSION_JS"; then
  echo "ERROR: extension/dist/extension.js must contain kibi-knowledge-base runtime registration" >&2
  exit 1
fi

if ! grep -q 'kibi.refreshTree' "$EXTENSION_JS"; then
  echo "ERROR: extension/dist/extension.js must contain kibi.refreshTree runtime registration" >&2
  exit 1
fi

echo "✅ VSIX verification passed: $VSIX_FILE"
