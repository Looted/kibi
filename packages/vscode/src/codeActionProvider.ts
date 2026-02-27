/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/*
 How to apply this header to source files (examples)

 1) Prepend header to a single file (POSIX shells):

    cat LICENSE_HEADER.txt "$FILE" > "$FILE".with-header && mv "$FILE".with-header "$FILE"

 2) Apply to multiple files (example: the project's main entry files):

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp packages/cli/src/*.ts packages/mcp/src/*.ts; do
      if [ -f "$f" ]; then
        cp "$f" "$f".bak
        (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
      fi
    done

 3) Avoid duplicating the header: run a quick guard to only add if missing

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp; do
      if [ -f "$f" ]; then
        if ! head -n 5 "$f" | grep -q "Copyright (C) 2026 Piotr Franczyk"; then
          cp "$f" "$f".bak
          (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
        fi
      fi
    done
*/
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
