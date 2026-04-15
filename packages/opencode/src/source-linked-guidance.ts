// implements REQ-opencode-smart-enforcement-v1
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { loadKbSyncPaths } from "./file-filter.js";

type SymbolsManifestRow = {
  id?: string;
  sourceFile?: string;
  links?: string[];
  relationships?: Array<{ type: string; target: string }>;
};

/**
 * Resolve the configured symbols manifest path using loadKbSyncPaths(worktree),
 * read the YAML synchronously, and return up to 3 deduped REQ IDs linked to
 * the edited file path. Preference is given to relationships[type=implements].target
 * (in file order) then static links as a fallback, preserving file order.
 *
 * Supports both YAML formats: top-level array and { symbols: [...] } object.
 * This function is purely synchronous and makes no runtime KB queries.
 */
// implements REQ-opencode-smart-enforcement-v1
export function getSourceLinkedRequirementIds(
  worktree: string,
  editedAbsolutePath: string,
): string[] {
  try {
    const paths = loadKbSyncPaths(worktree);
    const symbolsPathRaw = paths.symbols;
    if (!symbolsPathRaw) return [];

    const symbolsPath = path.isAbsolute(symbolsPathRaw)
      ? symbolsPathRaw
      : path.join(worktree, symbolsPathRaw);

    if (!existsSync(symbolsPath)) return [];

    const content = readFileSync(symbolsPath, "utf8");
    const symbols = parseSymbolsYaml(content);

    const relEdited = path
      .relative(worktree, editedAbsolutePath)
      .split(path.sep)
      .join("/");

    const matchedRows = symbols.filter((s) => s.sourceFile === relEdited);

    if (matchedRows.length === 0) return [];

    const seen = new Set<string>();
    const orderedIds: string[] = [];

    // First pass: collect implements relationships in file order
    for (const row of matchedRows) {
      for (const r of row.relationships ?? []) {
        if (r.type === "implements") {
          const id = r.target;
          if (!seen.has(id)) {
            seen.add(id);
            orderedIds.push(id);
            if (orderedIds.length >= 3) return orderedIds.slice(0, 3);
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
          if (orderedIds.length >= 3) return orderedIds.slice(0, 3);
        }
      }
    }

    return orderedIds.slice(0, 3);
  } catch {
    return [];
  }
}

// ── Lightweight YAML parser (symbols.yaml subset) ────────────────────
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

function parseSymbolsYaml(content: string): SymbolsManifestRow[] {
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
        continue;
      }
    }
  }

  flushEntry();
  return entries;
}
