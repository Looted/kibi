import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as fs from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";
import { dump as dumpYAML, load as parseYAML } from "js-yaml";
import { extractFromManifest } from "../extractors/manifest.js";
import {
  type ExtractionResult,
  extractFromMarkdown,
} from "../extractors/markdown.js";
import {
  type ManifestSymbolEntry,
  enrichSymbolCoordinates,
} from "../extractors/symbols-coordinator.js";
import { PrologProcess } from "../prolog.js";

export class SyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncError";
  }
}

type SyncCache = {
  version: 1;
  hashes: Record<string, string>;
  seenAt: Record<string, string>;
};

const SYNC_CACHE_VERSION = 1;
const SYNC_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SYMBOLS_MANIFEST_COMMENT_BLOCK = `# symbols.yaml
# AUTHORED fields (edit freely):
#   id, title, sourceFile, links, status, tags, owner, priority
# GENERATED fields (never edit manually — overwritten by kibi sync and kb.symbols.refresh):
#   sourceLine, sourceColumn, sourceEndLine, sourceEndColumn, coordinatesGeneratedAt
# Run \`kibi sync\` or call the \`kb.symbols.refresh\` MCP tool to refresh coordinates.
`;
const SYMBOL_COORD_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);
const GENERATED_COORD_FIELDS = [
  "sourceLine",
  "sourceColumn",
  "sourceEndLine",
  "sourceEndColumn",
  "coordinatesGeneratedAt",
] as const;

function toCacheKey(filePath: string): string {
  return path.relative(process.cwd(), filePath).split(path.sep).join("/");
}

function hashFile(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

function readSyncCache(cachePath: string): SyncCache {
  if (!existsSync(cachePath)) {
    return {
      version: SYNC_CACHE_VERSION,
      hashes: {},
      seenAt: {},
    };
  }

  try {
    const parsed = JSON.parse(
      readFileSync(cachePath, "utf8"),
    ) as Partial<SyncCache>;
    if (parsed.version !== SYNC_CACHE_VERSION) {
      return {
        version: SYNC_CACHE_VERSION,
        hashes: {},
        seenAt: {},
      };
    }

    return {
      version: SYNC_CACHE_VERSION,
      hashes: parsed.hashes ?? {},
      seenAt: parsed.seenAt ?? {},
    };
  } catch {
    return {
      version: SYNC_CACHE_VERSION,
      hashes: {},
      seenAt: {},
    };
  }
}

function writeSyncCache(cachePath: string, cache: SyncCache): void {
  const cacheDir = path.dirname(cachePath);
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }

  writeFileSync(
    cachePath,
    `${JSON.stringify(cache, null, 2)}
`,
    "utf8",
  );
}

export async function syncCommand(): Promise<void> {
  try {
    // Detect current branch early (needed for cache and KB paths)
    let currentBranch = "main";
    try {
      const { execSync } = await import("node:child_process");
      const branch = execSync("git branch --show-current", {
        cwd: process.cwd(),
        encoding: "utf8",
      }).trim();
      if (branch && branch !== "master") {
        currentBranch = branch;
      }
    } catch {
      currentBranch = "main";
    }

    // Load config (fall back to defaults if missing)
    const DEFAULT_CONFIG = {
      paths: {
        requirements: "requirements",
        scenarios: "scenarios",
        tests: "tests",
        adr: "adr",
        flags: "flags",
        events: "events",
        symbols: "symbols.yaml",
      },
    };

    type SyncConfig = {
      paths: Record<string, string>;
    };

    const configPath = path.join(process.cwd(), ".kb/config.json");
    let config: SyncConfig;
    try {
      const parsed = JSON.parse(
        readFileSync(configPath, "utf8"),
      ) as Partial<SyncConfig>;
      config = {
        paths: {
          ...DEFAULT_CONFIG.paths,
          ...(parsed.paths ?? {}),
        },
      };
    } catch {
      config = DEFAULT_CONFIG;
    }
    const paths = config.paths;

    // Discover files - construct glob patterns from directory paths
    const markdownPatterns = [
      paths.requirements ? `${paths.requirements}/**/*.md` : null,
      paths.scenarios ? `${paths.scenarios}/**/*.md` : null,
      paths.tests ? `${paths.tests}/**/*.md` : null,
      paths.adr ? `${paths.adr}/**/*.md` : null,
      paths.flags ? `${paths.flags}/**/*.md` : null,
      paths.events ? `${paths.events}/**/*.md` : null,
    ].filter((p): p is string => Boolean(p));

    const markdownFiles = await fg(markdownPatterns, {
      cwd: process.cwd(),
      absolute: true,
    });

    const manifestFiles = await fg(paths.symbols, {
      cwd: process.cwd(),
      absolute: true,
    });

    const sourceFiles = [...markdownFiles, ...manifestFiles].sort();
    // Use branch-specific cache to handle branch isolation correctly
    const cachePath = path.join(
      process.cwd(),
      `.kb/branches/${currentBranch}/sync-cache.json`,
    );
    const syncCache = readSyncCache(cachePath);
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    const nextHashes: Record<string, string> = {};
    const nextSeenAt: Record<string, string> = {};
    const changedMarkdownFiles: string[] = [];
    const changedManifestFiles: string[] = [];

    for (const file of sourceFiles) {
      try {
        const key = toCacheKey(file);
        const hash = hashFile(file);
        const lastSeen = syncCache.seenAt[key];
        const lastSeenMs = lastSeen ? Date.parse(lastSeen) : Number.NaN;
        const expired = Number.isNaN(lastSeenMs)
          ? false
          : nowMs - lastSeenMs > SYNC_CACHE_TTL_MS;

        nextHashes[key] = hash;
        nextSeenAt[key] = nowIso;

        if (expired || syncCache.hashes[key] !== hash) {
          if (markdownFiles.includes(file)) {
            changedMarkdownFiles.push(file);
          } else {
            changedManifestFiles.push(file);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Failed to hash ${file}: ${message}`);
      }
    }

    const results: ExtractionResult[] = [];
    const failedCacheKeys = new Set<string>();

    for (const file of changedMarkdownFiles) {
      try {
        results.push(extractFromMarkdown(file));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Failed to extract from ${file}: ${message}`);
        failedCacheKeys.add(toCacheKey(file));
      }
    }

    for (const file of changedManifestFiles) {
      try {
        const manifestResults = extractFromManifest(file);
        results.push(...manifestResults);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Failed to extract from ${file}: ${message}`);
        failedCacheKeys.add(toCacheKey(file));
      }
    }

    for (const file of manifestFiles) {
      try {
        await refreshManifestCoordinates(file, process.cwd());
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `Warning: Failed to refresh symbol coordinates in ${file}: ${message}`,
        );
      }
    }

    if (results.length === 0) {
      const evictedHashes: Record<string, string> = {};
      const evictedSeenAt: Record<string, string> = {};

      for (const [key, hash] of Object.entries(nextHashes)) {
        if (failedCacheKeys.has(key)) {
          continue;
        }
        evictedHashes[key] = hash;
        evictedSeenAt[key] = nextSeenAt[key] ?? nowIso;
      }

      writeSyncCache(cachePath, {
        version: SYNC_CACHE_VERSION,
        hashes: evictedHashes,
        seenAt: evictedSeenAt,
      });

      console.log("✓ Imported 0 entities, 0 relationships");
      process.exit(0);
    }

    // Connect to KB
    const prolog = new PrologProcess();
    await prolog.start();

    const kbPath = path.join(process.cwd(), `.kb/branches/${currentBranch}`);
    const mainPath = path.join(process.cwd(), ".kb/branches/main");

    // If branch KB doesn't exist but main does, copy from main (copy-on-write)
    // Skip for orphan branches (branches with no commits yet)
    if (!existsSync(kbPath) && existsSync(mainPath)) {
      const hasCommits = (() => {
        try {
          const { execSync } = require("node:child_process");
          execSync("git rev-parse HEAD", { cwd: process.cwd(), stdio: "pipe" });
          return true;
        } catch {
          return false;
        }
      })();
      if (hasCommits) {
        fs.cpSync(mainPath, kbPath, { recursive: true });
      }
    }

    const attachResult = await prolog.query(`kb_attach('${kbPath}')`);

    if (!attachResult.success) {
      await prolog.terminate();
      throw new SyncError(
        `Failed to attach KB: ${attachResult.error || "Unknown error"}`,
      );
    }

    // Upsert entities
    let entityCount = 0;
    let kbModified = false;
    for (const { entity } of results) {
      try {
        const simplePrologAtom = /^[a-z][a-zA-Z0-9_]*$/;
        const prologAtom = (value: string): string =>
          simplePrologAtom.test(value)
            ? value
            : `'${value.replace(/'/g, "''")}'`;

        const props = [
          `id='${entity.id}'`,
          `title="${entity.title.replace(/"/g, '"')}"`,
          `status=${prologAtom(entity.status)}`,
          `created_at="${entity.created_at}"`,
          `updated_at="${entity.updated_at}"`,
          `source="${entity.source.replace(/"/g, '"')}"`,
        ];

        if (entity.tags && entity.tags.length > 0) {
          const tagsList = entity.tags.map(prologAtom).join(",");
          props.push(`tags=[${tagsList}]`);
        }
        if (entity.owner) props.push(`owner=${prologAtom(entity.owner)}`);
        if (entity.priority)
          props.push(`priority=${prologAtom(entity.priority)}`);
        if (entity.severity)
          props.push(`severity=${prologAtom(entity.severity)}`);
        if (entity.text_ref) props.push(`text_ref="${entity.text_ref}"`);

        const propsList = `[${props.join(", ")}]`;
        const goal = `kb_assert_entity(${entity.type}, ${propsList})`;
        const result = await prolog.query(goal);
        if (result.success) {
          entityCount++;
          kbModified = true;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `Warning: Failed to upsert entity ${entity.id}: ${message}`,
        );
      }
    }

    // Build ID lookup map: filename -> entity ID
    const idLookup = new Map<string, string>();
    for (const { entity } of results) {
      const filename = path.basename(entity.source, ".md");
      idLookup.set(filename, entity.id);
      idLookup.set(entity.id, entity.id);
    }

    // Assert relationships
    let relCount = 0;
    for (const { relationships } of results) {
      for (const rel of relationships) {
        try {
          const fromId = idLookup.get(rel.from) || rel.from;
          const toId = idLookup.get(rel.to) || rel.to;

          const goal = `kb_assert_relationship(${rel.type}, '${fromId}', '${toId}', [])`;
          const result = await prolog.query(goal);
          if (result.success) {
            relCount++;
            kbModified = true;
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.warn(
            `Warning: Failed to assert relationship ${rel.type}: ${rel.from} -> ${rel.to}: ${message}`,
          );
        }
      }
    }

    if (kbModified) {
      prolog.invalidateCache();
    }

    // Save KB and detach
    await prolog.query("kb_save");
    await prolog.query("kb_detach");
    await prolog.terminate();

    const evictedHashes: Record<string, string> = {};
    const evictedSeenAt: Record<string, string> = {};

    for (const [key, hash] of Object.entries(nextHashes)) {
      if (failedCacheKeys.has(key)) {
        continue;
      }
      evictedHashes[key] = hash;
      evictedSeenAt[key] = nextSeenAt[key] ?? nowIso;
    }

    writeSyncCache(cachePath, {
      version: SYNC_CACHE_VERSION,
      hashes: evictedHashes,
      seenAt: evictedSeenAt,
    });

    console.log(
      `✓ Imported ${entityCount} entities, ${relCount} relationships`,
    );
    process.exit(0);
  } catch (error) {
    if (error instanceof SyncError) {
      console.error(`Error: ${error.message}`);
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error(`Error: ${String(error)}`);
    }
    process.exit(1);
  }
}

async function refreshManifestCoordinates(
  manifestPath: string,
  workspaceRoot: string,
): Promise<void> {
  const rawContent = readFileSync(manifestPath, "utf8");
  const parsed = parseYAML(rawContent);

  if (!isRecord(parsed)) {
    console.warn(
      `Warning: symbols manifest ${manifestPath} is not a YAML object; skipping coordinate refresh`,
    );
    return;
  }

  const rawSymbols = parsed.symbols;
  if (!Array.isArray(rawSymbols)) {
    console.warn(
      `Warning: symbols manifest ${manifestPath} has no symbols array; skipping coordinate refresh`,
    );
    return;
  }

  const before = rawSymbols.map((entry) =>
    isRecord(entry)
      ? ({ ...entry } as ManifestSymbolEntry)
      : ({} as ManifestSymbolEntry),
  );
  const enriched = await enrichSymbolCoordinates(before, workspaceRoot);
  parsed.symbols = enriched;

  let refreshed = 0;
  let failed = 0;
  let unchanged = 0;

  for (let i = 0; i < before.length; i++) {
    const previous = before[i] ?? ({} as ManifestSymbolEntry);
    const current = enriched[i] ?? previous;
    const changed = GENERATED_COORD_FIELDS.some(
      (field) => previous[field] !== current[field],
    );

    if (changed) {
      refreshed++;
      continue;
    }

    const eligible = isEligibleForCoordinateRefresh(
      typeof current.sourceFile === "string"
        ? current.sourceFile
        : typeof previous.sourceFile === "string"
          ? previous.sourceFile
          : undefined,
      workspaceRoot,
    );

    if (eligible && !hasAllGeneratedCoordinates(current)) {
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
  const nextContent = `${SYMBOLS_MANIFEST_COMMENT_BLOCK}${dumped}`;

  if (rawContent !== nextContent) {
    writeFileSync(manifestPath, nextContent, "utf8");
  }

  console.log(
    `✓ Refreshed symbol coordinates in ${path.relative(workspaceRoot, manifestPath)} (refreshed=${refreshed}, unchanged=${unchanged}, failed=${failed})`,
  );
}

function hasAllGeneratedCoordinates(entry: ManifestSymbolEntry): boolean {
  return (
    typeof entry.sourceLine === "number" &&
    typeof entry.sourceColumn === "number" &&
    typeof entry.sourceEndLine === "number" &&
    typeof entry.sourceEndColumn === "number" &&
    typeof entry.coordinatesGeneratedAt === "string" &&
    entry.coordinatesGeneratedAt.length > 0
  );
}

function isEligibleForCoordinateRefresh(
  sourceFile: string | undefined,
  workspaceRoot: string,
): boolean {
  if (!sourceFile) return false;
  const absolute = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(workspaceRoot, sourceFile);

  if (!existsSync(absolute)) return false;
  const ext = path.extname(absolute).toLowerCase();
  return SYMBOL_COORD_EXTENSIONS.has(ext);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
