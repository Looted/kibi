import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";
import * as vscode from "vscode";

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

  private getCurrentBranch(): string {
    try {
      const branch = execSync("git branch --show-current", {
        cwd: this.workspaceRoot,
        encoding: "utf8",
        timeout: 3000,
      }).trim();
      if (!branch || branch === "master") return "main";
      return branch;
    } catch {
      return "main";
    }
  }

  private getKbRdfPath(): string | null {
    const branch = this.getCurrentBranch();
    const candidates = [
      path.join(this.workspaceRoot, ".kb", "branches", branch, "kb.rdf"),
      path.join(this.workspaceRoot, ".kb", "branches", "main", "kb.rdf"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  private async loadEntities(): Promise<void> {
    this.loaded = true;
    this.entities = [];
    this.relationships = [];

    const rdfPath = this.getKbRdfPath();
    if (!rdfPath) return;

    try {
      const content = fs.readFileSync(rdfPath, "utf8");
      this.entities = this.parseRdf(content);
      this.relationships = this.parseRdfRelationships(content);
    } catch {
      // silently fail — tree will show empty
    }
  }

  /**
   * Parse entities from kb.rdf using regex.
   * Each entity is an rdf:Description block containing kb:type, kb:title, kb:id etc.
   */
  private parseRdf(content: string): KbEntity[] {
    const entities: KbEntity[] = [];

    // Match each rdf:Description block
    const blockRe =
      /<rdf:Description rdf:about="kb:entity\/([^"]+)">([\s\S]*?)<\/rdf:Description>/g;

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
        const localPath =
          isLocalPath(source)
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
   * Two formats are attempted in order:
   *   1. Dedicated rdf:Description blocks with rdf:about="kb:rel/..."
   *   2. Inline relationship resource references inside entity blocks
   */
  private parseRdfRelationships(content: string): KbRelationship[] {
    const relationships: KbRelationship[] = [];

    // Format 1: dedicated relationship blocks
    const relBlockRe =
      /<rdf:Description rdf:about="kb:rel\/[^"]*">([\s\S]*?)<\/rdf:Description>/g;
    let match: RegExpExecArray | null;
    let foundDedicated = false;

    while ((match = relBlockRe.exec(content)) !== null) {
      foundDedicated = true;
      const block = match[1];
      const relType =
        this.extractText(block, "kb:relType") ||
        this.extractResourceSuffix(block, "kb:relType");
      const from =
        this.extractText(block, "kb:from") ||
        this.extractResourceSuffix(block, "kb:from");
      const to =
        this.extractText(block, "kb:to") ||
        this.extractResourceSuffix(block, "kb:to");
      if (relType && from && to) {
        relationships.push({ relType, fromId: from, toId: to });
      }
    }

    if (foundDedicated) return relationships;

    // Format 2: inline resource references
    // <kb:relationship rdf:resource="kb:RELTYPE/FROM/TO"/>
    const inlineRe =
      /<kb:relationship[^>]+rdf:resource="kb:([^/]+)\/([^/]+)\/([^"]+)"[^>]*\/?>/g;
    while ((match = inlineRe.exec(content)) !== null) {
      const [, relType, fromId, toId] = match;
      relationships.push({ relType, fromId, toId });
    }

    return relationships;
  }

  private extractText(block: string, tag: string): string {
    const re = new RegExp(`<${tag}[^>]*>([\s\S]*?)<\/${tag}>`);
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
