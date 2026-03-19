import { exec } from "node:child_process";
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
import { promisify } from "node:util";
import { load as loadYaml } from "js-yaml";
import * as vscode from "vscode";
import { resolveSymbolsManifestPath } from "./shared/manifestResolver";
import { type SymbolEntry, type SymbolIndex, buildIndex } from "./symbolIndex";

const execAsync = promisify(exec);

export interface KibiTreeItem {
  label: string;
  description?: string;
  iconPath?: string;
  contextValue?: string;
  collapsibleState: vscode.TreeItemCollapsibleState;
  children?: KibiTreeItem[];
  tooltip?: string;
  /** Local filesystem path (when source is a local path, not a URL). */
  localPath?: string;
  /** 1-based line number used when opening a symbol source file. */
  sourceLine?: number;
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
  /** 1-based line number for symbol source navigation. */
  sourceLine?: number;
}

interface KbRelationship {
  relType: string;
  fromId: string;
  toId: string;
}

type SupportedEntityType =
  | "req"
  | "scenario"
  | "test"
  | "adr"
  | "flag"
  | "event"
  | "fact"
  | "symbol";

type DocumentationEntityType = Exclude<SupportedEntityType, "symbol">;

interface FrontmatterLinkRecord {
  type?: unknown;
  target?: unknown;
  to?: unknown;
}

const ENTITY_TYPE_CONFIG_KEYS: Record<DocumentationEntityType, string> = {
  req: "requirements",
  scenario: "scenarios",
  test: "tests",
  adr: "adr",
  flag: "flags",
  event: "events",
  fact: "facts",
};

const DEFAULT_DOCUMENTATION_PATHS: Record<DocumentationEntityType, string> = {
  req: "documentation/requirements",
  scenario: "documentation/scenarios",
  test: "documentation/tests",
  adr: "documentation/adr",
  flag: "documentation/flags",
  event: "documentation/events",
  fact: "documentation/facts",
};

const ENTITY_TYPE_PREFIXES: Record<SupportedEntityType, string[]> = {
  req: ["REQ-"],
  scenario: ["SCEN-"],
  test: ["TEST-"],
  adr: ["ADR-"],
  flag: ["FLAG-"],
  event: ["EVT-", "EVENT-"],
  fact: ["FACT-"],
  symbol: ["SYM-"],
};

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

// implements REQ-vscode-traceability
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
  private symbolIndex: SymbolIndex | null = null;
  private documentationEntityDirs: Partial<
    Record<DocumentationEntityType, string>
  > | null = null;
  private loaded = false;

  constructor(
    private workspaceRoot: string,
    private output?: vscode.OutputChannel,
  ) {}

  // implements REQ-vscode-traceability
  refresh(): void {
    this.loaded = false;
    this.entities = [];
    this.relationships = [];
    this.symbolIndex = null;
    this.documentationEntityDirs = null;
    this._onDidChangeTreeData.fire(undefined);
  }

  // implements REQ-vscode-traceability
  getTreeItem(element: KibiTreeItem): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(
      element.label,
      element.collapsibleState,
    );

    if (element.description) {
      treeItem.description = element.description;
    }

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
        arguments: [element.localPath, element.sourceLine],
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

  // implements REQ-vscode-traceability
  private async loadEntities(): Promise<void> {
    this.loaded = true;
    this.entities = [];
    this.relationships = [];
    this.symbolIndex = buildIndex(
      resolveSymbolsManifestPath(this.workspaceRoot),
      this.workspaceRoot,
    );

    const fallbackData = await this.loadFallbackData();
    let rdfEntities: KbEntity[] = [];
    let rdfRelationships: KbRelationship[] = [];

    const rdfPath = await this.getKbRdfPath();
    if (rdfPath) {
      try {
        const content = await fs.promises.readFile(rdfPath, "utf8");
        rdfEntities = this.parseRdf(content);
        rdfRelationships = this.parseRdfRelationships(content);
      } catch {
        // silently fail — fallback data still populates the tree
      }
    }

    this.entities = this.mergeEntities(fallbackData.entities, rdfEntities);
    this.relationships = this.mergeRelationships(
      fallbackData.relationships,
      rdfRelationships,
    );
  }

  /**
   * Parse entities from kb.rdf using regex.
   * Each entity is an rdf:Description block containing kb:type, kb:title, kb:id etc.
   * Supports both prefixed (kb:entity/ID) and full URI (urn:kibi:entity/ID) formats.
   */
  // implements REQ-vscode-traceability
  private parseRdf(content: string): KbEntity[] {
    const entities: KbEntity[] = [];

    // Match each rdf:Description block - supports both kb:entity/ and full URI
    const blockRe =
      /<rdf:Description rdf:about="(?:(?:urn:kibi:)|kb:)entity\/([^"]+)">([\s\S]*?)<\/rdf:Description>/g;

    while (true) {
      const match = blockRe.exec(content);
      if (!match) break;

      const id = match[1];
      const block = match[2];

      const type = this.extractText(block, "kb:type");
      const title = this.extractText(block, "kb:title");
      const status = this.extractResourceSuffix(block, "kb:status");
      const tags = this.extractText(block, "kb:tags");
      const source = this.extractText(block, "kb:source");

      if (id && type && title) {
        const symbolEntry =
          type === "symbol" ? this.symbolIndex?.byId.get(id) : undefined;
        const documentationPath = this.getDocumentationPathForEntity(id, type);
        const symbolSourcePath =
          symbolEntry?.sourceFile && fs.existsSync(symbolEntry.sourceFile)
            ? symbolEntry.sourceFile
            : undefined;
        const localPath =
          type === "symbol" && symbolSourcePath
            ? symbolSourcePath
            : documentationPath
              ? documentationPath
              : isLocalPath(source)
                ? resolveLocalPath(source, this.workspaceRoot)
                : undefined;
        entities.push({
          id,
          type,
          title,
          status,
          tags,
          source,
          localPath,
          sourceLine: symbolEntry?.sourceLine,
        });
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
  // implements REQ-vscode-traceability
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

    while (true) {
      const blockMatch = blockRe.exec(content);
      if (!blockMatch) break;

      const fromId = blockMatch[1];
      const block = blockMatch[2];

      // For each relationship type, find all rdf:resource references
      for (const relType of relTypes) {
        // Match <kb:relType rdf:resource="...entity/TOID"/>
        const relRe = new RegExp(
          `<kb:${relType}[^>]*rdf:resource="(?:(?:http://kibi\\.dev/kb/)|kb:)entity/([^"]+)"[^>]*/?>`,
          "g",
        );
        while (true) {
          const relMatch = relRe.exec(block);
          if (!relMatch) break;

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

  // implements REQ-vscode-traceability
  private resolveConfiguredPath(configuredPath: string): string {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(this.workspaceRoot, configuredPath);
  }

  // implements REQ-vscode-traceability
  private getDocumentationEntityDirs(): Partial<
    Record<DocumentationEntityType, string>
  > {
    if (this.documentationEntityDirs) {
      return this.documentationEntityDirs;
    }

    let configuredPaths: Record<string, unknown> = {};
    const configPath = path.join(this.workspaceRoot, ".kb", "config.json");
    if (fs.existsSync(configPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
          paths?: Record<string, unknown>;
        };
        configuredPaths = parsed.paths ?? {};
      } catch {
        configuredPaths = {};
      }
    }

    const dirs: Partial<Record<DocumentationEntityType, string>> = {};
    for (const [type, configKey] of Object.entries(
      ENTITY_TYPE_CONFIG_KEYS,
    ) as Array<[DocumentationEntityType, string]>) {
      const configuredPath = configuredPaths[configKey];
      const candidate =
        typeof configuredPath === "string" && configuredPath.length > 0
          ? configuredPath
          : DEFAULT_DOCUMENTATION_PATHS[type];
      const resolved = this.resolveConfiguredPath(candidate);
      if (fs.existsSync(resolved)) {
        dirs[type] = resolved;
      }
    }

    this.documentationEntityDirs = dirs;
    return dirs;
  }

  // implements REQ-vscode-traceability
  private inferEntityTypeFromId(id: string): SupportedEntityType | undefined {
    for (const [type, prefixes] of Object.entries(
      ENTITY_TYPE_PREFIXES,
    ) as Array<[SupportedEntityType, string[]]>) {
      if (prefixes.some((prefix) => id.startsWith(prefix))) {
        return type;
      }
    }

    return undefined;
  }

  // implements REQ-vscode-traceability
  private getDocumentationPathForEntity(
    id: string,
    type?: string,
  ): string | undefined {
    const inferredType =
      type === "symbol"
        ? undefined
        : ((type as DocumentationEntityType | undefined) ??
          this.inferEntityTypeFromId(id));

    if (!inferredType || inferredType === "symbol") {
      return undefined;
    }

    const dir =
      this.getDocumentationEntityDirs()[
        inferredType as DocumentationEntityType
      ];
    if (!dir) {
      return undefined;
    }

    const candidate = path.join(dir, `${id}.md`);
    return fs.existsSync(candidate) ? candidate : undefined;
  }

  // implements REQ-vscode-traceability
  private async loadFallbackData(): Promise<{
    entities: KbEntity[];
    relationships: KbRelationship[];
  }> {
    const symbolFallback = this.buildSymbolFallbackData();
    const documentationFallback = await this.loadDocumentationFallbackData();

    return {
      entities: this.mergeEntities(
        documentationFallback.entities,
        symbolFallback.entities,
      ),
      relationships: this.mergeRelationships(
        documentationFallback.relationships,
        symbolFallback.relationships,
      ),
    };
  }

  // implements REQ-vscode-traceability
  private buildSymbolFallbackData(): {
    entities: KbEntity[];
    relationships: KbRelationship[];
  } {
    const entities: KbEntity[] = [];
    const relationships: KbRelationship[] = [];

    for (const symbol of this.symbolIndex?.byId.values() ?? []) {
      const localPath =
        symbol.sourceFile && fs.existsSync(symbol.sourceFile)
          ? symbol.sourceFile
          : undefined;
      entities.push({
        id: symbol.id,
        type: "symbol",
        title: symbol.title,
        status: "active",
        tags: "",
        source: localPath
          ? this.toWorkspaceRelativePath(localPath)
          : path.relative(
              this.workspaceRoot,
              resolveSymbolsManifestPath(this.workspaceRoot),
            ),
        localPath,
        sourceLine: symbol.sourceLine,
      });

      for (const linkId of symbol.links ?? []) {
        relationships.push({
          relType: "relates_to",
          fromId: symbol.id,
          toId: linkId,
        });
      }
    }

    return { entities, relationships };
  }

  // implements REQ-vscode-traceability
  private async loadDocumentationFallbackData(): Promise<{
    entities: KbEntity[];
    relationships: KbRelationship[];
  }> {
    const entities: KbEntity[] = [];
    const relationships: KbRelationship[] = [];

    for (const [type, dir] of Object.entries(
      this.getDocumentationEntityDirs(),
    ) as Array<[DocumentationEntityType, string]>) {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      const markdownFiles = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
        .map((entry) => path.join(dir, entry.name));

      const parsed = await Promise.all(
        markdownFiles.map((filePath) =>
          this.parseDocumentationEntity(filePath, type),
        ),
      );

      for (const item of parsed) {
        if (!item) continue;
        entities.push(item.entity);
        relationships.push(...item.relationships);
      }
    }

    return { entities, relationships };
  }

  // implements REQ-vscode-traceability
  private async parseDocumentationEntity(
    filePath: string,
    type: DocumentationEntityType,
  ): Promise<{ entity: KbEntity; relationships: KbRelationship[] } | null> {
    try {
      const content = await fs.promises.readFile(filePath, "utf8");
      const frontmatter = this.parseFrontmatter(content);
      const id = String(frontmatter.id ?? path.basename(filePath, ".md"));
      const title = String(frontmatter.title ?? id);
      const status = String(frontmatter.status ?? "active");
      const source = String(
        frontmatter.source ?? this.toWorkspaceRelativePath(filePath),
      );

      return {
        entity: {
          id,
          type,
          title,
          status,
          tags: this.normalizeTags(frontmatter.tags),
          source,
          localPath: filePath,
        },
        relationships: this.parseFrontmatterLinks(id, frontmatter.links),
      };
    } catch {
      return null;
    }
  }

  // implements REQ-vscode-traceability
  private parseFrontmatter(content: string): Record<string, unknown> {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
      return {};
    }

    try {
      const parsed = loadYaml(match[1]);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }

  // implements REQ-vscode-traceability
  private normalizeTags(tags: unknown): string {
    if (Array.isArray(tags)) {
      return `[${tags.map((tag) => String(tag)).join(", ")}]`;
    }

    if (typeof tags === "string") {
      return tags;
    }

    return "";
  }

  // implements REQ-vscode-traceability
  private parseFrontmatterLinks(
    fromId: string,
    links: unknown,
  ): KbRelationship[] {
    if (!Array.isArray(links)) {
      return [];
    }

    const relationships: KbRelationship[] = [];
    for (const link of links) {
      if (typeof link === "string") {
        relationships.push({
          relType: "relates_to",
          fromId,
          toId: link,
        });
        continue;
      }

      if (!link || typeof link !== "object") {
        continue;
      }

      const linkRecord = link as FrontmatterLinkRecord;
      const toId = String(linkRecord.target ?? linkRecord.to ?? "");
      if (!toId) {
        continue;
      }

      relationships.push({
        relType: String(linkRecord.type ?? "relates_to"),
        fromId,
        toId,
      });
    }

    return relationships;
  }

  // implements REQ-vscode-traceability
  private mergeEntities(...collections: KbEntity[][]): KbEntity[] {
    const byId = new Map<string, KbEntity>();

    for (const collection of collections) {
      for (const entity of collection) {
        const existing = byId.get(entity.id);
        if (!existing) {
          byId.set(entity.id, entity);
          continue;
        }

        byId.set(entity.id, {
          id: entity.id,
          type: entity.type || existing.type,
          title: entity.title || existing.title,
          status: entity.status || existing.status,
          tags: entity.tags || existing.tags,
          source: entity.source || existing.source,
          localPath: entity.localPath ?? existing.localPath,
          sourceLine: entity.sourceLine ?? existing.sourceLine,
        });
      }
    }

    return [...byId.values()];
  }

  // implements REQ-vscode-traceability
  private mergeRelationships(
    ...collections: KbRelationship[][]
  ): KbRelationship[] {
    const relationships: KbRelationship[] = [];
    const seen = new Set<string>();

    for (const collection of collections) {
      for (const relationship of collection) {
        const key = `${relationship.relType}|${relationship.fromId}|${relationship.toId}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        relationships.push(relationship);
      }
    }

    return relationships;
  }

  /** Build the entity index (id → entity) for quick lookups in relationship nodes. */
  // implements REQ-vscode-traceability
  private buildEntityIndex(): Map<string, KbEntity> {
    return new Map(this.entities.map((e) => [e.id, e]));
  }

  // implements REQ-vscode-traceability
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

  // implements REQ-vscode-traceability
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

    const description =
      e.type === "symbol" && e.localPath
        ? this.formatLocationDescription(e.localPath, e.sourceLine)
        : undefined;

    if (e.type === "symbol" && description) {
      tooltipLines.push(`Code: ${description}`);
      tooltipLines.push(
        "Click to open source code. Expand to browse linked entities.",
      );
    }

    // Build relationship children for this entity
    const relChildren = this.buildRelationshipChildren(e.id, entityIndex);

    return {
      label: `${e.id}: ${e.title}`,
      description,
      iconPath: ENTITY_TYPE_META[e.type]?.icon ?? "circle-outline",
      contextValue:
        e.type === "symbol" ? "kibi-symbol" : `kibi-entity-${e.type}`,
      collapsibleState:
        relChildren.length > 0
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None,
      tooltip: tooltipLines.join("\n"),
      localPath: e.localPath,
      sourceLine: e.sourceLine,
      children: relChildren,
    };
  }

  // implements REQ-vscode-traceability
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
        sourceLine: other?.sourceLine,
        targetId: otherId,
      });
    }

    return children;
  }

  // implements REQ-vscode-traceability
  private formatLocationDescription(filePath: string, line?: number): string {
    const relativePath = this.toWorkspaceRelativePath(filePath);
    return line ? `${relativePath}:${line}` : relativePath;
  }

  // implements REQ-vscode-traceability
  private toWorkspaceRelativePath(filePath: string): string {
    return path.relative(this.workspaceRoot, filePath).replace(/\\/g, "/");
  }

  // implements REQ-vscode-traceability
  getNavigationTargetForEntity(
    id: string,
  ): { localPath: string; line?: number } | undefined {
    const entity = this.entities.find((e) => e.id === id);
    if (entity?.localPath) {
      if (!fs.existsSync(entity.localPath)) {
        this.output?.appendLine(
          `getNavigationTargetForEntity: Entity ${id} has localPath ${entity.localPath} but file does not exist.`,
        );
        return undefined;
      }

      return {
        localPath: entity.localPath,
        line: entity.sourceLine,
      };
    }

    const symbolEntry = this.symbolIndex?.byId.get(id);
    if (symbolEntry?.sourceFile && fs.existsSync(symbolEntry.sourceFile)) {
      return {
        localPath: symbolEntry.sourceFile,
        line: symbolEntry.sourceLine,
      };
    }

    const documentationPath = this.getDocumentationPathForEntity(id);
    if (documentationPath) {
      return {
        localPath: documentationPath,
      };
    }

    return undefined;
  }

  // implements REQ-vscode-traceability
  getEntityCount(type: string): number {
    return this.entities.filter((entity) => entity.type === type).length;
  }

  // implements REQ-vscode-traceability
  getEntityById(id: string): KbEntity | undefined {
    return this.entities.find((entity) => entity.id === id);
  }

  // implements REQ-vscode-traceability
  getFallbackSymbolEntity(symbol: SymbolEntry): KbEntity {
    return {
      id: symbol.id,
      type: "symbol",
      title: symbol.title,
      status: "active",
      tags: "",
      source: symbol.sourceFile
        ? this.toWorkspaceRelativePath(symbol.sourceFile)
        : path.relative(
            this.workspaceRoot,
            resolveSymbolsManifestPath(this.workspaceRoot),
          ),
      localPath:
        symbol.sourceFile && fs.existsSync(symbol.sourceFile)
          ? symbol.sourceFile
          : undefined,
      sourceLine: symbol.sourceLine,
    };
  }

  /**
   * Find and return the local path for a given entity ID.
   * Used by the `kibi.openEntityById` command.
   *
   * Now checks if the local path actually exists before returning it.
   * Returns undefined if the path doesn't exist on the filesystem.
   */
  // implements REQ-vscode-traceability
  getLocalPathForEntity(id: string): string | undefined {
    return this.getNavigationTargetForEntity(id)?.localPath;
  }
}
