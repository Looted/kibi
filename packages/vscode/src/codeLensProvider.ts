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
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { categorizeEntities, formatLensTitle } from "./helpers";
import type { RelationshipCache } from "./relationshipCache";
import { resolveSymbolsManifestPath } from "./shared/manifestResolver";
import {
  type SymbolEntry,
  type SymbolIndex,
  buildIndex,
  queryRelationshipsViaCli,
} from "./symbolIndex";

interface CodeLensMetadata {
  symbolId: string;
  staticLinks: string[];
  sourceFile?: string | undefined;
  sourceLine?: number | undefined;
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
    this.manifestPath = resolveSymbolsManifestPath(workspaceRoot);
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
          paths?: { symbols?: string };
        };
        // Check top-level symbolsManifest (legacy) or paths.symbols (current convention)
        const manifestRelPath = config.symbolsManifest ?? config.paths?.symbols;
        if (manifestRelPath) {
          return path.isAbsolute(manifestRelPath)
            ? manifestRelPath
            : path.resolve(this.workspaceRoot, manifestRelPath);
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
    return (
      candidates.find((p) => fs.existsSync(p)) ??
      candidates[0] ??
      path.join(this.workspaceRoot, "symbols.yaml")
    );
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
        staticLinks: entry.links ?? [],
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
