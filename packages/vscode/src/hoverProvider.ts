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
