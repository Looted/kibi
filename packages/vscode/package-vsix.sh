#!/bin/bash
# Helper script to package the VS Code extension
# Works around vsce issues with monorepo structures by temporarily moving the extension directory

set -e

VSCODE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR=$(mktemp -d)
EXTENSION_NAME=$(grep '"name"' "$VSCODE_DIR/package.json" | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
VERSION=$(grep '"version"' "$VSCODE_DIR/package.json" | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
OUTPUT_FILE="$EXTENSION_NAME-$VERSION.vsix"

echo "📦 Packaging $EXTENSION_NAME v$VERSION..."
echo "🔷 Temp directory: $TEMP_DIR"

# Copy the extension to the temp directory
cp -r "$VSCODE_DIR" "$TEMP_DIR/vscode-pkg"
cd "$TEMP_DIR/vscode-pkg"

# Remove unnecessary files
rm -f tsconfig.json.bak vsce-output.txt *.vsix

# Clean up build artifacts if requested
if [ "$1" == "--clean" ]; then
  npm run clean 2>/dev/null || true
fi

# Package the extension
echo "⚙️  Running vsce package..."
printf "y\n" | vsce package --skip-license --allow-missing-repository 2>&1 | tail -5

# Copy the VSIX back to the original directory
VSIX_FILE=$(ls -1 *.vsix)
cp "$VSIX_FILE" "$VSCODE_DIR/"

# Cleanup
cd /
rm -rf "$TEMP_DIR"

echo "✅ Successfully packaged: $VSCODE_DIR/$OUTPUT_FILE"
echo ""
echo "To install the extension:"
echo "  code --install-extension $VSCODE_DIR/$OUTPUT_FILE"
