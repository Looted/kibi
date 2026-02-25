# Pack: kibi-01-logic (Part 5)


This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where security check has been disabled.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Security check has been disabled - content may contain sensitive information
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
packages/
  vscode/
    media/
      kibi-activitybar.svg
    src/
      codeActionProvider.ts
    package-vsix.sh
    package.json
```

# Files

## File: packages/vscode/media/kibi-activitybar.svg
```xml
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <path d="M5 5h2v14H5zM9 5h2v6l5-6h2.7l-5.5 6.4L19 19h-2.6l-4.5-6.1L11 14v5H9z" fill="currentColor"/>
</svg>
```

## File: packages/vscode/src/codeActionProvider.ts
```typescript
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { type SymbolEntry, type SymbolIndex, buildIndex } from "./symbolIndex";

// queryRelationshipsViaCli is provided by ./symbolIndex

export class KibiCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly ACTION_KIND = vscode.CodeActionKind.Empty;

  private index: SymbolIndex | null = null;
  private manifestPath: string;
  private watcher: vscode.FileSystemWatcher | null = null;

  constructor(private workspaceRoot: string) {
    this.manifestPath = this.resolveManifestPath();
    this.buildIndexFromManifest();
  }

  private resolveManifestPath(): string {
    // Prefer path in .kb/config.json if present
    const configPath = path.join(this.workspaceRoot, ".kb", "config.json");
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
          symbolsManifest?: string;
        };
        if (config.symbolsManifest) {
          return path.isAbsolute(config.symbolsManifest)
            ? config.symbolsManifest
            : path.resolve(this.workspaceRoot, config.symbolsManifest);
        }
      } catch {
        // ignore
      }
    }
    // Default convention: symbols.yaml at workspace root
    const candidates = [
      path.join(this.workspaceRoot, "symbols.yaml"),
      path.join(this.workspaceRoot, "symbols.yml"),
    ];
    return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
  }

  private buildIndexFromManifest(): void {
    this.index = buildIndex(this.manifestPath, this.workspaceRoot);
  }

  /** Call this to attach a filesystem watcher and auto-rebuild the index. */
  watchManifest(context: vscode.ExtensionContext): void {
    this.watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        vscode.Uri.file(this.workspaceRoot),
        "{symbols.yaml,symbols.yml}",
      ),
    );
    const rebuild = () => {
      this.manifestPath = this.resolveManifestPath();
      this.buildIndexFromManifest();
    };
    this.watcher.onDidChange(rebuild);
    this.watcher.onDidCreate(rebuild);
    this.watcher.onDidDelete(() => {
      this.index = null;
    });
    context.subscriptions.push(this.watcher);
  }

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
  ): vscode.CodeAction[] {
    if (!this.index) return [];

    const actions: vscode.CodeAction[] = [];
    const filePath = document.uri.fsPath;

    // 1) Symbols whose source file matches the current document
    const fileSymbols = this.index.byFile.get(filePath) ?? [];

    // 2) Symbol whose title appears at the cursor position
    const wordRange = document.getWordRangeAtPosition(range.start);
    const word = wordRange ? document.getText(wordRange).toLowerCase() : "";
    const titleSymbols = word ? (this.index.byTitle.get(word) ?? []) : [];

    // Deduplicate by ID
    const seen = new Set<string>();
    const candidates: SymbolEntry[] = [];
    for (const sym of [...fileSymbols, ...titleSymbols]) {
      if (!seen.has(sym.id)) {
        seen.add(sym.id);
        candidates.push(sym);
      }
    }

    if (candidates.length === 0) return [];

    // One action per matched symbol
    for (const sym of candidates) {
      const action = new vscode.CodeAction(
        `Kibi: Browse linked entities for "${sym.title}"`,
        KibiCodeActionProvider.ACTION_KIND,
      );
      action.command = {
        command: "kibi.browseLinkedEntities",
        title: "Browse linked entities",
        arguments: [sym.id, sym.links, sym.sourceFile, sym.sourceLine],
      };
      actions.push(action);
    }

    return actions;
  }
}

/**
 * Show a Quick Pick of entities linked to a symbol.
 * Called by `kibi.browseLinkedEntities` command.
 */
export async function browseLinkedEntities(
  symbolId: string,
  relationships: Array<{ type: string; from: string; to: string }>,
  _workspaceRoot: string,
  getLocalPath: (id: string) => string | undefined,
  _symbolSourceFile?: string,
  _symbolSourceLine?: number,
): Promise<void> {
  const allIds = relationships
    .filter((r) => r.from === symbolId || r.to === symbolId)
    .map((r) => (r.from === symbolId ? r.to : r.from));
  const uniqueIds = [...new Set(allIds)];

  if (uniqueIds.length === 0) {
    vscode.window.showInformationMessage(
      `No linked entities found for symbol "${symbolId}".`,
    );
    return;
  }

  const items: vscode.QuickPickItem[] = uniqueIds.map((id) => {
    const localPath = getLocalPath(id);
    return {
      label: id,
      description: localPath ? path.basename(localPath) : "(no local file)",
      detail: localPath ?? undefined,
    };
  });

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: `Entities linked to "${symbolId}" — select to open`,
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!selected) return;

  const localPath = getLocalPath(selected.label) ?? selected.detail;
  if (localPath) {
    await openFileAtLine(localPath);
  } else {
    vscode.window.showInformationMessage(
      `Entity "${selected.label}" has no local source file.`,
    );
  }
}

/**
 * Open a file in the editor, optionally scrolling to a 1-based line number.
 */
export async function openFileAtLine(
  filePath: string,
  line?: number,
): Promise<void> {
  const uri = vscode.Uri.file(filePath);
  const doc = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(doc);
  if (line !== undefined && line > 0) {
    const zeroLine = Math.min(line - 1, doc.lineCount - 1);
    const pos = new vscode.Position(zeroLine, 0);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(
      new vscode.Range(pos, pos),
      vscode.TextEditorRevealType.InCenter,
    );
  }
}
```

## File: packages/vscode/package-vsix.sh
```bash
#!/bin/bash
# Helper script to package the VS Code extension
# Works around vsce issues with monorepo structures by temporarily moving the extension directory

set -e

VSCODE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$VSCODE_DIR/../.." && pwd)"
TEMP_DIR=$(mktemp -d)
EXTENSION_NAME=$(grep '"name"' "$VSCODE_DIR/package.json" | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
VERSION=$(grep '"version"' "$VSCODE_DIR/package.json" | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
OUTPUT_FILE="$EXTENSION_NAME-$VERSION.vsix"
VSCE_BIN=$(echo "$REPO_ROOT"/node_modules/.bun/@vscode+vsce@*/node_modules/@vscode/vsce/vsce)

echo "📦 Packaging $EXTENSION_NAME v$VERSION..."
echo "🔷 Temp directory: $TEMP_DIR"

# Ensure dist/extension.js is fresh before packaging.
# Build in the original monorepo path so workspace-relative tool paths resolve.
if [ "${1:-}" = "--clean" ]; then
  bun run --cwd "$VSCODE_DIR" clean 2>/dev/null || true
fi
bun run --cwd "$VSCODE_DIR" build

# Copy the extension to the temp directory
cp -r "$VSCODE_DIR" "$TEMP_DIR/vscode-pkg"
cd "$TEMP_DIR/vscode-pkg"

# Remove unnecessary files
rm -f tsconfig.json.bak vsce-output.txt *.vsix

# Package the extension
echo "⚙️  Running vsce package..."
printf "y
" | "$VSCE_BIN" package --skip-license --allow-missing-repository --no-dependencies 2>&1 | tail -5

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
```

## File: packages/vscode/package.json
```json
{
  "name": "kibi-vscode",
  "displayName": "Kibi Knowledge Base",
  "description": "VS Code extension for Kibi knowledge base with TreeView and MCP integration",
  "version": "0.1.6",
  "publisher": "kibi",
  "engines": {
    "vscode": "^1.74.0"
  },
  "categories": ["Other"],
  "keywords": ["knowledge base", "requirements", "adr", "scenarios", "mcp"],
  "activationEvents": [
    "onStartupFinished",
    "onView:kibi-knowledge-base",
    "onCommand:kibi.focusKnowledgeBase"
  ],
  "main": "./dist/extension.js",
  "icon": "icon.png",
  "contributes": {
    "configuration": {
      "title": "Kibi Knowledge Base",
      "properties": {
        "kibi.contextOnOpen": {
          "type": "boolean",
          "default": true,
          "description": "Show KB entities linked to file when opening it"
        },
        "kibi.mcp.serverPath": {
          "type": "string",
          "default": "",
          "description": "Absolute path to the kibi-mcp executable (e.g., /path/to/kibi/packages/mcp/bin/kibi-mcp). If left empty, the extension will attempt to find 'kibi-mcp' in your system PATH."
        }
      }
    },
    "viewsContainers": {
      "activitybar": [
        {
          "id": "kibi-sidebar",
          "title": "Kibi",
          "icon": "media/kibi-activitybar.svg"
        }
      ]
    },
    "views": {
      "kibi-sidebar": [
        {
          "id": "kibi-knowledge-base",
          "name": "Kibi Knowledge Base",
          "contextualTitle": "Kibi"
        }
      ]
    },
    "commands": [
      {
        "command": "kibi.refreshTree",
        "title": "Refresh",
        "icon": "$(refresh)"
      },
      {
        "command": "kibi.openEntity",
        "title": "Kibi: Open Entity File"
      },
      {
        "command": "kibi.openEntityById",
        "title": "Kibi: Open Entity File by ID"
      },
      {
        "command": "kibi.browseLinkedEntities",
        "title": "Kibi: Browse Linked Entities"
      },
      {
        "command": "kibi.focusKnowledgeBase",
        "title": "Kibi: Focus Knowledge Base"
      }
    ],
    "menus": {
      "view/title": [
        {
          "command": "kibi.refreshTree",
          "when": "view == kibi-knowledge-base",
          "group": "navigation"
        }
      ],
      "commandPalette": [
        {
          "command": "kibi.focusKnowledgeBase"
        },
        {
          "command": "kibi.refreshTree"
        }
      ]
    },
    "mcp": {
      "servers": {
        "kibi": {
          "command": "bun",
          "args": ["${config:kibi.mcp.serverPath}"],
          "env": {}
        }
      }
    }
  },
  "scripts": {
    "build": "../../node_modules/.bun/esbuild@*/node_modules/esbuild/bin/esbuild src/extension.ts --bundle --outfile=dist/extension.js --external:vscode --format=cjs --platform=node --minify",
    "watch": "../../node_modules/.bun/esbuild@*/node_modules/esbuild/bin/esbuild src/extension.ts --bundle --outfile=dist/extension.js --external:vscode --format=cjs --platform=node --minify --watch",
    "package": "./package-vsix.sh",
    "test": "bun test tests/*.test.ts",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "@types/vscode": "^1.74.0",
    "@types/node": "^20.0.0",
    "@types/bun": "latest",
    "@vscode/vsce": "^3.0.0",
    "esbuild": "^0.23.0",
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "js-yaml": "^4.1.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/kibi-org/kibi.git"
  },
  "license": "MIT"
}
```


---

#### 🔙 PREVIOUS PART: [kibi-01-logic-4.md](file:kibi-01-logic-4.md)

#### ⏭️ NEXT PART: [kibi-01-logic-6.md](file:kibi-01-logic-6.md)

> _End of Part 6_
