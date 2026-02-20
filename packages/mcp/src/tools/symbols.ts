import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  type ManifestSymbolEntry as CliManifestSymbolEntry,
  enrichSymbolCoordinates,
} from "@kibi/cli/src/extractors/symbols-coordinator.js";
import { dump as dumpYAML, load as parseYAML } from "js-yaml";

export interface SymbolsRefreshArgs {
  dryRun?: boolean;
}

export interface SymbolsRefreshResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: {
    refreshed: number;
    failed: number;
    unchanged: number;
    dryRun: boolean;
  };
}

interface ManifestSymbolEntry {
  id?: string;
  title?: string;
  sourceFile?: string;
  sourceLine?: number;
  sourceColumn?: number;
  sourceEndLine?: number;
  sourceEndColumn?: number;
  coordinatesGeneratedAt?: string;
  [key: string]: unknown;
}

const COMMENT_BLOCK = `# symbols.yaml
# AUTHORED fields (edit freely):
#   id, title, sourceFile, links, status, tags, owner, priority
# GENERATED fields (never edit manually — overwritten by kibi sync and kb.symbols.refresh):
#   sourceLine, sourceColumn, sourceEndLine, sourceEndColumn, coordinatesGeneratedAt
# Run \`kibi sync\` or call the \`kb.symbols.refresh\` MCP tool to refresh coordinates.
`;

const GENERATED_COORD_FIELDS = [
  "sourceLine",
  "sourceColumn",
  "sourceEndLine",
  "sourceEndColumn",
  "coordinatesGeneratedAt",
] as const;

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);

export async function handleKbSymbolsRefresh(
  args: SymbolsRefreshArgs,
): Promise<SymbolsRefreshResult> {
  const dryRun = args.dryRun === true;
  const workspaceRoot = process.cwd();
  const manifestPath = resolveManifestPath(workspaceRoot);

  const rawContent = readFileSync(manifestPath, "utf8");
  const parsed = parseYAML(rawContent);

  if (!isRecord(parsed) || !Array.isArray(parsed.symbols)) {
    throw new Error(`Invalid symbols manifest at ${manifestPath}`);
  }

  const original = parsed.symbols.map((entry) =>
    isRecord(entry) ? ({ ...entry } as ManifestSymbolEntry) : ({} as ManifestSymbolEntry),
  );
  const entriesForEnrichment: CliManifestSymbolEntry[] = original.map((entry) => ({
    ...entry,
    id: typeof entry.id === "string" ? entry.id : "",
    title: typeof entry.title === "string" ? entry.title : "",
  }));
  const enriched = await enrichSymbolCoordinates(entriesForEnrichment, workspaceRoot);
  parsed.symbols = enriched;

  let refreshed = 0;
  let failed = 0;
  let unchanged = 0;

  for (let i = 0; i < original.length; i++) {
    const before = original[i] ?? ({} as ManifestSymbolEntry);
    const after = enriched[i] ?? before;

    const changed = GENERATED_COORD_FIELDS.some(
      (field) => before[field] !== after[field],
    );

    if (changed) {
      refreshed++;
      continue;
    }

    const source =
      typeof after.sourceFile === "string"
        ? after.sourceFile
        : typeof before.sourceFile === "string"
          ? before.sourceFile
          : undefined;

    const eligible = isEligible(source, workspaceRoot);
    if (eligible && !hasGeneratedCoordinates(after)) {
      failed++;
    } else {
      unchanged++;
    }
  }

  const dumped = dumpYAML(parsed, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
  const nextContent = `${COMMENT_BLOCK}${dumped}`;

  if (!dryRun && rawContent !== nextContent) {
    writeFileSync(manifestPath, nextContent, "utf8");
  }

  return {
    content: [
      {
        type: "text",
        text: `kb.symbols.refresh ${dryRun ? "(dry run) " : ""}completed for ${path.relative(workspaceRoot, manifestPath)}: refreshed=${refreshed}, unchanged=${unchanged}, failed=${failed}`,
      },
    ],
    structuredContent: {
      refreshed,
      failed,
      unchanged,
      dryRun,
    },
  };
}

export async function refreshCoordinatesForSymbolId(
  symbolId: string,
  workspaceRoot: string = process.cwd(),
): Promise<{ refreshed: boolean; found: boolean }> {
  const manifestPath = resolveManifestPath(workspaceRoot);
  const rawContent = readFileSync(manifestPath, "utf8");
  const parsed = parseYAML(rawContent);

  if (!isRecord(parsed) || !Array.isArray(parsed.symbols)) {
    return { refreshed: false, found: false };
  }

  const symbols = parsed.symbols.map((entry) =>
    isRecord(entry) ? ({ ...entry } as ManifestSymbolEntry) : ({} as ManifestSymbolEntry),
  );

  const index = symbols.findIndex((entry) => entry.id === symbolId);
  if (index < 0) {
    return { refreshed: false, found: false };
  }

  const original = symbols[index] ?? {};
  const singleEntry: CliManifestSymbolEntry = {
    ...(original as ManifestSymbolEntry),
    id:
      typeof (original as ManifestSymbolEntry).id === "string"
        ? ((original as ManifestSymbolEntry).id as string)
        : "",
    title:
      typeof (original as ManifestSymbolEntry).title === "string"
        ? ((original as ManifestSymbolEntry).title as string)
        : "",
  };
  const [enriched] = await enrichSymbolCoordinates([singleEntry], workspaceRoot);

  symbols[index] = enriched ?? (original as ManifestSymbolEntry);
  parsed.symbols = symbols;

  const refreshed = GENERATED_COORD_FIELDS.some(
    (field) => (original as ManifestSymbolEntry)[field] !== symbols[index][field],
  );

  const dumped = dumpYAML(parsed, {
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
  const nextContent = `${COMMENT_BLOCK}${dumped}`;

  if (rawContent !== nextContent) {
    writeFileSync(manifestPath, nextContent, "utf8");
  }

  return { refreshed, found: true };
}

function resolveManifestPath(workspaceRoot: string): string {
  const configPath = path.join(workspaceRoot, ".kb", "config.json");
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, "utf8")) as {
        symbolsManifest?: string;
      };
      if (config.symbolsManifest) {
        return path.isAbsolute(config.symbolsManifest)
          ? config.symbolsManifest
          : path.resolve(workspaceRoot, config.symbolsManifest);
      }
    } catch {}
  }

  const candidates = [
    path.join(workspaceRoot, "symbols.yaml"),
    path.join(workspaceRoot, "symbols.yml"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

function hasGeneratedCoordinates(entry: ManifestSymbolEntry): boolean {
  return (
    typeof entry.sourceLine === "number" &&
    typeof entry.sourceColumn === "number" &&
    typeof entry.sourceEndLine === "number" &&
    typeof entry.sourceEndColumn === "number" &&
    typeof entry.coordinatesGeneratedAt === "string" &&
    entry.coordinatesGeneratedAt.length > 0
  );
}

function isEligible(sourceFile: string | undefined, workspaceRoot: string): boolean {
  if (!sourceFile) return false;

  const absolute = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(workspaceRoot, sourceFile);
  if (!existsSync(absolute)) return false;

  return SOURCE_EXTENSIONS.has(path.extname(absolute).toLowerCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
