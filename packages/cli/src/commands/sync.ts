import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";
import { extractFromManifest } from "../extractors/manifest.js";
import {
  type ExtractionResult,
  extractFromMarkdown,
} from "../extractors/markdown.js";
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

  writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}
`, "utf8");
}

export async function syncCommand(): Promise<void> {
  try {
    // Load config (fall back to defaults if missing)
    const DEFAULT_CONFIG = {
      paths: {
        requirements: "requirements/**/*.md",
        scenarios: "scenarios/**/*.md",
        tests: "tests/**/*.md",
        adr: "adr/**/*.md",
        flags: "flags/**/*.md",
        events: "events/**/*.md",
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

    // Discover files
    const markdownPatterns = [
      paths.requirements,
      paths.scenarios,
      paths.tests,
      paths.adr,
      paths.flags,
      paths.events,
    ].filter(Boolean);

    const markdownFiles = await fg(markdownPatterns, {
      cwd: process.cwd(),
      absolute: true,
    });

    const manifestFiles = await fg(paths.symbols, {
      cwd: process.cwd(),
      absolute: true,
    });

    const sourceFiles = [...markdownFiles, ...manifestFiles].sort();
    const cachePath = path.join(process.cwd(), ".kb/sync-cache.json");
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

    let currentBranch = "main";
    try {
      const { execSync } = await import("node:child_process");
      currentBranch = execSync("git branch --show-current", {
        cwd: process.cwd(),
        encoding: "utf8",
      }).trim();
      if (!currentBranch) currentBranch = "main";
    } catch {
      currentBranch = "main";
    }

    const kbPath = path.join(process.cwd(), `.kb/branches/${currentBranch}`);
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
          `title="${entity.title.replace(/"/g, '\"')}"`,
          `status=${prologAtom(entity.status)}`,
          `created_at="${entity.created_at}"`,
          `updated_at="${entity.updated_at}"`,
          `source="${entity.source.replace(/"/g, '\"')}"`,
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
