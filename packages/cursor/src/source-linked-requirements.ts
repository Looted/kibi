// implements REQ-cursor-kibi-plugin-v1
import fs from "node:fs";
import path from "node:path";

/**
 * Resolve the requirements a source file already implements, from the symbol
 * manifest alone.
 *
 * Pre-edit guidance runs inside the hook that gates the edit, so it must stay
 * synchronous and must not call the KB. Reading the manifest keeps the message
 * concrete — it can name the requirements the agent is about to change —
 * without adding a blocking query to every edit.
 */

// Must stay in sync with packages/cli/src/utils/kb-paths.ts
// CANONICAL_ENTITY_PATHS.
const SYMBOLS_MANIFEST_PATH = ".kb/symbols.yaml";

const MAX_LINKED_REQUIREMENTS = 3;

const OWNERSHIP_RELATIONSHIPS = ["implements", "covered_by", "executable_for"];

type ManifestRow = {
  sourceFile?: string;
  links: string[];
  relationships: { type: string; target: string }[];
};

export function getSourceLinkedRequirementIds(
  workspaceRoot: string,
  editedPath: string,
): string[] {
  let content: string;
  try {
    content = fs.readFileSync(
      path.join(workspaceRoot, SYMBOLS_MANIFEST_PATH),
      "utf8",
    );
  } catch {
    return [];
  }

  const relativePath = toManifestPath(workspaceRoot, editedPath);
  const rows = parseSymbolsManifest(content).filter(
    (row) => row.sourceFile === relativePath,
  );
  if (rows.length === 0) return [];

  const ordered: string[] = [];
  const seen = new Set<string>();
  const remember = (id: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    ordered.push(id);
  };

  for (const relationship of OWNERSHIP_RELATIONSHIPS) {
    for (const row of rows) {
      for (const link of row.relationships) {
        if (link.type === relationship) remember(link.target);
      }
    }
  }
  for (const row of rows) {
    for (const link of row.links) remember(link);
  }

  return ordered.slice(0, MAX_LINKED_REQUIREMENTS);
}

function toManifestPath(workspaceRoot: string, filePath: string): string {
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(workspaceRoot, filePath);
  return path.relative(workspaceRoot, absolute).split(path.sep).join("/");
}

/**
 * Parse the subset of `symbols.yaml` this guidance needs: each entry's
 * `sourceFile`, its `links`, and its `relationships` type/target pairs.
 */
// implements REQ-cursor-kibi-plugin-v1
export function parseSymbolsManifest(content: string): ManifestRow[] {
  const rows: ManifestRow[] = [];
  let current: ManifestRow | null = null;
  let section: "none" | "links" | "relationships" = "none";
  let pendingType: string | null = null;

  for (const line of content.split("\n")) {
    if (line.trim().startsWith("#")) continue;

    if (/^\s+-\s+id:\s*\S/.test(line)) {
      current = { links: [], relationships: [] };
      rows.push(current);
      section = "none";
      pendingType = null;
      continue;
    }
    if (!current) continue;

    const sourceFile = line.match(/^\s+sourceFile:\s*(.+)$/);
    if (sourceFile?.[1]) {
      current.sourceFile = sourceFile[1].trim();
      section = "none";
      continue;
    }
    if (/^\s+links:\s*$/.test(line)) {
      section = "links";
      pendingType = null;
      continue;
    }
    if (/^\s+relationships:\s*$/.test(line)) {
      section = "relationships";
      pendingType = null;
      continue;
    }

    if (section === "links") {
      const link = line.match(/^\s+-\s+([A-Za-z]+-[A-Za-z0-9_-]+)\s*$/);
      if (link?.[1]) current.links.push(link[1]);
      continue;
    }

    if (section === "relationships") {
      const type = line.match(/^\s+-\s+type:\s*(.+)$/);
      if (type?.[1]) {
        pendingType = type[1].trim();
        continue;
      }
      const target = line.match(/^\s+target:\s*(.+)$/);
      if (target?.[1] && pendingType) {
        current.relationships.push({
          type: pendingType,
          target: target[1].trim(),
        });
        pendingType = null;
      }
    }
  }

  return rows;
}
