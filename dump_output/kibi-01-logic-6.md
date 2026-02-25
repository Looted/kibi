# Pack: kibi-01-logic (Part 6)


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
    src/
      codeLensProvider.ts
      extension.ts
      helpers.ts
      hoverProvider.ts
      relationshipCache.ts
      symbolIndex.ts
      treeProvider.ts
```

# Files

## File: packages/vscode/src/codeLensProvider.ts
```typescript
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { categorizeEntities, formatLensTitle } from "./helpers";
import type { RelationshipCache } from "./relationshipCache";
import {
  type SymbolEntry,
  type SymbolIndex,
  buildIndex,
  queryRelationshipsViaCli,
} from "./symbolIndex";

interface CodeLensMetadata {
  symbolId: string;
  staticLinks: string[];
  sourceFile?: string;
  sourceLine?: number;
}

const codeLensMetadata = new WeakMap<vscode.CodeLens, CodeLensMetadata>();

export class KibiCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses: vscode.Event<void> =
    this._onDidChangeCodeLenses.event;

  private index: SymbolIndex | null = null;
  private manifestPath: string;
  private byFileAliases = new Map<string, SymbolEntry[]>();
  private byRelativePath = new Map<string, SymbolEntry[]>();

  constructor(
    private workspaceRoot: string,
    private sharedCache: RelationshipCache,
  ) {
    this.manifestPath = this.resolveManifestPath();
    this.index = buildIndex(this.manifestPath, this.workspaceRoot);
    this.rebuildFileAliases();
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

  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.CodeLens[] | null {
    if (!this.index || token.isCancellationRequested) return null;

    const entries = this.getEntriesForDocumentPath(document.uri.fsPath);
    if (!entries || entries.length === 0) return null;

    const lenses: vscode.CodeLens[] = [];
    for (const entry of entries) {
      const line = entry.sourceLine ? Math.max(0, entry.sourceLine - 1) : 0;
      const range = new vscode.Range(line, 0, line, 0);
      const lens = new vscode.CodeLens(range);

      // Store metadata in WeakMap
      codeLensMetadata.set(lens, {
        symbolId: entry.id,
        staticLinks: entry.links,
        sourceFile: entry.sourceFile,
        sourceLine: entry.sourceLine,
      });

      lenses.push(lens);
    }
    return lenses;
  }

  async resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken,
  ): Promise<vscode.CodeLens | null> {
    if (token.isCancellationRequested) return null;

    const metadata = codeLensMetadata.get(codeLens);
    if (!metadata) return null;

    const { symbolId, staticLinks, sourceFile, sourceLine } = metadata;

    // Check cache (30s TTL)
    const cacheKey = `codelens:rel:${symbolId}`;
    const cached = this.sharedCache.get(cacheKey);
    const now = Date.now();
    let relationships: Array<{ type: string; from: string; to: string }>;

    if (cached && now - cached.timestamp < this.sharedCache.getTTL()) {
      relationships = this.mergeStaticLinks(
        symbolId,
        staticLinks,
        cached.data as Array<{ type: string; from: string; to: string }>,
      );
    } else {
      // In-flight de-duplication
      const idsPromise =
        this.sharedCache.getInflight(cacheKey) ??
        this.fetchRelationships(symbolId, staticLinks);
      if (!this.sharedCache.getInflight(cacheKey)) {
        this.sharedCache.setInflight(cacheKey, idsPromise);
        idsPromise.finally(() => this.sharedCache.deleteInflight(cacheKey));
      }
      relationships = await idsPromise;

      if (token.isCancellationRequested) return null;

      this.sharedCache.set(cacheKey, {
        data: relationships,
        timestamp: Date.now(),
      });
    }

    const guards = relationships
      .filter((r) => r.type === "guards")
      .map((r) => ({
        flagId: r.from,
        flagName: r.from.replace(/^FLAG-/, ""),
      }));

    const nonGuardRels = relationships.filter((r) => r.type !== "guards");
    const linkedEntityCategories = categorizeEntities(nonGuardRels);
    linkedEntityCategories.symbols = [];

    const title = formatLensTitle(linkedEntityCategories, guards);

    codeLens.command = {
      command: "kibi.browseLinkedEntities",
      title,
      arguments: [symbolId, relationships, sourceFile, sourceLine],
    };

    return codeLens;
  }

  private async fetchRelationships(
    symbolId: string,
    staticLinksFromMetadata: string[],
  ): Promise<Array<{ type: string; from: string; to: string }>> {
    const rels = queryRelationshipsViaCli(symbolId, this.workspaceRoot);

    return this.mergeStaticLinks(symbolId, staticLinksFromMetadata, rels);
  }

  private mergeStaticLinks(
    symbolId: string,
    staticLinks: string[],
    relationships: Array<{ type: string; from: string; to: string }>,
  ): Array<{ type: string; from: string; to: string }> {
    const staticRels = staticLinks.map((linkId) => ({
      type: "relates_to",
      from: symbolId,
      to: linkId,
    }));

    // Keep static links first for backward compatibility and dedupe exact tuples.
    const merged = [...staticRels, ...relationships];
    const seen = new Set<string>();
    const deduped: Array<{ type: string; from: string; to: string }> = [];
    for (const rel of merged) {
      const key = `${rel.type}|${rel.from}|${rel.to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(rel);
    }
    return deduped;
  }

  watchSources(context: vscode.ExtensionContext): void {
    // Watch manifest files
    const manifestWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        vscode.Uri.file(this.workspaceRoot),
        "{symbols.yaml,symbols.yml}",
      ),
    );

    const onManifestChange = this.debounce(() => this.refresh(), 500);
    manifestWatcher.onDidChange(onManifestChange);
    manifestWatcher.onDidCreate(onManifestChange);
    manifestWatcher.onDidDelete(onManifestChange);

    // Watch KB RDF files
    const kbWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        vscode.Uri.file(this.workspaceRoot),
        ".kb/branches/**/kb.rdf",
      ),
    );

    const onKbChange = this.debounce(() => {
      this.clearRelationshipCache();
      this._onDidChangeCodeLenses.fire();
    }, 500);

    kbWatcher.onDidChange(onKbChange);
    kbWatcher.onDidCreate(onKbChange);
    kbWatcher.onDidDelete(onKbChange);

    context.subscriptions.push(manifestWatcher, kbWatcher);
  }

  private debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number,
  ): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  refresh(): void {
    this.manifestPath = this.resolveManifestPath();
    this.index = buildIndex(this.manifestPath, this.workspaceRoot);
    this.rebuildFileAliases();
    this.clearRelationshipCache();
    this._onDidChangeCodeLenses.fire();
  }

  private getEntriesForDocumentPath(filePath: string) {
    const candidates = this.filePathCandidates(filePath);
    for (const key of candidates) {
      const entries = this.byFileAliases.get(key);
      if (entries && entries.length > 0) {
        return entries;
      }
    }

    const relative = this.relativeKey(filePath);
    if (relative) {
      const entries = this.byRelativePath.get(relative);
      if (entries && entries.length > 0) {
        return entries;
      }
    }

    return null;
  }

  private rebuildFileAliases(): void {
    this.byFileAliases.clear();
    this.byRelativePath.clear();
    if (!this.index) return;

    for (const [filePath, entries] of this.index.byFile.entries()) {
      for (const candidate of this.filePathCandidates(filePath)) {
        if (!this.byFileAliases.has(candidate)) {
          this.byFileAliases.set(candidate, entries);
        }
      }

      const relative = this.relativeKey(filePath);
      if (relative && !this.byRelativePath.has(relative)) {
        this.byRelativePath.set(relative, entries);
      }
    }
  }

  private filePathCandidates(inputPath: string): string[] {
    const candidates = new Set<string>();
    const resolved = path.resolve(inputPath);

    candidates.add(inputPath);
    candidates.add(path.normalize(inputPath));
    candidates.add(resolved);
    candidates.add(path.normalize(resolved));

    try {
      const real = fs.realpathSync.native(resolved);
      candidates.add(real);
      candidates.add(path.normalize(real));
    } catch {
      // Ignore if path doesn't exist yet or cannot be resolved.
    }

    return Array.from(candidates);
  }

  private relativeKey(inputPath: string): string | null {
    const absolute = path.resolve(inputPath);
    const relative = path.relative(this.workspaceRoot, absolute);
    if (!relative || relative.startsWith("..")) return null;
    return path.normalize(relative);
  }

  private clearRelationshipCache(): void {
    this.sharedCache.clear();
  }
}
```

## File: packages/vscode/src/extension.ts
```typescript
import * as child_process from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  KibiCodeActionProvider,
  browseLinkedEntities,
  openFileAtLine,
} from "./codeActionProvider";
import { KibiCodeLensProvider } from "./codeLensProvider";
import { KibiHoverProvider } from "./hoverProvider";
import { RelationshipCache } from "./relationshipCache";
import { type SymbolIndex, buildIndex } from "./symbolIndex";
import { KibiTreeDataProvider } from "./treeProvider";

const KIBI_VIEW_ID = "kibi-knowledge-base";

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("Kibi");
  output.appendLine("Activating Kibi extension...");
  context.subscriptions.push(output);

  let workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    const envWorkspaceRoot = process.env.KIBI_WORKSPACE_ROOT;
    if (envWorkspaceRoot) {
      const resolved = path.resolve(envWorkspaceRoot);
      const kbConfigPath = path.join(resolved, ".kb", "config.json");
      if (fs.existsSync(kbConfigPath)) {
        workspaceRoot = resolved;
        output.appendLine(
          `No workspace folder attached; using KIBI_WORKSPACE_ROOT fallback: ${workspaceRoot}`,
        );
      } else {
        output.appendLine(
          `KIBI_WORKSPACE_ROOT is set but missing .kb/config.json: ${resolved}`,
        );
      }
    }
  }
  if (!workspaceRoot) {
    output.appendLine("No workspace folder found; activation skipped.");
    return;
  }

  const workspacePatternBase =
    vscode.workspace.workspaceFolders?.find(
      (folder) => folder.uri.fsPath === workspaceRoot,
    ) ?? vscode.Uri.file(workspaceRoot);

  output.appendLine(`Workspace root: ${workspaceRoot}`);

  // ── MCP Server Path Validation ─────────────────────────────────────────────
  validateMcpServerPath(output);

  // ── Tree view ──────────────────────────────────────────────────────────────
  const treeDataProvider = new KibiTreeDataProvider(workspaceRoot);

  const treeView = vscode.window.createTreeView(KIBI_VIEW_ID, {
    treeDataProvider: treeDataProvider,
    showCollapseAll: true,
  });
  output.appendLine(`Tree view registered: ${KIBI_VIEW_ID}`);

  const relationshipCache = new RelationshipCache();

  const refreshCommand = vscode.commands.registerCommand(
    "kibi.refreshTree",
    () => {
      treeDataProvider.refresh();
    },
  );

  // Watch .kb/branches/**/kb.rdf for changes and auto-refresh
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(workspacePatternBase, ".kb/branches/**/kb.rdf"),
  );
  watcher.onDidChange(() => treeDataProvider.refresh());
  watcher.onDidCreate(() => treeDataProvider.refresh());
  watcher.onDidDelete(() => treeDataProvider.refresh());

  // ── Navigation commands ────────────────────────────────────────────────────

  /** Open an entity's source file by its local filesystem path, optionally at a 1-based line. */
  const openEntityCommand = vscode.commands.registerCommand(
    "kibi.openEntity",
    async (localPath: string, line?: number) => {
      try {
        await openFileAtLine(localPath, line);
      } catch {
        vscode.window.showErrorMessage(
          `Kibi: Could not open file — ${localPath}`,
        );
      }
    },
  );

  /** Open an entity's source file by its KB ID (looks up the local path from the tree). */
  const openEntityByIdCommand = vscode.commands.registerCommand(
    "kibi.openEntityById",
    async (entityId: string) => {
      const localPath = treeDataProvider.getLocalPathForEntity(entityId);
      if (localPath) {
        try {
          const uri = vscode.Uri.file(localPath);
          await vscode.window.showTextDocument(uri);
        } catch {
          vscode.window.showErrorMessage(
            `Kibi: Could not open file for entity "${entityId}"`,
          );
        }
      } else {
        vscode.window.showInformationMessage(
          `Kibi: Entity "${entityId}" has no local source file.`,
        );
      }
    },
  );

  const focusKnowledgeBaseCommand = vscode.commands.registerCommand(
    "kibi.focusKnowledgeBase",
    async () => {
      await vscode.commands.executeCommand(
        "workbench.view.extension.kibi-sidebar",
      );
      await vscode.commands.executeCommand(`${KIBI_VIEW_ID}.focus`);
    },
  );

  // ── Code action provider ───────────────────────────────────────────────────
  let browseLinkedEntitiesCommand: vscode.Disposable | undefined;
  let codeActionRegistration: vscode.Disposable | undefined;

  try {
    const codeActionProvider = new KibiCodeActionProvider(workspaceRoot);
    codeActionProvider.watchManifest(context);

    browseLinkedEntitiesCommand = vscode.commands.registerCommand(
      "kibi.browseLinkedEntities",
      async (
        symbolId: string,
        relationships: Array<{ type: string; from: string; to: string }>,
        sourceFile?: string,
        sourceLine?: number,
      ) => {
        await browseLinkedEntities(
          symbolId,
          relationships ?? [],
          workspaceRoot,
          (id) => treeDataProvider.getLocalPathForEntity(id),
          sourceFile,
          sourceLine,
        );
      },
    );

    codeActionRegistration = vscode.languages.registerCodeActionsProvider(
      [{ language: "typescript" }, { language: "javascript" }],
      codeActionProvider,
      {
        providedCodeActionKinds: [KibiCodeActionProvider.ACTION_KIND],
      },
    );

    output.appendLine("Traceability code actions initialized.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`Traceability initialization failed: ${message}`);
    vscode.window.showWarningMessage(
      "Kibi traceability actions failed to initialize. Knowledge Base view remains available.",
    );
  }

  // ── CodeLens provider ──────────────────────────────────────────────────────
  let codeLensRegistration: vscode.Disposable | undefined;

  try {
    const codeLensProvider = new KibiCodeLensProvider(
      workspaceRoot,
      relationshipCache,
    );
    codeLensProvider.watchSources(context);

    codeLensRegistration = vscode.languages.registerCodeLensProvider(
      [{ language: "typescript" }, { language: "javascript" }],
      codeLensProvider,
    );
    codeLensProvider.refresh();

    output.appendLine("CodeLens indicators initialized.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`CodeLens initialization failed: ${message}`);
    vscode.window.showWarningMessage(
      "Kibi CodeLens indicators failed to initialize. Knowledge Base view remains available.",
    );
  }

  // ── Symbol index ─────────────────────────────────────────────────────────────
  // Resolve manifest path using same logic as CodeLens provider
  const resolveManifestPath = (): string => {
    const configPath = vscode.Uri.joinPath(
      vscode.Uri.file(workspaceRoot),
      ".kb",
      "config.json",
    ).fsPath;
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
          symbolsManifest?: string;
        };
        if (config.symbolsManifest) {
          return path.isAbsolute(config.symbolsManifest)
            ? config.symbolsManifest
            : path.resolve(workspaceRoot, config.symbolsManifest);
        }
      }
    } catch {
      // ignore
    }
    // Default convention: symbols.yaml at workspace root
    const candidates = [
      path.join(workspaceRoot, "symbols.yaml"),
      path.join(workspaceRoot, "symbols.yml"),
    ];
    return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
  };

  const manifestPath = resolveManifestPath();
  const symbolIndex: SymbolIndex | null = buildIndex(
    manifestPath,
    workspaceRoot,
  );

  // ── Hover provider ─────────────────────────────────────────────────────────
  let hoverRegistration: vscode.Disposable | undefined;

  try {
    const hoverProvider = new KibiHoverProvider(
      workspaceRoot,
      symbolIndex,
      relationshipCache,
    );

    hoverRegistration = vscode.languages.registerHoverProvider(
      [{ language: "typescript" }, { language: "javascript" }],
      hoverProvider,
    );

    output.appendLine("Hover provider initialized.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    output.appendLine(`Hover provider initialization failed: ${message}`);
    vscode.window.showWarningMessage(
      "Kibi hover provider failed to initialize. Knowledge Base view remains available.",
    );
  }

  // ── Context on file open ───────────────────────────────────────────────────
  const config = vscode.workspace.getConfiguration("kibi");
  const contextOnOpen = config.get<boolean>("contextOnOpen", true);

  if (contextOnOpen) {
    const docOpenListener = vscode.workspace.onDidOpenTextDocument(
      async (document) => {
        if (!workspaceRoot || document.uri.scheme !== "file") {
          return;
        }

        const kbConfigPath = path.join(workspaceRoot, ".kb");
        const kbExists = fs.existsSync(kbConfigPath);

        if (!kbExists) {
          return;
        }

        const relativePath = path.relative(workspaceRoot, document.uri.fsPath);

        try {
          interface McpResult {
            structuredContent?: {
              entities?: unknown[];
            };
          }
          const mcpResult = await vscode.commands.executeCommand<McpResult>(
            "kibi-mcp.kbcontext",
            { sourceFile: relativePath },
          );

          if (
            mcpResult?.structuredContent?.entities &&
            Array.isArray(mcpResult.structuredContent.entities) &&
            mcpResult.structuredContent.entities.length > 0
          ) {
            const count = mcpResult.structuredContent.entities.length;
            vscode.window.showInformationMessage(
              `Kibi: ${count} KB entities linked to this file. Open Kibi panel to explore.`,
            );
          }
        } catch (error) {
          output.appendLine(
            `Context query failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    );

    context.subscriptions.push(docOpenListener);
  }

  context.subscriptions.push(
    refreshCommand,
    treeView,
    watcher,
    openEntityCommand,
    openEntityByIdCommand,
    focusKnowledgeBaseCommand,
    ...(browseLinkedEntitiesCommand ? [browseLinkedEntitiesCommand] : []),
    ...(codeActionRegistration ? [codeActionRegistration] : []),
    ...(codeLensRegistration ? [codeLensRegistration] : []),
    ...(hoverRegistration ? [hoverRegistration] : []),
  );

  output.appendLine("Kibi extension activation complete.");
}

function validateMcpServerPath(output: vscode.OutputChannel): void {
  const config = vscode.workspace.getConfiguration("kibi");
  let serverPath = config.get<string>("mcp.serverPath", "");

  if (!serverPath || serverPath.trim() === "") {
    const detectedPath = findKibiMcpInPath();
    if (detectedPath) {
      output.appendLine(`Auto-detected kibi-mcp at: ${detectedPath}`);
      serverPath = detectedPath;
    } else {
      output.appendLine(
        "Kibi MCP server path is not configured and kibi-mcp was not found in PATH.",
      );
      vscode.window
        .showWarningMessage(
          "Kibi MCP server path is not configured and kibi-mcp was not found in PATH.",
          "Open Settings",
        )
        .then((selection) => {
          if (selection === "Open Settings") {
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "kibi.mcp.serverPath",
            );
          }
        });
      return;
    }
  }

  if (!fs.existsSync(serverPath)) {
    output.appendLine(
      `Kibi MCP server not found at configured path: ${serverPath}`,
    );
    vscode.window
      .showErrorMessage(
        "Kibi MCP server not found at configured path. Please check your settings.",
        "Open Settings",
      )
      .then((selection) => {
        if (selection === "Open Settings") {
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "kibi.mcp.serverPath",
          );
        }
      });
    return;
  }

  output.appendLine(`Kibi MCP server path validated: ${serverPath}`);
}

function findKibiMcpInPath(): string | undefined {
  try {
    const isWindows = process.platform === "win32";
    const command = isWindows ? "where kibi-mcp" : "which kibi-mcp";

    const result = child_process.execSync(command, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });

    const paths = result.trim().split(/\r?\n/);
    for (const p of paths) {
      const trimmed = p.trim();
      if (trimmed && fs.existsSync(trimmed)) {
        return trimmed;
      }
    }
  } catch {
    // Command failed or kibi-mcp not found in PATH
  }

  const commonPaths = [
    "/usr/local/bin/kibi-mcp",
    "/usr/bin/kibi-mcp",
    path.join(process.env.HOME || "", ".local/bin/kibi-mcp"),
    path.join(process.env.HOME || "", ".bun/bin/kibi-mcp"),
  ];

  for (const p of commonPaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return undefined;
}

export function deactivate() {}
```

## File: packages/vscode/src/helpers.ts
```typescript
/**
 * Pure helper functions for VS Code extension - no VS Code imports
 */

export function categorizeEntities(
  relationships: Array<{ type: string; from: string; to: string }>,
): Record<string, string[]> {
  const categories: Record<string, string[]> = {
    reqs: [],
    scenarios: [],
    tests: [],
    adrs: [],
    flags: [],
    events: [],
    symbols: [],
    other: [],
  };

  const prefixMap: Record<string, keyof typeof categories> = {
    "REQ-": "reqs",
    "SCEN-": "scenarios",
    "TEST-": "tests",
    "ADR-": "adrs",
    "FLAG-": "flags",
    "EVENT-": "events",
    "SYM-": "symbols",
  };

  for (const rel of relationships) {
    for (const id of [rel.from, rel.to]) {
      let categorized = false;

      for (const [prefix, category] of Object.entries(prefixMap)) {
        if (id.startsWith(prefix)) {
          const list = categories[category];
          if (list && !list.includes(id)) {
            list.push(id);
          }
          categorized = true;
          break;
        }
      }

      if (!categorized) {
        const list = categories.other;
        if (!list.includes(id)) {
          list.push(id);
        }
      }
    }
  }

  return categories;
}

export function formatLensTitle(
  categories: Record<string, string[]>,
  guardedBy: Array<{ flagId: string; flagName: string }>,
): string {
  const parts: string[] = [];

  const emojiMap: Record<string, string> = {
    reqs: "📋",
    scenarios: "🎭",
    tests: "✓",
    adrs: "📐",
    flags: "🚩",
    events: "⚡",
    symbols: "🔗",
  };

  const singularMap: Record<string, string> = {
    reqs: "req",
    scenarios: "scenario",
    tests: "test",
    adrs: "ADR",
    flags: "flag",
    events: "event",
    symbols: "symbol",
  };

  const pluralMap: Record<string, string> = {
    reqs: "reqs",
    scenarios: "scenarios",
    tests: "tests",
    adrs: "ADRs",
    flags: "flags",
    events: "events",
    symbols: "symbols",
  };

  for (const [category, ids] of Object.entries(categories)) {
    const count = ids.length;
    if (count > 0) {
      const emoji = emojiMap[category] || "";
      const singular = singularMap[category] || category.slice(0, -1);
      const plural = pluralMap[category] || category;
      const label = count === 1 ? singular : plural;
      parts.push(`${emoji} ${count} ${label}`);
    }
  }

  if (guardedBy.length > 0) {
    const flagNames = guardedBy.map((f) => f.flagName).join(", ");
    parts.push(`🚩 guarded by ${flagNames}`);
  }

  if (parts.length === 0) {
    return "No linked entities";
  }

  return parts.join(" • ");
}

export function buildHoverMarkdown(
  symbolInfo: { id: string; title: string; file: string; line: number },
  entities: Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    tags: string[];
  }>,
): string {
  const lines: string[] = [];

  lines.push(`# ${symbolInfo.id}`);
  lines.push("");
  lines.push(`\`${symbolInfo.file}:${symbolInfo.line}\``);
  lines.push("");

  const emojiMap: Record<string, string> = {
    req: "📋",
    scenario: "🎭",
    test: "✓",
    adr: "📐",
    flag: "🚩",
    event: "⚡",
    symbol: "🔗",
  };

  for (const entity of entities) {
    const emoji = emojiMap[entity.type] || "📄";
    const tagsStr = entity.tags.length > 0 ? entity.tags.join(", ") : "none";
    lines.push(
      `${emoji} **${entity.id}**: ${entity.title} (status: ${entity.status}, tags: ${tagsStr})`,
    );
  }

  lines.push("");
  lines.push("[Browse entities](command:kibi.browseLinkedEntities)");

  return lines.join("\n");
}
```

## File: packages/vscode/src/hoverProvider.ts
```typescript
import { execSync } from "node:child_process";
import * as vscode from "vscode";
import { buildHoverMarkdown } from "./helpers";
import type { RelationshipCache } from "./relationshipCache";
import type { SymbolIndex } from "./symbolIndex";

interface EntityDetails {
  id: string;
  type: string;
  title: string;
  status: string;
  tags: string[];
}

interface EntityCacheEntry {
  data: EntityDetails | null;
  timestamp: number;
}

export class KibiHoverProvider implements vscode.HoverProvider {
  private entityDetailsCache = new Map<string, EntityCacheEntry>();
  private entityInflight = new Map<string, Promise<EntityDetails | null>>();
  private readonly CACHE_TTL = 30_000; // 30 seconds

  constructor(
    private workspaceRoot: string,
    private symbolIndex: SymbolIndex | null,
    private sharedCache: RelationshipCache,
  ) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): Promise<vscode.Hover | null> {
    // Check cancellation early
    if (token.isCancellationRequested) return null;

    // Check if we have a symbol index
    if (!this.symbolIndex) return null;

    // Find symbols in the current file
    const filePath = document.uri.fsPath;
    const symbols = this.symbolIndex.byFile.get(filePath);
    if (!symbols || symbols.length === 0) return null;

    // Find symbol at cursor position (VS Code uses 0-based line numbers, symbols use 1-based)
    const symbolAtPosition = symbols.find(
      (sym) => sym.sourceLine === position.line + 1,
    );
    if (!symbolAtPosition) return null;

    // Check cancellation before expensive operations
    if (token.isCancellationRequested) return null;

    // Fetch relationships via CLI (with caching)
    const relationships = await this.fetchRelationships(symbolAtPosition.id);
    if (!relationships || relationships.length === 0) {
      return null;
    }
    if (token.isCancellationRequested) return null;

    // Fetch entity details for each relationship
    const entities = await this.fetchEntityDetails(relationships, token);
    if (token.isCancellationRequested) return null;

    // Build hover markdown using helper function
    const markdown = buildHoverMarkdown(
      {
        id: symbolAtPosition.id,
        title: symbolAtPosition.title,
        file: symbolAtPosition.sourceFile || "",
        line: symbolAtPosition.sourceLine || 0,
      },
      entities,
    );

    // Create markdown string with isTrusted: true to enable command links
    const md = new vscode.MarkdownString(markdown);
    md.isTrusted = true;

    return new vscode.Hover(md);
  }

  private async fetchRelationships(
    symbolId: string,
  ): Promise<Array<{ type: string; from: string; to: string }> | null> {
    const cacheKey = `rel:${symbolId}`;
    const cached = this.sharedCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Check inflight requests to avoid duplicate calls
    const existing = this.sharedCache.getInflight(cacheKey);
    if (existing) {
      return existing;
    }

    const promise = this.queryRelationshipsViaCli(symbolId);
    this.sharedCache.setInflight(cacheKey, promise);

    try {
      const data = await promise;
      if (data) {
        this.sharedCache.set(cacheKey, { data, timestamp: Date.now() });
      }
      return data;
    } catch {
      return null;
    } finally {
      this.sharedCache.deleteInflight(cacheKey);
    }
  }

  private async queryRelationshipsViaCli(
    symbolId: string,
  ): Promise<Array<{ type: string; from: string; to: string }>> {
    try {
      const output = execSync(
        `bun run packages/cli/bin/kibi query --relationships ${symbolId} --format json`,
        {
          cwd: this.workspaceRoot,
          encoding: "utf8",
          timeout: 10000,
          stdio: ["ignore", "pipe", "ignore"],
        },
      );
      return JSON.parse(output) as Array<{
        type: string;
        from: string;
        to: string;
      }>;
    } catch {
      return [];
    }
  }

  private async fetchEntityDetails(
    relationships: Array<{ type: string; from: string; to: string }>,
    token: vscode.CancellationToken,
  ): Promise<EntityDetails[]> {
    // Extract unique entity IDs from relationships
    const entityIds = new Set<string>();
    for (const rel of relationships) {
      entityIds.add(rel.from);
      entityIds.add(rel.to);
    }

    // Fetch details for each entity
    const entities: EntityDetails[] = [];
    for (const id of entityIds) {
      if (token.isCancellationRequested) return [];

      const entity = await this.fetchEntityById(id);
      if (entity) {
        entities.push(entity);
      }
    }

    return entities;
  }

  private async fetchEntityById(
    entityId: string,
  ): Promise<EntityDetails | null> {
    const cacheKey = `entity:${entityId}`;
    const cached = this.entityDetailsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Check inflight requests to avoid duplicate calls
    const existing = this.entityInflight.get(cacheKey);
    if (existing) {
      return existing;
    }

    const promise = this.queryEntityViaCli(entityId);
    this.entityInflight.set(cacheKey, promise);

    try {
      const data = await promise;
      this.entityDetailsCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch {
      return null;
    } finally {
      this.entityInflight.delete(cacheKey);
    }
  }

  private async queryEntityViaCli(
    entityId: string,
  ): Promise<EntityDetails | null> {
    try {
      // Extract entity type from ID prefix (e.g., REQ-001 -> req)
      const typeMatch = entityId.match(/^([A-Z]+)-/);
      if (!typeMatch) return null;

      const typePrefix = typeMatch[1];
      const typeMap: Record<string, string> = {
        REQ: "req",
        SCEN: "scenario",
        TEST: "test",
        ADR: "adr",
        FLAG: "flag",
        EVENT: "event",
        SYM: "symbol",
      };

      const entityType = typeMap[typePrefix];
      if (!entityType) return null;

      const output = execSync(
        `bun run packages/cli/bin/kibi query ${entityType} --id ${entityId} --format json`,
        {
          cwd: this.workspaceRoot,
          encoding: "utf8",
          timeout: 10000,
          stdio: ["ignore", "pipe", "ignore"],
        },
      );

      const parsed = JSON.parse(output);

      // Handle both single object and array responses
      const entity = Array.isArray(parsed) ? parsed[0] : parsed;
      if (!entity) return null;

      return {
        id: entity.id || entityId,
        type: entityType,
        title: entity.title || "",
        status: entity.status || "unknown",
        tags: Array.isArray(entity.tags) ? entity.tags : [],
      };
    } catch {
      return null;
    }
  }
}
```

## File: packages/vscode/src/relationshipCache.ts
```typescript
export interface TypedRelationship {
  type: string;
  from: string;
  to: string;
}

export interface RelationshipCacheEntry {
  data: TypedRelationship[];
  timestamp: number;
}

export class RelationshipCache {
  private cache = new Map<string, RelationshipCacheEntry>();
  private inflight = new Map<string, Promise<TypedRelationship[]>>();
  private readonly CACHE_TTL = 30000; // 30 seconds

  get(key: string): RelationshipCacheEntry | undefined {
    return this.cache.get(key);
  }

  set(key: string, entry: RelationshipCacheEntry): void {
    this.cache.set(key, entry);
  }

  getInflight(key: string): Promise<TypedRelationship[]> | undefined {
    return this.inflight.get(key);
  }

  setInflight(key: string, promise: Promise<TypedRelationship[]>): void {
    this.inflight.set(key, promise);
  }

  deleteInflight(key: string): void {
    this.inflight.delete(key);
  }

  getTTL(): number {
    return this.CACHE_TTL;
  }

  clear(): void {
    this.cache.clear();
    this.inflight.clear();
  }
}
```

## File: packages/vscode/src/symbolIndex.ts
```typescript
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export interface SymbolEntry {
  id: string;
  title: string;
  /** Absolute path of the source file where this symbol lives, if available. */
  sourceFile?: string;
  /** 1-based line number of the symbol declaration within sourceFile. */
  sourceLine?: number;
  /** Raw links from symbols.yaml (related entity IDs). */
  links: string[];
}

export interface SymbolIndex {
  /** title (lowercased) → SymbolEntry[] */
  byTitle: Map<string, SymbolEntry[]>;
  /** absolute source file path → SymbolEntry[] */
  byFile: Map<string, SymbolEntry[]>;
  /** symbol id → SymbolEntry */
  byId: Map<string, SymbolEntry>;
}

export function buildIndex(
  manifestPath: string,
  workspaceRoot: string,
): SymbolIndex {
  const byTitle = new Map<string, SymbolEntry[]>();
  const byFile = new Map<string, SymbolEntry[]>();
  const byId = new Map<string, SymbolEntry>();

  if (!fs.existsSync(manifestPath)) return { byTitle, byFile, byId };

  let rawSymbols: Array<Record<string, unknown>>;
  try {
    rawSymbols = parseSymbolsManifest(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return { byTitle, byFile, byId };
  }

  for (const sym of rawSymbols) {
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
    const arr = byTitle.get(titleKey);
    if (arr) arr.push(entry);

    if (sourceFile) {
      if (!byFile.has(sourceFile)) byFile.set(sourceFile, []);
      const farr = byFile.get(sourceFile);
      if (farr) farr.push(entry);
    }
  }

  return { byTitle, byFile, byId };
}

function parseSymbolsManifest(content: string): Array<Record<string, unknown>> {
  const lines = content.split(/\r?\n/);
  const symbols: Array<Record<string, unknown>> = [];

  let inSymbols = false;
  let current: Record<string, unknown> | null = null;
  let inLinks = false;

  const pushCurrent = () => {
    if (!current) return;
    if (!Array.isArray(current.links)) current.links = [];
    symbols.push(current);
  };

  const unquote = (value: string): string => {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    if (!inSymbols) {
      if (trimmed === "symbols:") inSymbols = true;
      continue;
    }

    const itemMatch = trimmed.match(/^-+\s*id:\s*(.+)$/);
    if (itemMatch) {
      pushCurrent();
      current = {
        id: unquote(itemMatch[1]),
        links: [],
      };
      inLinks = false;
      continue;
    }

    if (!current) continue;

    if (trimmed === "links:") {
      inLinks = true;
      continue;
    }

    if (inLinks) {
      const linkMatch = trimmed.match(/^-+\s*(.+)$/);
      if (linkMatch) {
        (current.links as string[]).push(unquote(linkMatch[1]));
        continue;
      }
      inLinks = false;
    }

    const titleMatch = trimmed.match(/^title:\s*(.+)$/);
    if (titleMatch) {
      current.title = unquote(titleMatch[1]);
      continue;
    }

    const sourceMatch = trimmed.match(/^(sourceFile|source):\s*(.+)$/);
    if (sourceMatch) {
      current[sourceMatch[1]] = unquote(sourceMatch[2]);
      continue;
    }

    const sourceLineMatch = trimmed.match(/^sourceLine:\s*(\d+)$/);
    if (sourceLineMatch) {
      current.sourceLine = Number(sourceLineMatch[1]);
      continue;
    }
  }

  pushCurrent();
  return symbols;
}

/** Run `kibi query --relationships <id> --format json` and return the parsed result. */
export function queryRelationshipsViaCli(
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
    return JSON.parse(output) as Array<{
      type: string;
      from: string;
      to: string;
    }>;
  } catch {
    return [];
  }
}

// Named exports are already performed inline above. No additional export list needed.
```

## File: packages/vscode/src/treeProvider.ts
```typescript
import * as fs from "node:fs";
import * as path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as vscode from "vscode";

const execAsync = promisify(exec);

export interface KibiTreeItem {
  label: string;
  iconPath?: string;
  contextValue?: string;
  collapsibleState: vscode.TreeItemCollapsibleState;
  children?: KibiTreeItem[];
  tooltip?: string;
  /** Local filesystem path (when source is a local path, not a URL). */
  localPath?: string;
  /** For relationship nodes: the target entity ID to navigate to. */
  targetId?: string;
}

interface KbEntity {
  id: string;
  type: string;
  title: string;
  status: string;
  tags: string;
  source: string;
  /** Resolved local path when source is a file path rather than a URL. */
  localPath?: string;
}

interface KbRelationship {
  relType: string;
  fromId: string;
  toId: string;
}

const ENTITY_TYPE_META: Record<
  string,
  { name: string; icon: string; plural: string }
> = {
  req: { name: "Requirements", icon: "list-ordered", plural: "req" },
  scenario: { name: "Scenarios", icon: "file-text", plural: "scenario" },
  test: { name: "Tests", icon: "check", plural: "test" },
  adr: { name: "ADRs", icon: "book", plural: "adr" },
  flag: { name: "Flags", icon: "flag", plural: "flag" },
  event: { name: "Events", icon: "calendar", plural: "event" },
  symbol: { name: "Symbols", icon: "symbol-class", plural: "symbol" },
};

/** Relationship type → readable label */
const REL_LABELS: Record<string, string> = {
  depends_on: "depends on",
  specified_by: "specified by",
  verified_by: "verified by",
  implements: "implements",
  covered_by: "covered by",
  constrained_by: "constrained by",
  guards: "guards",
  publishes: "publishes",
  consumes: "consumes",
  relates_to: "relates to",
};

/**
 * Returns true when the string looks like a local filesystem path
 * (starts with / or Windows drive letter, or file:// URI) rather than an http/https URL.
 */
function isLocalPath(src: string): boolean {
  return (
    src.startsWith("/") ||
    /^[A-Za-z]:[\\/]/.test(src) ||
    src.startsWith("file://")
  );
}

function resolveLocalPath(
  src: string,
  workspaceRoot: string,
): string | undefined {
  if (!src) return undefined;
  if (src.startsWith("file://")) {
    try {
      return new URL(src).pathname;
    } catch {
      return undefined;
    }
  }
  if (src.startsWith("/")) return fs.existsSync(src) ? src : undefined;
  if (/^[A-Za-z]:[\\/]/.test(src)) return fs.existsSync(src) ? src : undefined;
  // Relative path — resolve against workspace root
  const resolved = path.resolve(workspaceRoot, src);
  return fs.existsSync(resolved) ? resolved : undefined;
}

export class KibiTreeDataProvider
  implements vscode.TreeDataProvider<KibiTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    KibiTreeItem | undefined | null
  > = new vscode.EventEmitter<KibiTreeItem | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<KibiTreeItem | undefined | null> =
    this._onDidChangeTreeData.event;

  private entities: KbEntity[] = [];
  private relationships: KbRelationship[] = [];
  private loaded = false;

  constructor(private workspaceRoot: string) {}

  refresh(): void {
    this.loaded = false;
    this.entities = [];
    this.relationships = [];
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: KibiTreeItem): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(
      element.label,
      element.collapsibleState,
    );

    if (element.iconPath) {
      treeItem.iconPath = new vscode.ThemeIcon(element.iconPath);
    }

    if (element.contextValue) {
      treeItem.contextValue = element.contextValue;
    }

    if (element.tooltip) {
      treeItem.tooltip = element.tooltip;
    }

    // Attach open-file command for entity nodes with a known local path
    if (element.localPath) {
      treeItem.command = {
        command: "kibi.openEntity",
        title: "Open Entity File",
        arguments: [element.localPath],
      };
      treeItem.resourceUri = vscode.Uri.file(element.localPath);
    } else if (element.targetId) {
      // Relationship node — navigate to the target entity by ID
      treeItem.command = {
        command: "kibi.openEntityById",
        title: "Open Related Entity",
        arguments: [element.targetId],
      };
    }

    return treeItem;
  }

  async getChildren(element?: KibiTreeItem): Promise<KibiTreeItem[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage("No workspace folder open");
      return [];
    }

    if (!this.loaded) {
      await this.loadEntities();
    }

    if (element) {
      return element.children || [];
    }

    return this.getRootItems();
  }

  private async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync("git branch --show-current", {
        cwd: this.workspaceRoot,
        encoding: "utf8",
        timeout: 3000,
      });
      const branch = stdout.trim();
      if (!branch || branch === "master") return "develop";
      return branch;
    } catch {
      return "develop";
    }
  }

  private async getKbRdfPath(): Promise<string | null> {
    const branch = await this.getCurrentBranch();
    const candidates = [
      path.join(this.workspaceRoot, ".kb", "branches", branch, "kb.rdf"),
      path.join(this.workspaceRoot, ".kb", "branches", "develop", "kb.rdf"),
    ];
    for (const p of candidates) {
      try {
        await fs.promises.access(p);
        return p;
      } catch {
        // continue
      }
    }
    return null;
  }

  private async loadEntities(): Promise<void> {
    this.loaded = true;
    this.entities = [];
    this.relationships = [];

    const rdfPath = await this.getKbRdfPath();
    if (!rdfPath) return;

    try {
      const content = await fs.promises.readFile(rdfPath, "utf8");
      this.entities = this.parseRdf(content);
      this.relationships = this.parseRdfRelationships(content);
    } catch {
      // silently fail — tree will show empty
    }
  }

  /**
   * Parse entities from kb.rdf using regex.
   * Each entity is an rdf:Description block containing kb:type, kb:title, kb:id etc.
   * Supports both prefixed (kb:entity/ID) and full URI (urn:kibi:entity/ID) formats.
   */
  private parseRdf(content: string): KbEntity[] {
    const entities: KbEntity[] = [];

    // Match each rdf:Description block - supports both kb:entity/ and full URI
    const blockRe =
      /<rdf:Description rdf:about="(?:(?:urn:kibi:)|kb:)entity\/([^"]+)">([\s\S]*?)<\/rdf:Description>/g;

    let match: RegExpExecArray | null;
    while ((match = blockRe.exec(content)) !== null) {
      const id = match[1];
      const block = match[2];

      const type = this.extractText(block, "kb:type");
      const title = this.extractText(block, "kb:title");
      const status = this.extractResourceSuffix(block, "kb:status");
      const tags = this.extractText(block, "kb:tags");
      const source = this.extractText(block, "kb:source");

      if (id && type && title) {
        const localPath = isLocalPath(source)
          ? resolveLocalPath(source, this.workspaceRoot)
          : undefined;
        entities.push({ id, type, title, status, tags, source, localPath });
      }
    }

    return entities;
  }

  /**
   * Parse relationships from kb.rdf.
   *
   * Relationships are stored as inline property triples inside entity blocks:
   *   <kb:depends_on rdf:resource="urn:kibi:entity/REQ-002"/>
   *
   * This method extracts all such triples by scanning entity blocks.
   */
  private parseRdfRelationships(content: string): KbRelationship[] {
    const relationships: KbRelationship[] = [];

    // Known relationship types from the KB schema
    const relTypes = [
      "depends_on",
      "specified_by",
      "verified_by",
      "implements",
      "covered_by",
      "constrained_by",
      "guards",
      "publishes",
      "consumes",
      "relates_to",
    ];

    // Match each rdf:Description block to get the source entity ID
    const blockRe =
      /<rdf:Description rdf:about="(?:(?:urn:kibi:)|kb:)entity\/([^"]+)">([\s\S]*?)<\/rdf:Description>/g;

    let blockMatch: RegExpExecArray | null;
    while ((blockMatch = blockRe.exec(content)) !== null) {
      const fromId = blockMatch[1];
      const block = blockMatch[2];

      // For each relationship type, find all rdf:resource references
      for (const relType of relTypes) {
        // Match <kb:relType rdf:resource="...entity/TOID"/>
        const relRe = new RegExp(
          `<kb:${relType}[^>]*rdf:resource="(?:(?:http://kibi\\.dev/kb/)|kb:)entity/([^"]+)"[^>]*/?>`,
          "g",
        );
        let relMatch: RegExpExecArray | null;
        while ((relMatch = relRe.exec(block)) !== null) {
          const toId = relMatch[1];
          relationships.push({ relType, fromId, toId });
        }
      }
    }

    return relationships;
  }

  private extractText(block: string, tag: string): string {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
    const m = block.match(re);
    return m ? m[1].trim() : "";
  }

  private extractResourceSuffix(block: string, tag: string): string {
    const re = new RegExp(
      `<${tag}[^>]*rdf:resource="[^"]*\/([^"\/]+)"[^>]*\/?>`,
    );
    const m = block.match(re);
    return m ? m[1] : "";
  }

  /** Build the entity index (id → entity) for quick lookups in relationship nodes. */
  private buildEntityIndex(): Map<string, KbEntity> {
    return new Map(this.entities.map((e) => [e.id, e]));
  }

  private getRootItems(): KibiTreeItem[] {
    const entityIndex = this.buildEntityIndex();

    return Object.entries(ENTITY_TYPE_META).map(([typeKey, meta]) => {
      const children = this.entities
        .filter((e) => e.type === typeKey)
        .map((e) => this.entityToTreeItem(e, entityIndex));

      return {
        label: `${meta.name} (${children.length})`,
        iconPath: meta.icon,
        contextValue: `kibi-${typeKey}`,
        collapsibleState:
          children.length > 0
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
        children: children.length > 0 ? children : [],
      };
    });
  }

  private entityToTreeItem(
    e: KbEntity,
    entityIndex: Map<string, KbEntity>,
  ): KibiTreeItem {
    const tagsClean = e.tags.replace(/^\[|\]$/g, "");

    const tooltipLines = [
      `ID: ${e.id}`,
      e.source ? `Source: ${e.source}` : "",
      e.status ? `Status: ${e.status}` : "",
      tagsClean ? `Tags: ${tagsClean}` : "",
    ].filter(Boolean);

    if (!e.localPath && e.source) {
      tooltipLines.push("(Source is a URL — cannot open directly)");
    }

    // Build relationship children for this entity
    const relChildren = this.buildRelationshipChildren(e.id, entityIndex);

    return {
      label: `${e.id}: ${e.title}`,
      iconPath: ENTITY_TYPE_META[e.type]?.icon ?? "circle-outline",
      contextValue: `kibi-entity-${e.type}`,
      collapsibleState:
        relChildren.length > 0
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None,
      tooltip: tooltipLines.join("\n"),
      localPath: e.localPath,
      children: relChildren,
    };
  }

  private buildRelationshipChildren(
    entityId: string,
    entityIndex: Map<string, KbEntity>,
  ): KibiTreeItem[] {
    const children: KibiTreeItem[] = [];

    for (const rel of this.relationships) {
      let direction: "out" | "in" | null = null;
      let otherId: string | null = null;

      if (rel.fromId === entityId) {
        direction = "out";
        otherId = rel.toId;
      } else if (rel.toId === entityId) {
        direction = "in";
        otherId = rel.fromId;
      }

      if (!otherId || !direction) continue;

      const other = entityIndex.get(otherId);
      const otherLabel = other ? `${otherId}: ${other.title}` : otherId;
      const relLabel = REL_LABELS[rel.relType] ?? rel.relType;

      const label =
        direction === "out"
          ? `→ ${relLabel}: ${otherLabel}`
          : `← ${relLabel}: ${otherLabel}`;

      children.push({
        label,
        iconPath: "arrow-right",
        contextValue: "kibi-relationship",
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        tooltip: `${rel.fromId} -[${rel.relType}]-> ${rel.toId}`,
        localPath: other?.localPath,
        targetId: otherId,
      });
    }

    return children;
  }

  /**
   * Find and return the local path for a given entity ID.
   * Used by the `kibi.openEntityById` command.
   */
  getLocalPathForEntity(id: string): string | undefined {
    return this.entities.find((e) => e.id === id)?.localPath;
  }
}
```


---

#### 🔙 PREVIOUS PART: [kibi-01-logic-5.md](file:kibi-01-logic-5.md)

#### ⏭️ NEXT PART: [kibi-02-tests-1.md](file:kibi-02-tests-1.md)

> _End of Part 7_
