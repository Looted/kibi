import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import * as vscode from "vscode";

interface SymbolEntry {
  id: string;
  title: string;
  /** Absolute path of the source file where this symbol lives, if available. */
  sourceFile?: string;
  /** 1-based line number of the symbol declaration within sourceFile. */
  sourceLine?: number;
  /** Raw links from symbols.yaml (related entity IDs). */
  links: string[];
}

interface SymbolIndex {
  /** title (lowercased) → SymbolEntry[] */
  byTitle: Map<string, SymbolEntry[]>;
  /** absolute source file path → SymbolEntry[] */
  byFile: Map<string, SymbolEntry[]>;
  /** symbol id → SymbolEntry */
  byId: Map<string, SymbolEntry>;
}

function buildIndex(manifestPath: string, workspaceRoot: string): SymbolIndex {
  const byTitle = new Map<string, SymbolEntry[]>();
  const byFile = new Map<string, SymbolEntry[]>();
  const byId = new Map<string, SymbolEntry>();

  if (!fs.existsSync(manifestPath)) return { byTitle, byFile, byId };

  let raw: unknown;
  try {
    // Use dynamic require instead of js-yaml to avoid bundling complications.
    // We parse the YAML manually via a tiny inline parser for key-value symbols.yaml.
    // Actually, let the extension's bundler handle js-yaml — use require.
    // biome-ignore lint: dynamic require needed at runtime
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const jsYaml = require("js-yaml") as typeof import("js-yaml");
    raw = jsYaml.load(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return { byTitle, byFile, byId };
  }

  const file = raw as { symbols?: Array<Record<string, unknown>> };
  if (!Array.isArray(file?.symbols)) return { byTitle, byFile, byId };

  for (const sym of file.symbols) {
    const id = String(sym.id ?? "");
    const title = String(sym.title ?? "");
    if (!id || !title) continue;

    const rawSource = String(sym.sourceFile ?? sym.source ?? "");
    let sourceFile: string | undefined;
    if (rawSource && !rawSource.startsWith("http")) {
      sourceFile = path.isAbsolute(rawSource)
        ? rawSource
        : path.resolve(workspaceRoot, rawSource);
    }

    const sourceLine =
      typeof sym.sourceLine === "number" ? sym.sourceLine : undefined;

    const rawLinks = sym.links;
    const links: string[] = Array.isArray(rawLinks)
      ? rawLinks.map((l) => String(l))
      : [];

    const entry: SymbolEntry = { id, title, sourceFile, sourceLine, links };
    byId.set(id, entry);

    const titleKey = title.toLowerCase();
    if (!byTitle.has(titleKey)) byTitle.set(titleKey, []);
    byTitle.get(titleKey)!.push(entry);

    if (sourceFile) {
      if (!byFile.has(sourceFile)) byFile.set(sourceFile, []);
      byFile.get(sourceFile)!.push(entry);
    }
  }

  return { byTitle, byFile, byId };
}

/** Run `kibi query --relationships <id> --format json` and return the parsed result. */
function queryRelationshipsViaCli(
  symbolId: string,
  workspaceRoot: string,
): Array<{ type: string; from: string; to: string }> {
  try {
    const output = execSync(
      `bun run packages/cli/bin/kibi query --relationships ${symbolId} --format json`,
      {
        cwd: workspaceRoot,
        encoding: "utf8",
        timeout: 10000,
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    return JSON.parse(output) as Array<{ type: string; from: string; to: string }>;
  } catch {
    return [];
  }
}

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
  staticLinks: string[],
  workspaceRoot: string,
  getLocalPath: (id: string) => string | undefined,
  _symbolSourceFile?: string,
  _symbolSourceLine?: number,
): Promise<void> {
  // Combine static links from manifest with dynamic relationships from CLI
  const dynamicRels = queryRelationshipsViaCli(symbolId, workspaceRoot);
  const dynamicIds = dynamicRels
    .filter((r) => r.from === symbolId || r.to === symbolId)
    .map((r) => (r.from === symbolId ? r.to : r.from));

  const allIds = [...new Set([...staticLinks, ...dynamicIds])];

  if (allIds.length === 0) {
    vscode.window.showInformationMessage(
      `No linked entities found for symbol "${symbolId}".`,
    );
    return;
  }

  const items: vscode.QuickPickItem[] = allIds.map((id) => {
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
