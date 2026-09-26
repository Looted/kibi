// implements REQ-cursor-kibi-plugin-v1
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

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

type ManifestRow = {
  sourceFile: string;
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

  for (const row of rows) {
    for (const link of row.relationships) {
      if (link.type === "implements") remember(link.target);
    }
  }

  return ordered.slice(0, MAX_LINKED_REQUIREMENTS);
}

function toManifestPath(workspaceRoot: string, filePath: string): string {
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(workspaceRoot, filePath);
  return path.relative(workspaceRoot, absolute).split(path.sep).join("/");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Parse canonical YAML and keep only source files and typed relationships. */
// implements REQ-cursor-kibi-plugin-v1
export function parseSymbolsManifest(content: string): ManifestRow[] {
  let parsed: unknown;
  try {
    parsed = parseYaml(content);
  } catch {
    return [];
  }

  const symbols = asRecord(parsed)?.symbols;
  if (!Array.isArray(symbols)) return [];

  return symbols.flatMap((value): ManifestRow[] => {
    const symbol = asRecord(value);
    if (typeof symbol?.sourceFile !== "string") return [];

    const relationships = Array.isArray(symbol.relationships)
      ? symbol.relationships.flatMap((value) => {
          const relationship = asRecord(value);
          return typeof relationship?.type === "string" &&
            typeof relationship.target === "string"
            ? [{ type: relationship.type, target: relationship.target }]
            : [];
        })
      : [];

    return [{ sourceFile: symbol.sourceFile, relationships }];
  });
}
