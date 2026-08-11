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

import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import * as path from "node:path";
import type { Diagnostic, SyncSummary } from "../diagnostics.js";
import {
  branchErrorToDiagnostic,
  createDocsNotIndexedDiagnostic,
  createInvalidAuthoringDiagnostic,
  createKbMissingDiagnostic,
  formatSyncSummary,
} from "../diagnostics.js";
import { isCliDebugEnabled } from "../env.js";
import type { FrontmatterError } from "../extractors/markdown.js";
import {
  extractFromRelationshipShards,
  flattenRelationships,
  validateRelationships,
} from "../extractors/relationships.js";
import { analyzeSemanticAdvisorInput } from "../operations/semantic-advisor/analyze-prose.js";
import { validateSemanticInventoryBoundary } from "../operations/semantic-advisor/ingestion-boundary.js";
import { PrologProcess } from "../prolog.js";
import {
  copyCleanSnapshot,
  resolveActiveBranch,
} from "../utils/branch-resolver.js";
import { loadSyncConfig } from "../utils/config.js";
import {
  SYNC_CACHE_TTL_MS,
  SYNC_CACHE_VERSION,
  hashFile,
  readSyncCache,
  toCacheKey,
  writeSyncCache,
} from "./sync/cache.js";
import {
  discoverSourceFiles,
  normalizeMarkdownPath,
} from "./sync/discovery.js";
import { processExtractions } from "./sync/extraction.js";
import { refreshManifestCoordinates } from "./sync/manifest.js";
import { persistEntities, persistRelationships } from "./sync/persistence.js";
import {
  atomicPublish,
  cleanupStaging,
  createUniqueStagingPath,
  prepareStagingEnvironment,
} from "./sync/staging.js";

export class SyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncError";
  }
}

// implements REQ-003, REQ-007
export interface SyncResult extends SyncSummary {
  exitCode?: number;
}

interface SyncCommandRuntimeContext {
  currentBranch: string;
  livePath: string;
  rebuild: boolean;
  stagingPath: string;
  validateOnly: boolean;
}

interface SyncCommandRuntime {
  afterAttach?: (context: SyncCommandRuntimeContext) => Promise<void> | void;
  beforeSave?: (
    context: SyncCommandRuntimeContext & { kbModified: boolean },
  ) => Promise<void> | void;
  createProlog?: (options: { timeout: number }) => PrologProcess;
}

// implements REQ-003, REQ-007
export async function syncCommand(
  options: {
    validateOnly?: boolean;
    rebuild?: boolean;
    refreshSymbolCoordinates?: boolean;
  } = {},
  runtime: SyncCommandRuntime = {},
): Promise<SyncResult> {
  const validateOnly = options.validateOnly ?? false;
  const rebuild = options.rebuild ?? false;
  const startTime = Date.now();
  const diagnostics: Diagnostic[] = [];
  const entityCounts: Record<string, number> = {};
  let published = false;
  let currentBranch: string | undefined;
  let stagingPath: string | undefined;

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

  const withOptionalCommit = <T extends object>(
    value: T,
    commit: string | undefined,
  ): T & { commit?: string } =>
    commit !== undefined ? { ...value, commit } : value;

  try {
    // Branch resolution
    const branchResult = resolveActiveBranch(process.cwd());

    if ("error" in branchResult) {
      const diagnostic = branchErrorToDiagnostic(
        branchResult.code,
        branchResult.error,
      );
      diagnostics.push(diagnostic);
      console.error(`Failed to resolve active branch: ${branchResult.error}`);
      throw new SyncError(
        `Failed to resolve active branch: ${branchResult.error}`,
      );
    }

    currentBranch = branchResult.branch;

    if (isCliDebugEnabled()) {
      // eslint-disable-next-line no-console
      console.log("[kibi-debug] currentBranch:", currentBranch);
    }

    const config = loadSyncConfig(process.cwd());
    const paths = config.paths;

    const { markdownFiles, manifestFiles, relationshipsDir } =
      await discoverSourceFiles(process.cwd(), paths);

    if (isCliDebugEnabled()) {
      // eslint-disable-next-line no-console
      console.log("[kibi-debug] markdownFiles:", markdownFiles.length);
      // eslint-disable-next-line no-console
      console.log("[kibi-debug] manifestFiles:", manifestFiles.length);
    }

    const sourceFiles = [...markdownFiles, ...manifestFiles].sort();
    const cachePath = path.join(
      process.cwd(),
      `.kb/branches/${currentBranch}/sync-cache.json`,
    );
    const syncCache = readSyncCache(cachePath);
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    const nextHashes: Record<string, string> = {};
    const nextSeenAt: Record<string, string> = {};
    const nextSemanticHashes: Record<string, string> = {
      ...syncCache.semanticHashes,
    };
    const nextSemanticContracts: Record<string, boolean> = {
      ...syncCache.semanticContracts,
    };
    const initialSemanticBaseline = Object.keys(syncCache.hashes).length === 0;

    const shardResults = extractFromRelationshipShards(relationshipsDir);
    const allRelationships = flattenRelationships(shardResults);

    const changedMarkdownFiles: string[] = [];
    const changedManifestFiles: string[] = [];

    for (const file of sourceFiles) {
      try {
        const key = toCacheKey(file);
        const hash = hashFile(file);
        const lastSeen = syncCache.seenAt[key];
        const lastSeenMs = lastSeen ? Date.parse(lastSeen) : Number.NaN;
        const expired =
          !lastSeen ||
          Number.isNaN(lastSeenMs) ||
          nowMs - lastSeenMs > SYNC_CACHE_TTL_MS;

        nextHashes[key] = hash;
        nextSeenAt[key] = nowIso;

        const isChanged =
          expired || syncCache.hashes[key] !== hash || validateOnly || rebuild;

        if (isChanged) {
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

    // Coordinate refresh must precede extraction so the manifest overlay that
    // is persisted into RDF observes the newly generated coordinates. Force
    // each refreshed manifest through extraction even when its authored YAML
    // hash is unchanged; the generated coordinate artifact is an input too.
    if (!validateOnly && options.refreshSymbolCoordinates) {
      for (const file of manifestFiles) {
        try {
          await refreshManifestCoordinates(file, process.cwd(), {
            refreshSymbolCoordinates: options.refreshSymbolCoordinates,
          });
          if (!changedManifestFiles.includes(file)) {
            changedManifestFiles.push(file);
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.warn(
            `Warning: Failed to refresh symbol coordinates in ${file}: ${message}`,
          );
        }
      }
    }

    const performedFullReindex =
      changedMarkdownFiles.length === markdownFiles.length &&
      changedManifestFiles.length === manifestFiles.length;

    const { results, failedCacheKeys, errors } = await processExtractions(
      changedMarkdownFiles,
      changedManifestFiles,
      validateOnly,
    );

    for (const result of results) {
      if (result.entity.type !== "req") continue;
      const key = toCacheKey(result.entity.source);
      const payload = {
        type: result.entity.type,
        id: result.entity.id,
        properties: result.entity,
        relationships: result.relationships,
      };
      const semantic = analyzeSemanticAdvisorInput({ payload });
      const boundary = validateSemanticInventoryBoundary(
        payload,
        result.relationships,
        semantic.receipt,
      );
      const previousSemanticHash = syncCache.semanticHashes[key];
      const advertisedContract =
        result.entity.semantic_inventory_version !== undefined ||
        result.entity.semantic_source_hash !== undefined ||
        result.entity.semantic_inventory !== undefined;
      const enforceBoundary =
        (!initialSemanticBaseline && syncCache.hashes[key] === undefined) ||
        syncCache.semanticContracts[key] === true ||
        (previousSemanticHash !== undefined &&
          previousSemanticHash !== boundary.sourceHash) ||
        advertisedContract;
      if (enforceBoundary && boundary.errors.length > 0) {
        throw new SyncError(
          `${key}: proposition-complete ingestion failed: ${boundary.errors.join("; ")}. Run kb_semantic_advisor with the complete requirement prose and preserve its inventory contract.`,
        );
      }
      nextSemanticHashes[key] = boundary.sourceHash;
      nextSemanticContracts[key] = advertisedContract;
    }

    // Collect INVALID_AUTHORING diagnostics
    for (const err of errors) {
      const error = new Error(err.message) as Error & {
        classification?: string;
      };
      if (
        err.message.includes("Embedded Entity Violation") ||
        err.message.includes("scenario") ||
        err.message.includes("test")
      ) {
        const embeddedTypes =
          err.message.includes("scenario") && err.message.includes("test")
            ? ["scenario", "test"]
            : err.message.includes("scenario")
              ? ["scenario"]
              : err.message.includes("test")
                ? ["test"]
                : ["entity"];
        diagnostics.push(
          createInvalidAuthoringDiagnostic(err.file, embeddedTypes),
        );
      }
    }

    if (validateOnly && errors.length > 0 && results.length === 0) {
      for (const err of errors) {
        console.error(`${err.file}: ${err.message}`);
      }
      console.error(`FAILED: ${errors.length} errors found`);
      return withOptionalCommit(
        {
          branch: currentBranch,
          timestamp: new Date().toISOString(),
          entityCounts,
          relationshipCount: 0,
          success: false,
          published: false,
          failures: diagnostics,
          durationMs: Date.now() - startTime,
          exitCode: 1,
        },
        getCurrentCommit(),
      );
    }

    if (results.length === 0 && allRelationships.length === 0 && !rebuild) {
      const evictedHashes: Record<string, string> = {};
      const evictedSeenAt: Record<string, string> = {};
      const evictedSemanticHashes: Record<string, string> = {};
      const evictedSemanticContracts: Record<string, boolean> = {};

      for (const [key, hash] of Object.entries(nextHashes)) {
        if (failedCacheKeys.has(key)) {
          continue;
        }
        evictedHashes[key] = hash;
        evictedSeenAt[key] = nextSeenAt[key] ?? nowIso;
        if (nextSemanticHashes[key] !== undefined) {
          evictedSemanticHashes[key] = nextSemanticHashes[key];
          evictedSemanticContracts[key] = nextSemanticContracts[key] === true;
        }
      }

      writeSyncCache(cachePath, {
        version: SYNC_CACHE_VERSION,
        hashes: evictedHashes,
        seenAt: evictedSeenAt,
        semanticHashes: evictedSemanticHashes,
        semanticContracts: evictedSemanticContracts,
      });

      console.log("✓ Imported 0 entities, 0 relationships (no changes)");
      return withOptionalCommit(
        {
          branch: currentBranch,
          timestamp: new Date().toISOString(),
          entityCounts,
          relationshipCount: 0,
          success: true,
          published: false,
          failures: diagnostics,
          durationMs: Date.now() - startTime,
          exitCode: 0,
        },
        getCurrentCommit(),
      );
    }

    const livePath = path.join(process.cwd(), `.kb/branches/${currentBranch}`);
    const kbExists = existsSync(livePath);
    if (!kbExists && !rebuild) {
      diagnostics.push(createKbMissingDiagnostic(currentBranch, livePath));
    }

    stagingPath = createUniqueStagingPath(currentBranch, process.cwd());
    const runtimeContext: SyncCommandRuntimeContext = {
      currentBranch,
      livePath,
      rebuild,
      stagingPath,
      validateOnly,
    };

    await prepareStagingEnvironment(stagingPath, livePath, rebuild);

    try {
      const prolog =
        runtime.createProlog?.({ timeout: 120000 }) ??
        new PrologProcess({ timeout: 120000 });
      await prolog.start();

      const attachResult = await prolog.query(`kb_attach('${stagingPath}')`);

      if (!attachResult.success) {
        await prolog.terminate();
        throw new SyncError(
          `Failed to attach to staging KB: ${attachResult.error || "Unknown error"}`,
        );
      }
      await runtime.afterAttach?.(runtimeContext);

      const entityIds = new Set<string>();

      for (const { entity } of results) {
        entityCounts[entity.type] = (entityCounts[entity.type] || 0) + 1;
      }

      const { entityCount, kbModified: entitiesModified } =
        await persistEntities(prolog, results, entityIds);

      const validationErrors = validateRelationships(
        allRelationships,
        entityIds,
      );
      if (validationErrors.length > 0) {
        console.warn(
          `Warning: ${validationErrors.length} dangling relationship(s) found`,
        );
        for (const { relationship, error } of validationErrors) {
          console.warn(
            `  - ${error}: ${relationship.type} ${relationship.from} -> ${relationship.to}`,
          );
        }
      }
      const danglingKeys = new Set(
        validationErrors.map(
          ({ relationship: r }) => `${r.type}|${r.from}|${r.to}`,
        ),
      );
      const validRelationships = allRelationships.filter(
        (r) => !danglingKeys.has(`${r.type}|${r.from}|${r.to}`),
      );

      // Persist relationships
      const { relationshipCount, kbModified: relationshipsModified } =
        await persistRelationships(prolog, results, validRelationships);

      const kbModified = entitiesModified || relationshipsModified;

      if (validateOnly) {
        await prolog.query("kb_detach");
        await prolog.terminate();
        cleanupStaging(stagingPath);

        if (errors.length > 0) {
          for (const err of errors) {
            console.error(`${err.file}: ${err.message}`);
          }
          console.error(`FAILED: ${errors.length} errors found`);
          return withOptionalCommit(
            {
              branch: currentBranch,
              timestamp: new Date().toISOString(),
              entityCounts,
              relationshipCount: 0,
              success: false,
              published: false,
              failures: diagnostics,
              durationMs: Date.now() - startTime,
              exitCode: 1,
            },
            getCurrentCommit(),
          );
        }

        console.log(`OK: Validation passed (${entityCount} entities)`);
        return withOptionalCommit(
          {
            branch: currentBranch,
            timestamp: new Date().toISOString(),
            entityCounts,
            relationshipCount: 0,
            success: true,
            published: false,
            failures: diagnostics,
            durationMs: Date.now() - startTime,
            exitCode: 0,
          },
          getCurrentCommit(),
        );
      }

      if (kbModified) {
        prolog.invalidateCache();
      }

      await runtime.beforeSave?.({ ...runtimeContext, kbModified });

      const saveResult = await prolog.query("kb_save");
      if (!saveResult.success) {
        throw new SyncError(
          `Failed to save staging KB: ${saveResult.error || "Unknown error"}`,
        );
      }
      await prolog.query("kb_detach");
      await prolog.terminate();

      atomicPublish(stagingPath, livePath);
      cleanupStaging(stagingPath);

      const evictedHashes: Record<string, string> = {};
      const evictedSeenAt: Record<string, string> = {};
      const evictedSemanticHashes: Record<string, string> = {};
      const evictedSemanticContracts: Record<string, boolean> = {};

      for (const [key, hash] of Object.entries(nextHashes)) {
        if (failedCacheKeys.has(key)) {
          continue;
        }
        evictedHashes[key] = hash;
        evictedSeenAt[key] = nextSeenAt[key] ?? nowIso;
        if (nextSemanticHashes[key] !== undefined) {
          evictedSemanticHashes[key] = nextSemanticHashes[key];
          evictedSemanticContracts[key] = nextSemanticContracts[key] === true;
        }
      }

      const liveCachePath = path.join(livePath, "sync-cache.json");
      writeSyncCache(liveCachePath, {
        version: SYNC_CACHE_VERSION,
        hashes: evictedHashes,
        seenAt: evictedSeenAt,
        semanticHashes: evictedSemanticHashes,
        semanticContracts: evictedSemanticContracts,
      });

      published = true;

      if (
        performedFullReindex &&
        markdownFiles.length > 0 &&
        entityCount < markdownFiles.length
      ) {
        diagnostics.push(
          createDocsNotIndexedDiagnostic(markdownFiles.length, entityCount),
        );
      }

      console.log(
        `✓ Imported ${entityCount} entities, ${relationshipCount} relationships`,
      );

      const commit = getCurrentCommit();
      const summary: SyncSummary = withOptionalCommit(
        {
          branch: currentBranch,
          timestamp: new Date().toISOString(),
          entityCounts,
          relationshipCount,
          success: true,
          published,
          failures: diagnostics,
          durationMs: Date.now() - startTime,
        },
        commit,
      );

      console.log(formatSyncSummary(summary));
      return { ...summary, exitCode: 0 };
    } catch (error) {
      cleanupStaging(stagingPath);
      throw error;
    }
  } catch (error) {
    if (stagingPath) {
      cleanupStaging(stagingPath);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMessage}`);

    const commit = getCurrentCommit();
    const summary: SyncSummary = withOptionalCommit(
      {
        branch: currentBranch || "unknown",
        timestamp: new Date().toISOString(),
        entityCounts,
        relationshipCount: 0,
        success: false,
        published: false,
        failures: diagnostics,
        durationMs: Date.now() - startTime,
      },
      commit,
    );

    if (diagnostics.length > 0) {
      console.log("\nDiagnostics:");
      for (const d of diagnostics) {
        console.log(`  [${d.category}] ${d.severity}: ${d.message}`);
      }
    }

    throw error;
  }
}

export { normalizeMarkdownPath } from "./sync/discovery.js";
