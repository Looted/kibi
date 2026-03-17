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
import type { FrontmatterError } from "../extractors/markdown.js";
import {
  extractFromRelationshipShards,
  flattenRelationships,
  validateRelationships,
} from "../extractors/relationships.js";
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
  prepareStagingEnvironment,
} from "./sync/staging.js";

export class SyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SyncError";
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

    if (process.env.KIBI_DEBUG) {
      try {
        // eslint-disable-next-line no-console
        console.log("[kibi-debug] currentBranch:", currentBranch);
      } catch {}
    }

    // Load config
    const config = loadSyncConfig(process.cwd());
    const paths = config.paths;

    // File discovery
    const { markdownFiles, manifestFiles, relationshipsDir } =
      await discoverSourceFiles(process.cwd(), paths);

    if (process.env.KIBI_DEBUG) {
      try {
        // eslint-disable-next-line no-console
        console.log("[kibi-debug] markdownFiles:", markdownFiles.length);
        // eslint-disable-next-line no-console
        console.log("[kibi-debug] manifestFiles:", manifestFiles.length);
      } catch {}
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

    // Extract relationships from shard files
    const shardResults = extractFromRelationshipShards(relationshipsDir);
    const allRelationships = flattenRelationships(shardResults);

    const changedMarkdownFiles: string[] = [];
    const changedManifestFiles: string[] = [];

    // Detect changed files
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

    // Content extraction
    const { results, failedCacheKeys, errors } = await processExtractions(
      changedMarkdownFiles,
      changedManifestFiles,
      validateOnly,
    );

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

    // Refresh symbol manifest coordinates
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

    // Early exit if no changes
    if (results.length === 0 && allRelationships.length === 0 && !rebuild) {
      const evictedHashes: Record<string, string> = {};
      const evictedSeenAt: Record<string, string> = {};

      for (const [key, hash] of Object.entries(nextHashes)) {
        if (failedCacheKeys.has(key)) {
          continue;
        }
        evictedHashes[key] = hash;
        evictedSeenAt[key] = nextHashes[key] ?? nowIso;
      }

      writeSyncCache(cachePath, {
        version: SYNC_CACHE_VERSION,
        hashes: evictedHashes,
        seenAt: evictedSeenAt,
      });

      console.log("✓ Imported 0 entities, 0 relationships (no changes)");
      process.exit(0);
    }

    // Staging setup
    const livePath = path.join(process.cwd(), `.kb/branches/${currentBranch}`);
    const kbExists = existsSync(livePath);
    if (!kbExists && !rebuild) {
      diagnostics.push(createKbMissingDiagnostic(currentBranch, livePath));
    }

    const stagingPath = path.join(
      process.cwd(),
      `.kb/branches/${currentBranch}.staging`,
    );

    await prepareStagingEnvironment(stagingPath, livePath, rebuild);

    // Persistence to KB
    try {
      const prolog = new PrologProcess({ timeout: 120000 });
      await prolog.start();

      const attachResult = await prolog.query(`kb_attach('${stagingPath}')`);

      if (!attachResult.success) {
        await prolog.terminate();
        throw new SyncError(
          `Failed to attach to staging KB: ${attachResult.error || "Unknown error"}`,
        );
      }

      const entityIds = new Set<string>();

      // Validate and filter dangling relationships
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

      // Track entity counts by type
      for (const { entity } of results) {
        entityCounts[entity.type] = (entityCounts[entity.type] || 0) + 1;
      }

      // Persist entities
      const { entityCount, kbModified: entitiesModified } =
        await persistEntities(prolog, results, entityIds);

      // Persist relationships
      const { relationshipCount, kbModified: relationshipsModified } =
        await persistRelationships(prolog, results, validRelationships);

      const kbModified = entitiesModified || relationshipsModified;

      if (kbModified) {
        prolog.invalidateCache();
      }

      await prolog.query("kb_save");
      await prolog.query("kb_detach");
      await prolog.terminate();

      // Publish staging to live
      atomicPublish(stagingPath, livePath);

      // Update cache
      const evictedHashes: Record<string, string> = {};
      const evictedSeenAt: Record<string, string> = {};

      for (const [key, hash] of Object.entries(nextHashes)) {
        if (failedCacheKeys.has(key)) {
          continue;
        }
        evictedHashes[key] = hash;
        evictedSeenAt[key] = nextHashes[key] ?? nowIso;
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
        `✓ Imported ${entityCount} entities, ${relationshipCount} relationships`,
      );

      const commit = getCurrentCommit();
      const summary: SyncSummary = {
        branch: currentBranch,
        commit,
        timestamp: new Date().toISOString(),
        entityCounts,
        relationshipCount,
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

    const commit = getCurrentCommit();
    const summary: SyncSummary = {
      branch: currentBranch || "unknown",
      commit,
      timestamp: new Date().toISOString(),
      entityCounts,
      relationshipCount: 0,
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

// Export for use by modules that need these functions
export { normalizeMarkdownPath } from "./sync/discovery.js";
