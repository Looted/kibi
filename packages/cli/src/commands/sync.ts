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
*/
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";
import { dump as dumpYAML, load as parseYAML } from "js-yaml";
import { extractFromManifest } from "../extractors/manifest.js";
import {
  type ExtractedRelationship,
  type ExtractionResult,
  FrontmatterError,
  extractFromMarkdown,
} from "../extractors/markdown.js";

import { copyFileSync } from "node:fs";
import {
  type Diagnostic,
  type SyncSummary,
  branchErrorToDiagnostic,
  createDocsNotIndexedDiagnostic,
  createInvalidAuthoringDiagnostic,
  createKbMissingDiagnostic,
  formatSyncSummary,
} from "../diagnostics.js";
import {
  type ManifestSymbolEntry,
  enrichSymbolCoordinates,
} from "../extractors/symbols-coordinator.js";
import { PrologProcess } from "../prolog.js";
import {
  copyCleanSnapshot,
  getBranchDiagnostic,
  resolveActiveBranch,
} from "../utils/branch-resolver.js";
import { loadSyncConfig } from "../utils/config.js";

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

function copySyncCache(livePath: string, stagingPath: string): void {
  const liveCachePath = path.join(livePath, "sync-cache.json");
  const stagingCachePath = path.join(stagingPath, "sync-cache.json");

  if (existsSync(liveCachePath)) {
    const cacheContent = readFileSync(liveCachePath, "utf8");
    writeFileSync(stagingCachePath, cacheContent, "utf8");
  }
}

async function copySchemaToStaging(stagingPath: string): Promise<void> {
  const possibleSchemaPaths = [
    path.resolve(process.cwd(), "node_modules", "kibi-cli", "schema"),
    path.resolve(process.cwd(), "..", "..", "schema"),
    path.resolve(import.meta.dirname || __dirname, "..", "..", "schema"),
    path.resolve(process.cwd(), "packages", "cli", "schema"),
  ];

  let schemaSourceDir: string | null = null;
  for (const p of possibleSchemaPaths) {
    if (existsSync(p)) {
      schemaSourceDir = p;
      break;
    }
  }

  if (!schemaSourceDir) {
    return;
  }

  const schemaFiles = await fg("*.pl", {
    cwd: schemaSourceDir,
    absolute: false,
  });

  const schemaDestDir = path.join(stagingPath, "schema");
  if (!existsSync(schemaDestDir)) {
    mkdirSync(schemaDestDir, { recursive: true });
  }

  for (const file of schemaFiles) {
    const sourcePath = path.join(schemaSourceDir, file);
    const destPath = path.join(schemaDestDir, file);
    copyFileSync(sourcePath, destPath);
  }
}

async function validateStagingKB(stagingPath: string): Promise<boolean> {
  const prolog = new PrologProcess({ timeout: 60000 });
  await prolog.start();

  try {
    const attachResult = await prolog.query(`kb_attach('${stagingPath}')`);
    if (!attachResult.success) {
      console.error(`Failed to attach to staging KB: ${attachResult.error}`);
      return false;
    }

    await prolog.query("kb_detach");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Validation error: ${message}`);
    return false;
  } finally {
    await prolog.terminate();
  }
}

function atomicPublish(stagingPath: string, livePath: string): void {
  const liveParent = path.dirname(livePath);
  if (!existsSync(liveParent)) {
    mkdirSync(liveParent, { recursive: true });
  }

  if (existsSync(livePath)) {
    const tempPath = `${livePath}.old.${Date.now()}`;
    renameSync(livePath, tempPath);
    renameSync(stagingPath, livePath);
    rmSync(tempPath, { recursive: true, force: true });
  } else {
    renameSync(stagingPath, livePath);
  }
}

function cleanupStaging(stagingPath: string): void {
  if (existsSync(stagingPath)) {
    rmSync(stagingPath, { recursive: true, force: true });
  }
}

export async function syncCommand(
  options: {
    validateOnly?: boolean;
    rebuild?: boolean;
  } = {},
): Promise<SyncSummary> {
  const validateOnly = options.validateOnly ?? false;
  const rebuild = options.rebuild ?? false;
  const startTime = Date.now();
  const diagnostics: Diagnostic[] = [];
  const entityCounts: Record<string, number> = {};
  const relationshipCount = 0;
  let published = false;
  let currentBranch: string | undefined;

  const getCurrentCommit = (): string | undefined => {
    try {
      return execSync("git rev-parse HEAD", {
        cwd: process.cwd(),
        encoding: "utf8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
    } catch {
      return undefined;
    }
  };

  try {
    const branchResult = resolveActiveBranch(process.cwd());

    if ("error" in branchResult) {
      const diagnostic = branchErrorToDiagnostic(
        branchResult.code,
        branchResult.error,
      );
      diagnostics.push(diagnostic);
      console.error(getBranchDiagnostic(undefined, branchResult.error));
      throw new SyncError(
        `Failed to resolve active branch: ${branchResult.error}`,
      );
    }

    currentBranch = branchResult.branch;

    if (process.env.KIBI_DEBUG) {
      try {
        // eslint-disable-next-line no-console
        console.log("[kibi-debug] currentBranch:", currentBranch);
      } catch {}
    }

    // Load config using shared loader
    const config = loadSyncConfig(process.cwd());
    const paths = config.paths;

    // Discover files - construct glob patterns from directory paths
    const normalizeMarkdownPath = (
      pattern: string | undefined,
    ): string | null => {
      if (!pattern) return null;
      if (pattern.includes("*")) return pattern;
      return `${pattern}/**/*.md`;
    };

    const markdownPatterns = [
      normalizeMarkdownPath(paths.requirements),
      normalizeMarkdownPath(paths.scenarios),
      normalizeMarkdownPath(paths.tests),
      normalizeMarkdownPath(paths.adr),
      normalizeMarkdownPath(paths.flags),
      normalizeMarkdownPath(paths.events),
      normalizeMarkdownPath(paths.facts),
    ].filter((p): p is string => Boolean(p));

    const markdownFiles = await fg(markdownPatterns, {
      cwd: process.cwd(),
      absolute: true,
    });

    if (process.env.KIBI_DEBUG) {
      try {
        // eslint-disable-next-line no-console
        console.log("[kibi-debug] markdownPatterns:", markdownPatterns);
        // eslint-disable-next-line no-console
        console.log("[kibi-debug] markdownFiles:", markdownFiles);
      } catch {}
    }

    const manifestFiles = paths.symbols
      ? await fg(paths.symbols, {
          cwd: process.cwd(),
          absolute: true,
        })
      : [];

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

        if (expired || syncCache.hashes[key] !== hash || validateOnly) {
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
    const errors: { file: string; message: string }[] = [];

    for (const file of changedMarkdownFiles) {
      try {
        results.push(extractFromMarkdown(file));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        // Handle INVALID_AUTHORING diagnostics for embedded entities
        if (
          error instanceof FrontmatterError &&
          error.classification === "Embedded Entity Violation"
        ) {
          const embeddedTypes =
            message.includes("scenario") && message.includes("test")
              ? ["scenario", "test"]
              : message.includes("scenario")
                ? ["scenario"]
                : message.includes("test")
                  ? ["test"]
                  : ["entity"];
          diagnostics.push(
            createInvalidAuthoringDiagnostic(file, embeddedTypes),
          );
        }

        if (validateOnly) {
          errors.push({ file, message });
        } else {
          console.warn(`Warning: Failed to extract from ${file}: ${message}`);
        }
        failedCacheKeys.add(toCacheKey(file));
      }
    }

    for (const file of changedManifestFiles) {
      try {
        const manifestResults = extractFromManifest(file);
        results.push(...manifestResults);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (validateOnly) {
          errors.push({ file, message });
        } else {
          console.warn(`Warning: Failed to extract from ${file}: ${message}`);
        }
        failedCacheKeys.add(toCacheKey(file));
      }
    }

    if (validateOnly) {
      if (errors.length > 0) {
        for (const err of errors) {
          console.error(`${err.file}: ${err.message}`);
        }
        console.error(`FAILED: ${errors.length} errors found`);
        process.exit(1);
      } else {
        console.log(`OK: Validation passed (${results.length} entities)`);
        process.exit(0);
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

    if (results.length === 0 && !rebuild) {
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

      console.log("✓ Imported 0 entities, 0 relationships (no changes)");
      process.exit(0);
    }

    const livePath = path.join(process.cwd(), `.kb/branches/${currentBranch}`);

    // Check if KB exists (for diagnostic purposes)
    const kbExists = existsSync(livePath);
    if (!kbExists && !rebuild) {
      diagnostics.push(createKbMissingDiagnostic(currentBranch, livePath));
    }

    const stagingPath = path.join(
      process.cwd(),
      `.kb/branches/${currentBranch}.staging`,
    );

    cleanupStaging(stagingPath);

    mkdirSync(stagingPath, { recursive: true });

    try {
      if (!rebuild) {
        const mainPath = path.join(process.cwd(), ".kb/branches/main");
        const sourcePath = existsSync(livePath)
          ? livePath
          : existsSync(mainPath) && currentBranch !== "main"
            ? mainPath
            : null;

        if (sourcePath) {
          const hasCommits = (() => {
            try {
              const { execSync } = require("node:child_process");
              execSync("git rev-parse HEAD", {
                cwd: process.cwd(),
                stdio: "pipe",
              });
              return true;
            } catch {
              return false;
            }
          })();
          if (hasCommits) {
            copyCleanSnapshot(sourcePath, stagingPath);
            copySyncCache(sourcePath, stagingPath);
          } else {
            await copySchemaToStaging(stagingPath);
          }
        } else {
          await copySchemaToStaging(stagingPath);
        }
      } else {
        await copySchemaToStaging(stagingPath);
      }

      const prolog = new PrologProcess({ timeout: 120000 });
      await prolog.start();

      const attachResult = await prolog.query(`kb_attach('${stagingPath}')`);

      if (!attachResult.success) {
        await prolog.terminate();
        throw new SyncError(
          `Failed to attach to staging KB: ${attachResult.error || "Unknown error"}`,
        );
      }

      let entityCount = 0;
      let kbModified = false;

      // Track entity counts by type
      for (const { entity } of results) {
        entityCounts[entity.type] = (entityCounts[entity.type] || 0) + 1;
      }
      const simplePrologAtom = /^[a-z][a-zA-Z0-9_]*$/;
      const prologAtom = (value: string): string =>
        simplePrologAtom.test(value) ? value : `'${value.replace(/'/g, "''")}'`;

      for (const { entity } of results) {
        try {
          const props = [
            `id='${entity.id}'`,
            `title="${entity.title.replace(/"/g, '\\"')}"`,
            `status=${prologAtom(entity.status)}`,
            `created_at="${entity.created_at}"`,
            `updated_at="${entity.updated_at}"`,
            `source="${entity.source.replace(/"/g, '\\"')}"`,
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
          const message =
            error instanceof Error ? error.message : String(error);
          console.warn(
            `Warning: Failed to upsert entity ${entity.id}: ${message}`,
          );
        }
      }

      const idLookup = new Map<string, string>();
      for (const { entity } of results) {
        const filename = path.basename(entity.source, ".md");
        idLookup.set(filename, entity.id);
        idLookup.set(entity.id, entity.id);
      }

      let relCount = 0;
      const failedRelationships: Array<{
        rel: ExtractedRelationship;
        fromId: string;
        toId: string;
        error: string;
      }> = [];

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
            } else {
              failedRelationships.push({
                rel,
                fromId,
                toId,
                error: result.error || "Unknown error",
              });
            }
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            const fromId = idLookup.get(rel.from) || rel.from;
            const toId = idLookup.get(rel.to) || rel.to;
            failedRelationships.push({ rel, fromId, toId, error: message });
          }
        }
      }

      const retryCount = 3;
      for (
        let pass = 0;
        pass < retryCount && failedRelationships.length > 0;
        pass++
      ) {
        const remainingFailed: typeof failedRelationships = [];

        for (const { rel, fromId, toId } of failedRelationships) {
          try {
            const goal = `kb_assert_relationship(${rel.type}, '${fromId}', '${toId}', [])`;
            const result = await prolog.query(goal);
            if (result.success) {
              relCount++;
              kbModified = true;
            } else {
              remainingFailed.push({
                rel,
                fromId,
                toId,
                error: result.error || "Unknown error",
              });
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            remainingFailed.push({ rel, fromId, toId, error: message });
          }
        }

        failedRelationships.length = 0;
        failedRelationships.push(...remainingFailed);
      }

      if (failedRelationships.length > 0) {
        console.warn(
          `\nWarning: ${failedRelationships.length} relationship(s) failed to sync:`,
        );
        const seen = new Set<string>();
        for (const { rel, fromId, toId, error } of failedRelationships) {
          const key = `${rel.type}:${fromId}->${toId}`;
          if (!seen.has(key)) {
            seen.add(key);
            console.warn(`  - ${rel.type}: ${fromId} -> ${toId}`);
            console.warn(`    Error: ${error}`);
          }
        }
        console.warn(
          "\nTip: Ensure target entities exist before creating relationships.",
        );
      }

      if (kbModified) {
        prolog.invalidateCache();
      }

      await prolog.query("kb_save");
      await prolog.query("kb_detach");
      await prolog.terminate();

      atomicPublish(stagingPath, livePath);

      const evictedHashes: Record<string, string> = {};
      const evictedSeenAt: Record<string, string> = {};

      for (const [key, hash] of Object.entries(nextHashes)) {
        if (failedCacheKeys.has(key)) {
          continue;
        }
        evictedHashes[key] = hash;
        evictedSeenAt[key] = nextSeenAt[key] ?? nowIso;
      }

      const liveCachePath = path.join(livePath, "sync-cache.json");
      writeSyncCache(liveCachePath, {
        version: SYNC_CACHE_VERSION,
        hashes: evictedHashes,
        seenAt: evictedSeenAt,
      });

      published = true;

      if (markdownFiles.length > 0 && entityCount < markdownFiles.length) {
        diagnostics.push(
          createDocsNotIndexedDiagnostic(markdownFiles.length, entityCount),
        );
      }

      console.log(
        `✓ Imported ${entityCount} entities, ${relCount} relationships`,
      );

      const commit = getCurrentCommit();
      const summary: SyncSummary = {
        branch: currentBranch,
        commit,
        timestamp: new Date().toISOString(),
        entityCounts,
        relationshipCount: relCount,
        success: true,
        published,
        failures: diagnostics,
        durationMs: Date.now() - startTime,
      };

      console.log(formatSyncSummary(summary));
      return summary;
    } catch (error) {
      cleanupStaging(stagingPath);
      throw error;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMessage}`);

    // Return failure summary
    const commit = getCurrentCommit();
    const summary: SyncSummary = {
      branch: currentBranch || "unknown",
      commit,
      timestamp: new Date().toISOString(),
      entityCounts,
      relationshipCount,
      success: false,
      published: false,
      failures: diagnostics,
      durationMs: Date.now() - startTime,
    };

    if (diagnostics.length > 0) {
      console.log("\nDiagnostics:");
      for (const d of diagnostics) {
        console.log(`  [${d.category}] ${d.severity}: ${d.message}`);
      }
    }

    throw error;
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
