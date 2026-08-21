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
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import type { Diagnostic, SyncSummary } from "../diagnostics.js";
import {
  branchErrorToDiagnostic,
  createDocsNotIndexedDiagnostic,
  createInvalidAuthoringDiagnostic,
  createKbMissingDiagnostic,
  formatSyncSummary,
} from "../diagnostics.js";
import {
  EngineClient,
  type EnginePublicationLease,
  acquireEnginePublicationLease,
  engineSocketPath,
  ensureJournaledBranchStoreAsync,
  fsyncJournaledBranchStore,
} from "../engine.js";
import { isCliDebugEnabled } from "../env.js";
import type {
  ExtractedRelationship,
  ExtractionResult,
} from "../extractors/markdown.js";
import {
  extractRelationshipShard,
  validateRelationships,
} from "../extractors/relationships.js";
import { analyzeSemanticAdvisorInput } from "../operations/semantic-advisor/analyze-prose.js";
import { validateSemanticInventoryBoundary } from "../operations/semantic-advisor/ingestion-boundary.js";
import { PrologProcess } from "../prolog.js";
import { resolveBranchAttachment } from "../utils/branch-resolver.js";
import {
  branchStoreManifestPath,
  branchStorePath,
  ensureBranchStoreManifest,
  expectedBranchStoreManifest,
} from "../utils/branch-store-locator.js";
import { loadEntityPaths } from "../utils/config.js";
import {
  SYNC_CACHE_TTL_MS,
  SYNC_CACHE_VERSION,
  hashFile,
  hashNormalized,
  readSyncCache,
  toCacheKey,
  writeSyncCache,
} from "./sync/cache.js";
import type { SyncCache } from "./sync/cache.js";
import {
  clearRecoveredPendingSourceReceipts,
  discoverSourceFiles,
  normalizeMarkdownPath,
} from "./sync/discovery.js";
import type { PendingSourceReceiptSnapshot } from "./sync/discovery.js";
import {
  normalizeExtractionSources,
  processExtractions,
} from "./sync/extraction.js";
import { refreshManifestCoordinates } from "./sync/manifest.js";
import {
  persistEntities,
  persistRelationships,
  retractEntitiesById,
  retractEntitiesForSources,
  retractEntityRelationshipsById,
  retractRelationships,
} from "./sync/persistence.js";
import {
  atomicPublish,
  atomicPublishGeneration,
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

function relationshipKey(relationship: ExtractedRelationship): string {
  return `${relationship.type}\0${relationship.from}\0${relationship.to}`;
}

function relationshipFromKey(key: string): ExtractedRelationship {
  const [type, from, to] = key.split("\0");
  if (type === undefined || from === undefined || to === undefined) {
    throw new SyncError(`Invalid cached relationship key: ${key}`);
  }
  return { type, from, to };
}

function assertNoUnresolvedGitConflicts(workspaceRoot: string): void {
  let conflicted = "";
  try {
    conflicted = execSync("git diff --name-only --diff-filter=U --", {
      cwd: workspaceRoot,
      encoding: "utf8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    // A non-Git workspace is handled by branch resolution below. Do not turn
    // a missing Git binary into a misleading conflict diagnostic.
    return;
  }
  if (conflicted) {
    throw new SyncError(
      `Unresolved Git conflicts block Kibi compilation; resolve these authored files first: ${conflicted.split("\n").join(", ")}`,
    );
  }
}

function trackedRelationshipFiles(
  workspaceRoot: string,
  relationshipsDir: string,
  recoverMissingPendingSources = false,
  recoveredPendingReceiptPaths: PendingSourceReceiptSnapshot[] = [],
): string[] {
  let tracked: Set<string>;
  try {
    tracked = new Set(
      execSync("git ls-files --cached -- .kb/relationships", {
        cwd: workspaceRoot,
        encoding: "utf8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      })
        .split("\n")
        .filter(Boolean)
        .map((file) => file.replaceAll("\\", "/")),
    );
  } catch {
    // A non-Git workspace has no tracked relationship inputs. The caller's
    // branch resolver will produce the user-facing attachment diagnostic.
    return [];
  }

  const pending = new Set<string>();
  const pendingRoot = path.join(
    workspaceRoot,
    ".kb",
    "recovery",
    "pending-sources",
  );
  if (existsSync(pendingRoot)) {
    for (const receiptName of readdirSync(pendingRoot)) {
      if (!receiptName.endsWith(".json")) continue;
      let receipt: { path?: unknown; afterHash?: unknown };
      try {
        receipt = JSON.parse(
          readFileSync(path.join(pendingRoot, receiptName), "utf8"),
        ) as { path?: unknown; afterHash?: unknown };
      } catch {
        // Malformed receipts are left for explicit recovery diagnostics. They
        // must never make an unrelated relationship shard disappear silently.
        continue;
      }
      if (
        typeof receipt.path !== "string" ||
        typeof receipt.afterHash !== "string"
      ) {
        continue;
      }
      const relative = receipt.path.replaceAll("\\", "/");
      if (!relative.startsWith(".kb/relationships/")) continue;
      const absolute = path.resolve(workspaceRoot, relative);
      if (!absolute.startsWith(`${path.resolve(workspaceRoot)}${path.sep}`)) {
        throw new SyncError(
          `Pending source path escapes workspace: ${relative}`,
        );
      }
      if (!existsSync(absolute)) {
        if (recoverMissingPendingSources) {
          const receiptPath = path.join(pendingRoot, receiptName);
          if (
            !recoveredPendingReceiptPaths.some(
              (candidate) => candidate.receiptPath === receiptPath,
            )
          ) {
            recoveredPendingReceiptPaths.push({
              receiptPath,
              path: relative,
              afterHash: receipt.afterHash,
              rawHash: createHash("sha256")
                .update(readFileSync(receiptPath))
                .digest("hex"),
            });
          }
          continue;
        }
        throw new SyncError(`Pending source is missing: ${relative}`);
      }
      const actual = createHash("sha256")
        .update(readFileSync(absolute))
        .digest("hex");
      if (actual !== receipt.afterHash) {
        throw new SyncError(
          `Pending source hash drift blocks sync for ${relative}`,
        );
      }
      pending.add(relative);
    }
  }

  try {
    return readdirSync(relationshipsDir)
      .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))
      .map((file) => path.join(relationshipsDir, file))
      .filter((file) => {
        const relative = path
          .relative(workspaceRoot, file)
          .replaceAll(path.sep, "/");
        return tracked.has(relative) || pending.has(relative);
      })
      .sort();
  } catch {
    return [];
  }
}

function normalizedEntityHash(result: ExtractionResult): string {
  const entity = { ...result.entity } as Record<string, unknown>;
  // Manifest defaults are generated at extraction time. They must not turn a
  // one-record edit into 10,000 false-positive symbol updates.
  entity.created_at = undefined;
  entity.updated_at = undefined;
  return hashNormalized({
    entity,
    sourceFile: result.sourceFile,
    relationships: result.relationships
      .map(relationshipKey)
      .sort((left, right) => left.localeCompare(right)),
  });
}

// implements REQ-kibi-proposition-complete-ingestion
function semanticBoundaryRelationships(
  result: ExtractionResult,
  shardRelationships: readonly ExtractedRelationship[],
): ExtractedRelationship[] {
  const relationships = new Map<string, ExtractedRelationship>();
  for (const relationship of [...result.relationships, ...shardRelationships]) {
    if (relationship.from !== result.entity.id) continue;
    relationships.set(relationshipKey(relationship), relationship);
  }
  return [...relationships.values()];
}

async function checkpointNoopSync(
  workspaceRoot: string,
  branch: string,
): Promise<void> {
  const engine = new EngineClient({
    workspaceRoot,
    branch,
    timeout: 120_000,
  });
  try {
    await engine.start();
    const checkpoint = await engine.checkpoint();
    if (!checkpoint.success) {
      throw new SyncError(
        `Failed to publish the no-op sync checkpoint: ${checkpoint.error ?? "Unknown error"}`,
      );
    }
  } finally {
    await engine.terminate();
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

function compilerCacheHasEntityDelta(cache: SyncCache): boolean {
  return (
    cache.entityHashes !== undefined && cache.sourceEntityIds !== undefined
  );
}

function compilerCacheIsFresh(
  cache: SyncCache,
  sourceFiles: readonly string[],
  nowMs: number,
): boolean {
  const sourceKeys = sourceFiles.map(toCacheKey);
  if (Object.keys(cache.hashes).some((key) => !sourceKeys.includes(key))) {
    return false;
  }
  return sourceKeys.every((key) => {
    const lastSeen = cache.seenAt[key];
    const lastSeenMs = lastSeen ? Date.parse(lastSeen) : Number.NaN;
    return (
      typeof cache.hashes[key] === "string" &&
      lastSeen !== undefined &&
      !Number.isNaN(lastSeenMs) &&
      nowMs - lastSeenMs <= SYNC_CACHE_TTL_MS
    );
  });
}

function compilerCacheFilesMatch(
  cache: SyncCache,
  sourceFiles: readonly string[],
  relationshipFiles: readonly string[],
): boolean {
  for (const file of sourceFiles) {
    if (cache.hashes[toCacheKey(file)] !== hashFile(file)) return false;
  }
  const relationshipKeys = new Set(relationshipFiles.map(toCacheKey));
  if (
    Object.keys(cache.relationshipHashes ?? {}).some(
      (key) => !relationshipKeys.has(key),
    )
  ) {
    return false;
  }
  for (const file of relationshipFiles) {
    if (cache.relationshipHashes?.[toCacheKey(file)] !== hashFile(file)) {
      return false;
    }
  }
  return true;
}

// implements REQ-003, REQ-007
export async function syncCommand(
  options: {
    validateOnly?: boolean;
    rebuild?: boolean;
    refreshSymbolCoordinates?: boolean;
    /** Explicitly rebuild an unreadable branch store from authored sources. */
    recoveryBackupPath?: string;
    /** Workspace to operate on when invoked through MCP or another host. */
    workspaceRoot?: string;
  } = {},
  runtime: SyncCommandRuntime = {},
): Promise<SyncResult> {
  const validateOnly = options.validateOnly ?? false;
  const rebuild = options.rebuild ?? false;
  const recoveryBackupPath = options.recoveryBackupPath;
  const workspaceRoot = path.resolve(options.workspaceRoot ?? process.cwd());
  const startTime = Date.now();
  const diagnostics: Diagnostic[] = [];
  const entityCounts: Record<string, number> = {};
  let published = false;
  let currentBranch: string | undefined;
  let stagingPath: string | undefined;
  let publicationLease: EnginePublicationLease | undefined;

  const getCurrentCommit = (): string | undefined => {
    try {
      return execSync("git rev-parse HEAD", {
        cwd: workspaceRoot,
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
    assertNoUnresolvedGitConflicts(workspaceRoot);
    // Branch resolution
    const branchResult = resolveBranchAttachment(workspaceRoot);

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

    if (branchResult.migrationRequired && !validateOnly) {
      throw new SyncError(
        `Sync blocked: KB is attached through legacy branch storage for '${branchResult.gitBranch}'. Run 'kibi branch migrate --from ${branchResult.kbBranch} --to ${branchResult.gitBranch} --apply' first.`,
      );
    }

    currentBranch = branchResult.kbBranch;

    // Cut over legacy branches before creating a staging copy.  If another
    // CLI/MCP operation has an engine attached, stop that single writer so the
    // atomic publish below cannot race its RDF lock.
    const livePathForEngine = branchStorePath(workspaceRoot, currentBranch);
    if (!validateOnly && recoveryBackupPath === undefined) {
      ensureBranchStoreManifest(workspaceRoot, currentBranch);
      await ensureJournaledBranchStoreAsync(livePathForEngine);
    }
    const needsExclusiveGenerationPublish =
      !validateOnly && (rebuild || recoveryBackupPath !== undefined);
    if (needsExclusiveGenerationPublish) {
      // Recovery intentionally avoids attaching the broken live store. The
      // clean rebuild is compiled into staging and published only after it
      // can be reopened successfully.
      const existingEngine = new EngineClient({
        workspaceRoot,
        branch: currentBranch,
        timeout: 2_000,
        allowPublicationLock: true,
      });
      const engineSocketExists = existsSync(
        engineSocketPath(workspaceRoot, currentBranch),
      );
      try {
        publicationLease = acquireEnginePublicationLease(
          workspaceRoot,
          currentBranch,
        );
        // This client is explicitly allowed to attach under its own lease so
        // a daemon that appeared between the socket probe and lease creation
        // is still stopped before publication.
        if (
          engineSocketExists ||
          existsSync(engineSocketPath(workspaceRoot, currentBranch))
        ) {
          await existingEngine.start(false);
        }
        if (existingEngine.isRunning()) {
          await existingEngine.stop(false);
        } else if (
          engineSocketExists ||
          existsSync(engineSocketPath(workspaceRoot, currentBranch))
        ) {
          throw new SyncError(
            `Kibi engine socket remains present but is not reachable: ${engineSocketPath(workspaceRoot, currentBranch)}`,
          );
        }
      } finally {
        await existingEngine.terminate();
      }
    }

    if (isCliDebugEnabled()) {
      // eslint-disable-next-line no-console
      console.log("[kibi-debug] currentBranch:", currentBranch);
    }

    const paths = loadEntityPaths(workspaceRoot);

    const {
      markdownFiles,
      manifestFiles,
      relationshipsDir,
      recoveredPendingReceiptPaths,
    } = await discoverSourceFiles(workspaceRoot, {
      trackedOnly: true,
      recoverMissingPendingSources: recoveryBackupPath !== undefined,
    });

    if (isCliDebugEnabled()) {
      // eslint-disable-next-line no-console
      console.log("[kibi-debug] markdownFiles:", markdownFiles.length);
      // eslint-disable-next-line no-console
      console.log("[kibi-debug] manifestFiles:", manifestFiles.length);
    }

    const sourceFiles = [...markdownFiles, ...manifestFiles].sort();
    const cachePath = path.join(livePathForEngine, "sync-cache.json");
    const syncCache = readSyncCache(cachePath);
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const currentSourceKeys = new Set(sourceFiles.map(toCacheKey));
    const relationshipShardFiles = existsSync(relationshipsDir)
      ? trackedRelationshipFiles(
          workspaceRoot,
          relationshipsDir,
          recoveryBackupPath !== undefined,
          recoveredPendingReceiptPaths,
        )
      : [];

    // No-op is a first-class compiler result. Hashing the configured inputs is
    // sufficient when normalized entity/shard inventories are already fresh;
    // avoid rebuilding maps and rediscovering RDF state for the common path.
    if (
      !validateOnly &&
      !rebuild &&
      !options.refreshSymbolCoordinates &&
      runtime.createProlog === undefined &&
      compilerCacheHasEntityDelta(syncCache) &&
      compilerCacheIsFresh(syncCache, sourceFiles, nowMs) &&
      compilerCacheFilesMatch(syncCache, sourceFiles, relationshipShardFiles)
    ) {
      await checkpointNoopSync(workspaceRoot, currentBranch);
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

    const changedSourceHashes = new Map<string, string>();
    for (const file of sourceFiles) {
      const key = toCacheKey(file);
      const hash = hashFile(file);
      if (syncCache.hashes[key] !== hash) changedSourceHashes.set(key, hash);
    }

    const nextHashes: Record<string, string> = {};
    const nextSeenAt: Record<string, string> = {};
    const nextSemanticHashes: Record<string, string> = {
      ...syncCache.semanticHashes,
    };
    const nextSemanticContracts: Record<string, boolean> = {
      ...syncCache.semanticContracts,
    };
    const nextRelationshipHashes: Record<string, string> = {};
    const nextShardRelationships: Record<string, string[]> = {};
    const addedShardRelationships: ExtractedRelationship[] = [];
    const removedShardRelationships: ExtractedRelationship[] = [];
    const initialSemanticBaseline = Object.keys(syncCache.hashes).length === 0;

    const changedMarkdownFiles: string[] = [];
    const changedManifestFiles: string[] = [];
    const forceEntitySourceKeys = new Set<string>();

    // A removed source has no file left to extract, but its entities must be
    // retracted from the branch. Keep this separate from failed extraction:
    // malformed current files remain authoritative until a later successful
    // sync rather than deleting their last known-good entities.
    const deletedSourceFiles = Object.keys(syncCache.hashes)
      .filter((key) => !currentSourceKeys.has(key))
      .map((key) => path.resolve(workspaceRoot, key));

    const currentRelationshipKeys = new Set<string>();
    for (const shardPath of relationshipShardFiles) {
      const key = toCacheKey(shardPath);
      currentRelationshipKeys.add(key);
      let hash: string | undefined;
      try {
        hash = hashFile(shardPath);
        nextRelationshipHashes[key] = hash;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `Warning: Failed to hash relationship shard ${shardPath}: ${message}`,
        );
      }
      const previousKeys = syncCache.shardRelationships?.[key] ?? [];
      const shardChanged =
        syncCache.shardRelationships === undefined ||
        hash === undefined ||
        syncCache.relationshipHashes?.[key] !== hash;
      const currentKeys = shardChanged
        ? extractRelationshipShard(shardPath)
            .relationships.map(relationshipKey)
            .sort((left, right) => left.localeCompare(right))
        : previousKeys;
      nextShardRelationships[key] = currentKeys;
      if (shardChanged) {
        const previous = new Set(previousKeys);
        const current = new Set(currentKeys);
        for (const edge of previous) {
          if (!current.has(edge)) {
            removedShardRelationships.push(relationshipFromKey(edge));
          }
        }
        for (const edge of current) {
          if (!previous.has(edge)) {
            addedShardRelationships.push(relationshipFromKey(edge));
          }
        }
      }
    }
    for (const [key, previousKeys] of Object.entries(
      syncCache.shardRelationships ?? {},
    )) {
      if (currentRelationshipKeys.has(key)) continue;
      for (const edge of previousKeys) {
        removedShardRelationships.push(relationshipFromKey(edge));
      }
    }
    const relationshipChanged =
      addedShardRelationships.length > 0 ||
      removedShardRelationships.length > 0;

    for (const file of sourceFiles) {
      try {
        const key = toCacheKey(file);
        const hash = changedSourceHashes.get(key) ?? syncCache.hashes[key];
        if (hash === undefined) continue;
        const lastSeen = syncCache.seenAt[key];
        const lastSeenMs = lastSeen ? Date.parse(lastSeen) : Number.NaN;
        const expired =
          !lastSeen ||
          Number.isNaN(lastSeenMs) ||
          nowMs - lastSeenMs > SYNC_CACHE_TTL_MS;

        nextHashes[key] = hash;
        nextSeenAt[key] = nowIso;

        const isChanged =
          expired || changedSourceHashes.has(key) || validateOnly || rebuild;

        if (isChanged) {
          if (expired) forceEntitySourceKeys.add(key);
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

    // A v1 cache has only whole-file hashes. Perform one compiler-metadata
    // backfill so subsequent edits can be reduced to normalized entity deltas.
    if (
      syncCache.entityHashes === undefined ||
      syncCache.sourceEntityIds === undefined
    ) {
      for (const file of markdownFiles) {
        if (!changedMarkdownFiles.includes(file))
          changedMarkdownFiles.push(file);
      }
      for (const file of manifestFiles) {
        if (!changedManifestFiles.includes(file))
          changedManifestFiles.push(file);
      }
    }

    // Coordinate refresh must precede extraction so the manifest overlay that
    // is persisted into RDF observes the newly generated coordinates. Force
    // each refreshed manifest through extraction even when its authored YAML
    // hash is unchanged; the generated coordinate artifact is an input too.
    if (!validateOnly && options.refreshSymbolCoordinates) {
      for (const file of manifestFiles) {
        try {
          await refreshManifestCoordinates(file, workspaceRoot, {
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

    const extraction = await processExtractions(
      changedMarkdownFiles,
      changedManifestFiles,
      validateOnly,
    );
    const { failedCacheKeys, errors } = extraction;
    const extractedResults = normalizeExtractionSources(
      extraction.results,
      workspaceRoot,
    );
    const nextEntityHashes: Record<string, string> = {
      ...(syncCache.entityHashes ?? {}),
    };
    const nextSourceEntityIds: Record<string, string[]> = {
      ...(syncCache.sourceEntityIds ?? {}),
    };
    const removedEntityIds = new Set<string>();
    const changedEntityIds = new Set<string>();
    const supportsEntityDelta =
      syncCache.entityHashes !== undefined &&
      syncCache.sourceEntityIds !== undefined;
    const useEntityDelta =
      supportsEntityDelta &&
      !validateOnly &&
      !rebuild &&
      runtime.createProlog === undefined;
    // Re-materialize every authored shard edge whenever a source entity is
    // refreshed. Entity-delta sync retracts outgoing relationships for changed
    // entities before persisting their extracted relationships. Manifest
    // entities commonly carry no inline links, so a manifest-only edit (for
    // example, a generated coordinate refresh) would otherwise drop valid
    // shard-only edges and leave the cache claiming they were already synced.
    const materializeAllRelationships =
      !useEntityDelta ||
      changedMarkdownFiles.length > 0 ||
      changedManifestFiles.length > 0;
    const allRelationships = materializeAllRelationships
      ? Object.values(nextShardRelationships).flat().map(relationshipFromKey)
      : [...addedShardRelationships, ...removedShardRelationships];

    for (const deletedSource of deletedSourceFiles) {
      const sourceKey = toCacheKey(deletedSource);
      for (const id of nextSourceEntityIds[sourceKey] ?? []) {
        removedEntityIds.add(id);
        delete nextEntityHashes[id];
      }
      delete nextSourceEntityIds[sourceKey];
    }

    const resultsBySource = new Map<string, ExtractionResult[]>();
    for (const result of extractedResults) {
      const sourceKey = toCacheKey(result.entity.source);
      const sourceResults = resultsBySource.get(sourceKey) ?? [];
      sourceResults.push(result);
      resultsBySource.set(sourceKey, sourceResults);
    }
    for (const changedSource of [
      ...changedMarkdownFiles,
      ...changedManifestFiles,
    ]) {
      const sourceKey = toCacheKey(changedSource);
      if (failedCacheKeys.has(sourceKey)) continue;
      const sourceResults = resultsBySource.get(sourceKey) ?? [];
      const previousIds = new Set(nextSourceEntityIds[sourceKey] ?? []);
      const currentIds = sourceResults.map(({ entity }) => entity.id).sort();
      const currentIdSet = new Set(currentIds);
      for (const previousId of previousIds) {
        if (!currentIdSet.has(previousId)) {
          removedEntityIds.add(previousId);
          delete nextEntityHashes[previousId];
        }
      }
      for (const result of sourceResults) {
        const hash = normalizedEntityHash(result);
        if (
          forceEntitySourceKeys.has(sourceKey) ||
          nextEntityHashes[result.entity.id] !== hash
        ) {
          changedEntityIds.add(result.entity.id);
        }
        nextEntityHashes[result.entity.id] = hash;
      }
      nextSourceEntityIds[sourceKey] = currentIds;
    }

    const results = useEntityDelta
      ? extractedResults.filter(({ entity }) => changedEntityIds.has(entity.id))
      : extractedResults;

    for (const result of extractedResults) {
      if (result.entity.type !== "req") continue;
      const key = toCacheKey(result.entity.source);
      const relationships = semanticBoundaryRelationships(
        result,
        allRelationships,
      );
      const payload = {
        type: result.entity.type,
        id: result.entity.id,
        properties: result.entity,
        relationships,
      };
      const semantic = analyzeSemanticAdvisorInput({ payload });
      const boundary = validateSemanticInventoryBoundary(
        payload,
        relationships,
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

    if (
      results.length === 0 &&
      removedEntityIds.size === 0 &&
      !relationshipChanged &&
      (useEntityDelta || changedMarkdownFiles.length === 0) &&
      (useEntityDelta || changedManifestFiles.length === 0) &&
      deletedSourceFiles.length === 0 &&
      !rebuild
    ) {
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
        relationshipHashes: nextRelationshipHashes,
        entityHashes: nextEntityHashes,
        sourceEntityIds: nextSourceEntityIds,
        shardRelationships: nextShardRelationships,
        seenAt: evictedSeenAt,
        semanticHashes: evictedSemanticHashes,
        semanticContracts: evictedSemanticContracts,
      });

      if (runtime.createProlog === undefined) {
        await checkpointNoopSync(workspaceRoot, currentBranch);
      }

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

    const livePath = branchStorePath(workspaceRoot, currentBranch);
    const kbExists = existsSync(livePath);
    if (!kbExists && !rebuild) {
      diagnostics.push(createKbMissingDiagnostic(currentBranch, livePath));
    }

    // implements REQ-core-journaled-engine-delta-sync
    // Normal syncs are compiled directly into the long-lived single-writer
    // engine. Rebuilds retain generation replacement semantics, and injected
    // Prolog runtimes keep the staging path used by the contract fixtures.
    // This is the cutover that avoids copying and rewriting a complete branch
    // for a one-symbol or relationship-only change.
    if (!validateOnly && !rebuild && runtime.createProlog === undefined) {
      const engine = new EngineClient({
        workspaceRoot,
        branch: currentBranch,
        timeout: 120_000,
      });
      const engineProlog = engine as unknown as PrologProcess;
      try {
        await engine.start();

        const successfulChangedSources = [
          ...changedMarkdownFiles,
          ...changedManifestFiles,
        ].filter((file) => !failedCacheKeys.has(toCacheKey(file)));
        const removedCount = useEntityDelta
          ? await retractEntitiesById(engineProlog, [...removedEntityIds])
          : await retractEntitiesForSources(engineProlog, [
              ...successfulChangedSources,
              ...deletedSourceFiles,
            ]);

        if (useEntityDelta) {
          await retractEntityRelationshipsById(engineProlog, [
            ...changedEntityIds,
          ]);
          const exactRemovedEdges = removedShardRelationships.filter(
            (relationship) =>
              !removedEntityIds.has(relationship.from) &&
              !removedEntityIds.has(relationship.to) &&
              !changedEntityIds.has(relationship.from),
          );
          await retractRelationships(engineProlog, exactRemovedEdges);
        } else if (relationshipChanged) {
          const cleared = await engine.query("kb_retract_all_relationships");
          if (!cleared.success) {
            throw new SyncError(
              `Failed to clear changed relationship shards: ${cleared.error || "Unknown error"}`,
            );
          }
        }

        const entityIds = new Set<string>();
        for (const { entity } of results) {
          entityCounts[entity.type] = (entityCounts[entity.type] || 0) + 1;
        }
        const { entityCount, kbModified: entitiesModified } =
          await persistEntities(engineProlog, results, entityIds, {
            loadExistingEntityIds: !useEntityDelta,
          });

        const validationErrors = useEntityDelta
          ? []
          : validateRelationships(allRelationships, entityIds);
        if (validationErrors.length > 0) {
          console.warn(
            `Warning: ${validationErrors.length} dangling relationship(s) found`,
          );
        }
        const danglingKeys = new Set(
          validationErrors.map(
            ({ relationship }) =>
              `${relationship.type}|${relationship.from}|${relationship.to}`,
          ),
        );
        const shardDeltaByKey = new Map<string, ExtractedRelationship>();
        const shardCandidates =
          useEntityDelta && !materializeAllRelationships
            ? [
                ...addedShardRelationships,
                ...allRelationships.filter((relationship) =>
                  changedEntityIds.has(relationship.from),
                ),
              ]
            : allRelationships;
        for (const relationship of shardCandidates) {
          if (
            !danglingKeys.has(
              `${relationship.type}|${relationship.from}|${relationship.to}`,
            )
          ) {
            shardDeltaByKey.set(relationshipKey(relationship), relationship);
          }
        }
        const { relationshipCount, kbModified: relationshipsModified } =
          await persistRelationships(engineProlog, results, [
            ...shardDeltaByKey.values(),
          ]);

        const kbModified =
          removedCount > 0 ||
          relationshipChanged ||
          entitiesModified ||
          relationshipsModified;
        if (kbModified) engine.invalidateCache();
        const saveResult = await engine.save();
        if (!saveResult.success) {
          throw new SyncError(
            `Failed to save journaled KB: ${saveResult.error || "Unknown error"}`,
          );
        }

        const evictedHashes: Record<string, string> = {};
        const evictedSeenAt: Record<string, string> = {};
        const evictedSemanticHashes: Record<string, string> = {};
        const evictedSemanticContracts: Record<string, boolean> = {};
        for (const [key, hash] of Object.entries(nextHashes)) {
          if (failedCacheKeys.has(key)) continue;
          evictedHashes[key] = hash;
          evictedSeenAt[key] = nextSeenAt[key] ?? nowIso;
          if (nextSemanticHashes[key] !== undefined) {
            evictedSemanticHashes[key] = nextSemanticHashes[key];
            evictedSemanticContracts[key] = nextSemanticContracts[key] === true;
          }
        }
        writeSyncCache(path.join(livePath, "sync-cache.json"), {
          version: SYNC_CACHE_VERSION,
          hashes: evictedHashes,
          relationshipHashes: nextRelationshipHashes,
          entityHashes: nextEntityHashes,
          sourceEntityIds: nextSourceEntityIds,
          shardRelationships: nextShardRelationships,
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
          `✓ Imported ${entityCount} entities, ${relationshipCount} relationships (removed ${removedCount} entities)`,
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
      } finally {
        await engine.terminate();
      }
    }

    stagingPath = createUniqueStagingPath(currentBranch, workspaceRoot);
    const runtimeContext: SyncCommandRuntimeContext = {
      currentBranch,
      livePath,
      rebuild,
      stagingPath,
      validateOnly,
    };

    await prepareStagingEnvironment(stagingPath, livePath, rebuild);
    // Staging is a new compiled artifact, so install the exact identity fence
    // before the engine attaches. The manifest is published with the staged
    // store during the atomic swap.
    if (!existsSync(branchStoreManifestPath(stagingPath))) {
      writeFileSync(
        branchStoreManifestPath(stagingPath),
        `${JSON.stringify(expectedBranchStoreManifest(currentBranch), null, 2)}\n`,
        { mode: 0o600 },
      );
    }

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

      // A copied generation retains entities from old source contents. Remove
      // only successfully extracted/deleted sources before applying the new
      // entities; failed extraction deliberately leaves the previous data.
      await retractEntitiesForSources(
        prolog,
        [
          ...changedMarkdownFiles,
          ...changedManifestFiles,
          ...deletedSourceFiles,
        ].filter((file) => !failedCacheKeys.has(toCacheKey(file))),
      );

      if (relationshipChanged) {
        const clearRelationships = await prolog.query(
          "kb_retract_all_relationships",
        );
        if (!clearRelationships.success) {
          throw new SyncError(
            `Failed to clear changed relationship shards: ${clearRelationships.error || "Unknown error"}`,
          );
        }
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

      const journaledLive = existsSync(path.join(livePath, "storage.json"));
      if (recoveryBackupPath !== undefined) {
        if (!existsSync(livePath)) {
          throw new SyncError(
            `Recovery target disappeared before publication: ${livePath}`,
          );
        }
        if (existsSync(recoveryBackupPath)) {
          throw new SyncError(
            `Recovery backup path already exists: ${recoveryBackupPath}`,
          );
        }
        mkdirSync(path.dirname(recoveryBackupPath), { recursive: true });
        // Same-filesystem renames give us a recoverable two-step publication:
        // the original bytes stay at the reported backup path if anything
        // later needs forensic inspection.
        renameSync(livePath, recoveryBackupPath);
        try {
          renameSync(stagingPath, livePath);
        } catch (error) {
          renameSync(recoveryBackupPath, livePath);
          throw error;
        }
      } else if (rebuild && journaledLive) {
        atomicPublishGeneration(stagingPath, livePath);
      } else {
        atomicPublish(stagingPath, livePath);
      }
      fsyncJournaledBranchStore(livePath);
      try {
        if (
          recoveryBackupPath !== undefined &&
          recoveredPendingReceiptPaths.length > 0
        ) {
          clearRecoveredPendingSourceReceipts(
            workspaceRoot,
            recoveredPendingReceiptPaths,
          );
        }
      } finally {
        // Receipt compare-and-delete can fail closed after publication when a
        // newer receipt wins a race.  Staging bytes are still disposable;
        // leave the published store and surface the pending intent error.
        cleanupStaging(stagingPath);
      }

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
        relationshipHashes: nextRelationshipHashes,
        entityHashes: nextEntityHashes,
        sourceEntityIds: nextSourceEntityIds,
        shardRelationships: nextShardRelationships,
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
  } finally {
    publicationLease?.release();
  }
}

export { normalizeMarkdownPath } from "./sync/discovery.js";
