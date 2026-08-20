// implements REQ-opencode-file-context-guidance-v1
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { loadKbSyncPaths } from "./file-filter.js";

// ── Shared types ────────────────────────────────────────────────────

export type SymbolsManifestRow = {
  id?: string;
  sourceFile?: string;
  links?: string[];
  relationships?: Array<{ type: string; target: string }>;
};

// ── Lightweight YAML parser (symbols.yaml subset) ───────────────────
//
// Handles:
//   symbols:
//     - id: SYM-xxx
//       sourceFile: path/to/file
//       links:
//         - REQ-xxx
//       relationships:
//         - type: implements
//           target: REQ-xxx
//
// And bare array format (no wrapping `symbols:` key):
//     - id: SYM-xxx
//       ...

// implements REQ-opencode-file-context-guidance-v1
export function parseSymbolsYaml(content: string): SymbolsManifestRow[] {
  const entries: SymbolsManifestRow[] = [];
  const lines = content.split("\n");

  let current: Partial<SymbolsManifestRow> | null = null;
  let section: "none" | "links" | "relationships" = "none";
  let pendingRel: { type: string; target?: string } | null = null;

  function flushRel() {
    if (pendingRel?.type && pendingRel.target && current?.relationships) {
      current.relationships.push({
        type: pendingRel.type,
        target: pendingRel.target,
      });
    }
    pendingRel = null;
  }

  function flushEntry() {
    flushRel();
    if (current?.id && current?.sourceFile) {
      entries.push(current as SymbolsManifestRow);
    }
    current = null;
    section = "none";
  }

  for (const raw of lines) {
    if (raw.trim().startsWith("#")) continue;

    // New entry: "  - id: ..."
    const entryMatch = raw.match(/^\s+-\s+id:\s*(.+)$/);
    if (entryMatch) {
      flushEntry();
      const entryId = entryMatch[1];
      if (entryId === undefined) continue;
      current = { id: entryId.trim(), links: [], relationships: [] };
      section = "none";
      continue;
    }

    if (!current) continue;

    // sourceFile
    const srcMatch = raw.match(/^\s+sourceFile:\s*(.+)$/);
    if (srcMatch) {
      const sourceFile = srcMatch[1];
      if (sourceFile === undefined) continue;
      current.sourceFile = sourceFile.trim();
      section = "none";
      continue;
    }

    // links section header
    if (/^\s+links:\s*$/.test(raw)) {
      flushRel();
      section = "links";
      continue;
    }

    // relationships section header
    if (/^\s+relationships:\s*$/.test(raw)) {
      flushRel();
      section = "relationships";
      continue;
    }

    // Link item: "      - REQ-xxx"
    if (section === "links") {
      const linkMatch = raw.match(/^\s+-\s+(REQ-[A-Za-z0-9_-]+)\s*$/);
      if (linkMatch) {
        const linkId = linkMatch[1];
        if (linkId !== undefined && current.links) {
          current.links.push(linkId);
        }
        continue;
      }
    }

    // Relationship type: "      - type: implements"
    if (section === "relationships") {
      const relTypeMatch = raw.match(/^\s+-\s+type:\s*(.+)$/);
      if (relTypeMatch) {
        flushRel();
        const relationType = relTypeMatch[1];
        if (relationType === undefined) continue;
        pendingRel = { type: relationType.trim() };
        continue;
      }
      // Relationship target: "        target: REQ-..."
      const relTargetMatch = raw.match(/^\s+target:\s*(.+)$/);
      if (relTargetMatch && pendingRel) {
        const target = relTargetMatch[1];
        if (target === undefined) continue;
        pendingRel.target = target.trim();
      }
    }
  }

  flushEntry();
  return entries;
}

// ── Doc-path identity mapping ───────────────────────────────────────

const DOC_ENTITY_PATTERN =
  /^(REQ|SCEN|TEST|ADR|FLAG|EVT|FACT)-[A-Za-z0-9_-]+\.md$/;

// implements REQ-opencode-file-context-guidance-v1
function resolveDocPathIdentity(
  relPath: string,
  syncPaths: Record<string, string>,
): string | null {
  const basename = path.posix.basename(relPath);
  if (!DOC_ENTITY_PATTERN.test(basename)) return null;

  const entityId = basename.replace(/\.md$/, "");

  // Check if the file lives under one of the configured doc roots
  const docRootKeys = [
    "requirements",
    "scenarios",
    "tests",
    "adr",
    "flags",
    "events",
    "facts",
  ] as const;

  // Normalize the relative path for matching
  const normalizedRel = relPath.split(path.sep).join("/");

  for (const key of docRootKeys) {
    const pattern = syncPaths[key];
    if (!pattern) continue;

    // Strip glob from pattern to get the root dir prefix
    // e.g. ".kb/requirements/**/*.md" → ".kb/requirements"
    const rootDir = pattern.replace(/\/\*\*\/.*$/, "").replace(/\/+$/, "");

    if (normalizedRel.startsWith(`${rootDir}/`)) {
      return entityId;
    }
  }

  return null;
}

// ── Symbols file resolution ─────────────────────────────────────────

function readSymbolsManifest(
  worktree: string,
  syncPaths: Record<string, string>,
): SymbolsManifestRow[] {
  const symbolsPathRaw = syncPaths.symbols;
  if (!symbolsPathRaw) return [];

  const symbolsPath = path.isAbsolute(symbolsPathRaw)
    ? symbolsPathRaw
    : path.join(worktree, symbolsPathRaw);

  if (!existsSync(symbolsPath)) return [];

  const content = readFileSync(symbolsPath, "utf8");
  return parseSymbolsYaml(content);
}

function normalizeFilePath(worktree: string, filePath: string): string {
  // Normalize to forward-slash relative path from worktree
  const absPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(worktree, filePath);

  return path.relative(worktree, absPath).split(path.sep).join("/");
}

// ── Public API ──────────────────────────────────────────────────────

// implements REQ-opencode-file-context-guidance-v1
export function getFileLinkedEntityIds(
  worktree: string,
  filePath: string,
): { ids: string[]; source: "symbols" | "doc-path" | "none" } {
  try {
    const syncPaths = loadKbSyncPaths(worktree);
    const relPath = normalizeFilePath(worktree, filePath);

    // Check doc-path identity first
    const docId = resolveDocPathIdentity(relPath, syncPaths);
    if (docId) {
      return { ids: [docId], source: "doc-path" };
    }

    // Try symbols manifest
    const symbols = readSymbolsManifest(worktree, syncPaths);
    const matchedRows = symbols.filter((s) => s.sourceFile === relPath);

    if (matchedRows.length === 0) {
      return { ids: [], source: "none" };
    }

    const seen = new Set<string>();
    const orderedIds: string[] = [];

    // Priority order: implements → covered_by → executable_for
    const relPriority = ["implements", "covered_by", "executable_for"];

    // First pass: collect relationships grouped by priority type, preserving file order within each type
    for (const priorityType of relPriority) {
      for (const row of matchedRows) {
        for (const r of row.relationships ?? []) {
          if (r.type === priorityType) {
            const id = r.target;
            if (!seen.has(id)) {
              seen.add(id);
              orderedIds.push(id);
              if (orderedIds.length >= 3)
                return { ids: orderedIds.slice(0, 3), source: "symbols" };
            }
          }
        }
      }
    }

    // Second pass: fall back to static links, preserving file order
    for (const row of matchedRows) {
      for (const l of row.links ?? []) {
        if (!seen.has(l)) {
          seen.add(l);
          orderedIds.push(l);
          if (orderedIds.length >= 3)
            return { ids: orderedIds.slice(0, 3), source: "symbols" };
        }
      }
    }

    return { ids: orderedIds.slice(0, 3), source: "symbols" };
  } catch {
    return { ids: [], source: "none" };
  }
}

// implements REQ-opencode-file-context-guidance-v1
export function getFileLinkedTargetsByType(
  worktree: string,
  filePath: string,
  relationshipTypes: string[],
): string[] {
  try {
    const syncPaths = loadKbSyncPaths(worktree);
    const relPath = normalizeFilePath(worktree, filePath);
    const symbols = readSymbolsManifest(worktree, syncPaths);

    const matchedRows = symbols.filter((s) => s.sourceFile === relPath);
    if (matchedRows.length === 0) return [];

    const targets: string[] = [];
    const seen = new Set<string>();

    for (const row of matchedRows) {
      for (const r of row.relationships ?? []) {
        if (relationshipTypes.includes(r.type) && !seen.has(r.target)) {
          seen.add(r.target);
          targets.push(r.target);
        }
      }
    }

    return targets;
  } catch {
    return [];
  }
}
