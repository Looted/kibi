import { readFileSync } from "node:fs";
import * as path from "node:path";
import { getKbExistenceTargets, loadKbSyncPaths } from "./file-filter.js";

// ── Shared types ────────────────────────────────────────────────────

export function emptyLinkedTargets(): { ids: []; source: "none" } {
  return { ids: [], source: "none" };
}

export type SymbolsManifestRow = {
  id: string;
  sourceFile: string;
  links: string[];
  relationships: Array<{ type: string; target: string }>;
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
//
// Values are trimmed after capture, so the patterns need no `\s*` before
// them. Comment lines never match a pattern: every one starts with
// whitespace followed by a key or `-`.

type ParsedEntry = Omit<SymbolsManifestRow, "sourceFile"> & {
  sourceFile?: string;
};

export function parseSymbolsYaml(content: string): SymbolsManifestRow[] {
  const entries: SymbolsManifestRow[] = [];
  let current: ParsedEntry | undefined;
  let section: "links" | "relationships" | undefined;
  // The relationship that a following `target:` line completes. It is added
  // to the entry at once; incomplete ones are dropped when the entry ends.
  let rel: { type: string; target: string } | undefined;

  function flushEntry() {
    if (current?.id && current.sourceFile) {
      entries.push({
        id: current.id,
        sourceFile: current.sourceFile,
        links: current.links,
        relationships: current.relationships.filter(
          (r) => r.type !== "" && r.target !== "",
        ),
      });
    }
  }

  for (const raw of content.split(/\r?\n/)) {
    // New entry: "  - id: ..."
    const entryMatch = raw.match(/^\s+-\s+id:(.+)/);
    if (entryMatch) {
      flushEntry();
      current = {
        id: (entryMatch[1] as string).trim(),
        links: [],
        relationships: [],
      };
      section = undefined;
      continue;
    }

    if (!current) continue;

    const srcMatch = raw.match(/^\s+sourceFile:(.+)/);
    if (srcMatch) {
      current.sourceFile = (srcMatch[1] as string).trim();
      section = undefined;
      continue;
    }

    if (/^\s+links:\s*$/.test(raw)) {
      section = "links";
      continue;
    }

    if (/^\s+relationships:\s*$/.test(raw)) {
      section = "relationships";
      rel = undefined;
      continue;
    }

    if (section === "links") {
      // Link item: "      - REQ-xxx"
      const linkMatch = raw.match(/^\s+-\s+(REQ-[A-Za-z0-9_-]+)\s*$/);
      if (linkMatch) current.links.push(linkMatch[1] as string);
      continue;
    }

    if (section === "relationships") {
      // Relationship type: "      - type: implements"
      const relTypeMatch = raw.match(/^\s+-\s+type:(.+)/);
      if (relTypeMatch) {
        rel = { type: (relTypeMatch[1] as string).trim(), target: "" };
        current.relationships.push(rel);
        continue;
      }
      // Relationship target: "        target: REQ-..."
      const relTargetMatch = raw.match(/^\s+target:(.+)/);
      if (relTargetMatch && rel) {
        rel.target = (relTargetMatch[1] as string).trim();
      }
    }
  }

  flushEntry();
  return entries;
}

// ── Doc-path identity mapping ───────────────────────────────────────

const DOC_ENTITY_PATTERN =
  /^(REQ|SCEN|TEST|ADR|FLAG|EVT|FACT)-[A-Za-z0-9_-]+\.md$/;

function resolveDocPathIdentity(
  worktree: string,
  relPath: string,
): string | null {
  const basename = path.posix.basename(relPath);
  if (!DOC_ENTITY_PATTERN.test(basename)) return null;
  // The file must live under one of the entity document roots.
  const underDocRoot = getKbExistenceTargets(worktree).some(
    (target) =>
      target.kind === "dir" && relPath.startsWith(`${target.relativePath}/`),
  );
  return underDocRoot ? basename.slice(0, -".md".length) : null;
}

// ── Symbols file resolution ─────────────────────────────────────────

/** Rows of the symbols manifest for one file. A missing manifest throws,
 *  which the callers treat like a file without links. */
function readSymbolsRows(worktree: string, relPath: string) {
  const symbolsPath = path.join(worktree, loadKbSyncPaths(worktree).symbols);
  return parseSymbolsYaml(readFileSync(symbolsPath, "utf8")).filter(
    (row) => row.sourceFile === relPath,
  );
}

function normalizeFilePath(worktree: string, filePath: string): string {
  // Normalize to forward-slash relative path from worktree
  return path
    .relative(worktree, path.resolve(worktree, filePath))
    .split(path.sep)
    .join("/");
}

// ── Public API ──────────────────────────────────────────────────────

// Priority order: implements → covered_by → executable_for
const REL_PRIORITY = ["implements", "covered_by", "executable_for"];

export function getFileLinkedEntityIds(
  worktree: string,
  filePath: string,
): { ids: string[]; source: "symbols" | "doc-path" | "none" } {
  try {
    const relPath = normalizeFilePath(worktree, filePath);

    // Check doc-path identity first
    const docId = resolveDocPathIdentity(worktree, relPath);
    if (docId) {
      return { ids: [docId], source: "doc-path" };
    }

    const matchedRows = readSymbolsRows(worktree, relPath);
    if (matchedRows.length === 0) {
      return emptyLinkedTargets();
    }

    // Relationships grouped by priority type, preserving file order within
    // each type, then the static links; first occurrence wins.
    const ordered = new Set<string>();
    for (const priorityType of REL_PRIORITY) {
      for (const row of matchedRows) {
        for (const r of row.relationships) {
          if (r.type === priorityType) ordered.add(r.target);
        }
      }
    }
    for (const row of matchedRows) {
      for (const l of row.links) ordered.add(l);
    }

    return { ids: [...ordered].slice(0, 3), source: "symbols" };
  } catch {
    return emptyLinkedTargets();
  }
}

export function getFileLinkedTargetsByType(
  worktree: string,
  filePath: string,
  relationshipTypes: string[],
): string[] {
  try {
    const relPath = normalizeFilePath(worktree, filePath);
    const targets = new Set<string>();
    for (const row of readSymbolsRows(worktree, relPath)) {
      for (const r of row.relationships) {
        if (relationshipTypes.includes(r.type)) targets.add(r.target);
      }
    }
    return [...targets];
  } catch {
    return [];
  }
}
