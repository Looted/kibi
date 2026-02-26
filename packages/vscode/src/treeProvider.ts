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

 Notes:
 - Apply the header to the source files (TS/JS/other) in `packages/*/src` before building.
 - For small CLI wrapper scripts (e.g. `packages/*/bin/*`) you can add the header as a block comment directly above the shebang line or below it; if you need the shebang to remain the very first line, place the header after the shebang.
 - Built `dist/` files are generated; prefer to modify source files and rebuild rather than editing `dist/` directly.

*/

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
