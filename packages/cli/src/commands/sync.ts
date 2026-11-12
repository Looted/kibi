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
import { markErrorReported } from "../cli-command.js";
import type { Diagnostic, SyncSummary } from "../diagnostics.js";
import {
  branchErrorToDiagnostic,
  createDocsNotIndexedDiagnostic,
  createInvalidAuthoringDiagnostic,
  createKbMissingDiagnostic,
  formatSyncSummary,
} from "../diagnostics.js";
import {
  type EngineAttachmentIdentity,
  EngineClient,
  type EnginePublicationLease,
  acquireEnginePublicationLease,
  engineSocketPath,
  ensureJournaledBranchStoreAsync,
  formatEngineAttachmentMismatch,
  fsyncJournaledBranchStore,
  parseEngineAttachmentIdentity,
  readEngineAttachmentIdentity,
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
import {
  type SymbolCompilerLockHandle,
  acquireSymbolCompilerLock,
  releaseSymbolCompilerLock,
} from "../operations/mutation/symbol-compiler-lock.js";
import { analyzeSemanticAdvisorInput } from "../operations/semantic-advisor/analyze-prose.js";
import { validateSemanticInventoryBoundary } from "../operations/semantic-advisor/ingestion-boundary.js";
import { sourceAnalyzerInstallProblems } from "../plugins/plugin-install-check.js";
import { PrologProcess } from "../prolog.js";
import { escapeAtom } from "../prolog/codec.js";
import {
  type BranchAttachment,
  detachedHeadWriteRefusal,
  resolveBranchAttachment,
} from "../utils/branch-resolver.js";
import {
  branchStoreManifestPath,
  branchStorePath,
  branchStoresRoot,
  ensureBranchStoreManifest,
  expectedBranchStoreManifest,
} from "../utils/branch-store-locator.js";
import {
  SYNC_CACHE_TTL_MS,
  SYNC_CACHE_VERSION,
  SYNC_COMPILER_FINGERPRINT,
  failedSourceKeepsSemanticBaseline,
  hashFile,
  hashManifestWithCoordinates,
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
  SyncError,
  pendingSourceEscapesError,
  pendingSourceHashDriftError,
  pendingSourceMissingError,
} from "./sync/errors.js";
import {
  normalizeExtractionSources,
  processExtractions,
} from "./sync/extraction.js";
import {
  normalizeManifestLayout,
  refreshManifestCoordinates,
} from "./sync/manifest.js";
import {
  persistEntities,
  persistRelationships,
  queryStoreTotals,
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
import {
  adoptUpsertOnlySymbolManifest,
  findUntrackedDocumentMatches,
} from "./sync/untracked-targets.js";

export { SyncError };

/** The output of a git command run in `cwd`; throws when git fails. */
export function gitText(cwd: string, command: string): string {
  return execSync(command, {
    cwd,
    encoding: "utf8",
    timeout: 5000,
    // rationale: stdio only keeps git's stderr off the terminal; the output
    // read here is the same either way, so no test can observe it.
    // Stryker disable next-line ArrayDeclaration,StringLiteral
    stdio: ["pipe", "pipe", "pipe"],
  });
}

export function relationshipKey(relationship: ExtractedRelationship): string {
  return `${relationship.type}\0${relationship.from}\0${relationship.to}`;
}

export function relationshipFromKey(key: string): ExtractedRelationship {
  const parts = key.split("\0");
  if (parts.length < 3) {
    throw new SyncError(
      `Invalid cached relationship key: ${key}`,
      "SYNC_CACHE_KEY_INVALID",
    );
  }
  const [type, from, to] = parts as [string, string, string];
  return { type, from, to };
}

/** The non-empty entries of a git command's output, or none when git fails. */
function gitEntries(cwd: string, command: string, separator: string): string[] {
  try {
    return gitText(cwd, command).split(separator).filter(Boolean);
  } catch {
    return [];
  }
}

export function assertNoUnresolvedGitConflicts(workspaceRoot: string): void {
  // A non-Git workspace is handled by branch resolution below. Do not turn
  // a missing Git binary into a misleading conflict diagnostic.
  const conflicted = gitEntries(
    workspaceRoot,
    "git diff --name-only --diff-filter=U --",
    "\n",
  );
  if (conflicted.length > 0) {
    throw new SyncError(
      `Unresolved Git conflicts block Kibi compilation; resolve these authored files first: ${conflicted.join(", ")}`,
      "GIT_CONFLICTS_UNRESOLVED",
    );
  }
}

/**
 * Sources staged as new files (renames included) that HEAD does not contain yet. An empty branch
 * store compiles its first sync as a semantic baseline, which accepts
 * requirements without an inventory. Once another branch of the workspace has
 * synced, that grace covers committed history only: a new branch must not
 * accept a staged requirement its parent branch would refuse. Without a HEAD
 * commit (or outside Git) there is no history to tell apart, and the set is
 * empty.
 */
export function stagedNewSourceKeys(workspaceRoot: string): Set<string> {
  // Git prints forward-slash paths on every platform.
  return new Set(
    gitEntries(
      workspaceRoot,
      // --no-renames: a staged rename is a new source key too, judged on
      // the parent branch like any other addition.
      "git diff --cached --no-renames --name-only --relative --diff-filter=A -z HEAD",
      "\0",
    ),
  );
}

/** Whether a branch store other than `livePath` has a non-empty sync cache. */
export function anotherBranchStoreSynced(
  workspaceRoot: string,
  livePath: string,
): boolean {
  const root = branchStoresRoot(workspaceRoot);
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return false;
  }
  for (const entry of entries) {
    const storePath = path.join(root, entry);
    if (path.resolve(storePath) === path.resolve(livePath)) continue;
    try {
      const cache = JSON.parse(
        readFileSync(path.join(storePath, "sync-cache.json"), "utf8"),
      ) as { hashes?: unknown };
      // Null hashes throw here: such a cache is unreadable too.
      if (
        typeof cache.hashes === "object" &&
        Object.keys(cache.hashes as object).length > 0
      )
        return true;
    } catch {
      // A store without a readable cache has not synced.
    }
  }
  return false;
}

export function trackedRelationshipFiles(
  workspaceRoot: string,
  relationshipsDir: string,
  recoverMissingPendingSources = false,
  recoveredPendingReceiptPaths?: PendingSourceReceiptSnapshot[],
): string[] {
  let tracked: Set<string>;
  try {
    tracked = new Set(
      gitText(
        workspaceRoot,
        "git ls-files --cached -- .kb/relationships",
      ).split("\n"),
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
        throw pendingSourceEscapesError(relative);
      }
      if (!existsSync(absolute)) {
        if (recoverMissingPendingSources) {
          const receiptPath = path.join(pendingRoot, receiptName);
          if (
            !recoveredPendingReceiptPaths?.some(
              (candidate) => candidate.receiptPath === receiptPath,
            )
          ) {
            recoveredPendingReceiptPaths?.push({
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
        throw pendingSourceMissingError(relative);
      }
      const actual = createHash("sha256")
        .update(readFileSync(absolute))
        .digest("hex");
      if (actual !== receipt.afterHash) {
        throw pendingSourceHashDriftError(relative, receipt.afterHash, actual);
      }
      pending.add(relative);
    }
  }

  let names: string[];
  try {
    names = readdirSync(relationshipsDir);
  } catch {
    return [];
  }
  return names
    .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))
    .map((file) => path.join(relationshipsDir, file))
    .filter((file) => {
      const relative = path
        .relative(workspaceRoot, file)
        .replaceAll(path.sep, "/");
      return tracked.has(relative) || pending.has(relative);
    })
    .sort();
}

export function normalizedEntityHash(result: ExtractionResult): string {
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

export function semanticBoundaryRelationships(
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

export async function checkpointNoopSync(
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
        "SYNC_CHECKPOINT_FAILED",
      );
    }
  } finally {
    await engine.terminate();
  }
}

/** Whether the branch's compiled store already holds any of `ids`. */
export async function storeHoldsAnyEntity(
  workspaceRoot: string,
  branch: string,
  ids: readonly string[],
): Promise<boolean> {
  const engine = new EngineClient({
    workspaceRoot,
    branch,
    timeout: 120_000,
  });
  try {
    await engine.start();
    for (const id of ids) {
      const found = await engine.queryEntities({ id, limit: 1, offset: 0 });
      if (found.count > 0 || found.entities.length > 0) return true;
    }
    return false;
  } catch {
    // Adoption is best effort: an unreadable store adopts nothing and the
    // compile below reports the store itself.
    return false;
  } finally {
    await engine.terminate();
  }
}

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
  acquireSymbolCompilerLock?: typeof acquireSymbolCompilerLock;
}

export function compilerCacheHasEntityDelta(cache: SyncCache): boolean {
  return (
    cache.entityHashes !== undefined && cache.sourceEntityIds !== undefined
  );
}

/**
 * Name every dangling relationship and its missing endpoint, and say when an
 * endpoint is declared in a source sync cannot see (untracked by Git and
 * without a pending-source receipt): staging that file is the fix.
 */
export function reportDanglingRelationships(
  workspaceRoot: string,
  validationErrors: ReturnType<typeof validateRelationships>,
): void {
  console.warn(
    `Warning: ${validationErrors.length} dangling relationship(s) found`,
  );
  const missing = new Set<string>();
  for (const { relationship, error } of validationErrors) {
    const endpoint =
      error === "missing_from" ? relationship.from : relationship.to;
    missing.add(endpoint);
    console.warn(
      `  - ${error}: ${relationship.type} ${relationship.from} -> ${relationship.to} (${endpoint} is not in this branch's sources)`,
    );
  }
  const untracked = findUntrackedDocumentMatches(workspaceRoot, [...missing]);
  const byFile = new Map<string, string[]>();
  for (const [id, file] of untracked) {
    byFile.set(file, [...(byFile.get(file) ?? []), id]);
  }
  for (const [file, ids] of byFile) {
    console.warn(
      `  Note: ${ids.sort().join(", ")} ${ids.length === 1 ? "is" : "are"} declared in ${file}, which Git does not track and no pending-source receipt covers, so sync ignores it. Run \`git add ${file}\` (staging is enough) or rewrite the entity with kb_upsert, then sync again.`,
    );
  }
}

export function compilerCacheIsFresh(
  cache: SyncCache,
  workspaceRoot: string,
  sourceFiles: readonly string[],
  nowMs: number,
): boolean {
  const sourceKeys = sourceFiles.map((file) => toCacheKey(workspaceRoot, file));
  if (Object.keys(cache.hashes).some((key) => !sourceKeys.includes(key))) {
    return false;
  }
  return sourceKeys.every((key) => {
    // A missing or unreadable sighting parses to NaN, which is never fresh.
    const lastSeenMs = Date.parse(String(cache.seenAt[key]));
    return (
      typeof cache.hashes[key] === "string" &&
      nowMs - lastSeenMs <= SYNC_CACHE_TTL_MS
    );
  });
}

export function compilerCacheFilesMatch(
  cache: SyncCache,
  workspaceRoot: string,
  sourceFiles: readonly string[],
  relationshipFiles: readonly string[],
  sourceHashOf: (file: string) => string,
): boolean {
  for (const file of sourceFiles) {
    if (cache.hashes[toCacheKey(workspaceRoot, file)] !== sourceHashOf(file))
      return false;
  }
  const relationshipKeys = new Set(
    relationshipFiles.map((file) => toCacheKey(workspaceRoot, file)),
  );
  if (
    Object.keys(cache.relationshipHashes ?? {}).some(
      (key) => !relationshipKeys.has(key),
    )
  ) {
    return false;
  }
  for (const file of relationshipFiles) {
    if (
      cache.relationshipHashes?.[toCacheKey(workspaceRoot, file)] !==
      hashFile(workspaceRoot, file)
    )
      return false;
  }
  return true;
}

export function warnFailedSourceHash(file: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`Warning: Failed to hash ${file}: ${message}`);
}

export function rememberChangedSourceOrWarn(
  file: string,
  apply: () => void,
): void {
  try {
    apply();
  } catch (error) {
    warnFailedSourceHash(file, error);
  }
}

export function maybePushKbMissingDiagnostic(
  diagnostics: Diagnostic[],
  kbExists: boolean,
  rebuild: boolean,
  currentBranch: string,
  livePath: string,
): void {
  if (!kbExists && !rebuild) {
    diagnostics.push(createKbMissingDiagnostic(currentBranch, livePath));
  }
}

export function assertRelationshipsCleared(result: {
  success: boolean;
  error?: string;
}): void {
  if (!result.success) {
    throw new SyncError(
      `Failed to clear changed relationship shards: ${result.error || "Unknown error"}`,
      "RELATIONSHIP_SHARD_CLEAR_FAILED",
    );
  }
}

export function maybePushDocsNotIndexedDiagnostic(
  diagnostics: Diagnostic[],
  performedFullReindex: boolean,
  markdownFileCount: number,
  entityCount: number,
): void {
  if (performedFullReindex && entityCount < markdownFileCount) {
    diagnostics.push(
      createDocsNotIndexedDiagnostic(markdownFileCount, entityCount),
    );
  }
}

/**
 * The entity types an authoring error says were embedded where they do not
 * belong, or null when the error is not about embedding.
 */
export function embeddedEntityTypes(message: string): string[] | null {
  const types = ["scenario", "test"].filter((type) => message.includes(type));
  if (types.length > 0) return types;
  return message.includes("Embedded Entity Violation") ? ["entity"] : null;
}

/** Print each extraction error and the failure count. */
export function reportValidationErrors(
  errors: ReadonlyArray<{ file: string; message: string }>,
): void {
  for (const err of errors) {
    console.error(`${err.file}: ${err.message}`);
  }
  console.error(`FAILED: ${errors.length} errors found`);
}

/** Everything one sync compiled, before failed sources are left out. */
export interface NextSyncCache {
  hashes: Record<string, string>;
  seenAt: Record<string, string>;
  semanticHashes: Record<string, string>;
  semanticContracts: Record<string, boolean>;
  relationshipHashes: Record<string, string>;
  entityHashes: Record<string, string>;
  sourceEntityIds: Record<string, string[]>;
  shardRelationships: Record<string, string[]>;
  extractionFailures: NonNullable<SyncCache["extractionFailures"]>;
  nowIso: string;
}

/**
 * The cache a sync writes: every compiled source except those `skip` names,
 * so a skipped source recompiles next time.
 */
export function compiledSyncCache(
  next: NextSyncCache,
  skip: (key: string) => boolean,
): SyncCache {
  const hashes: Record<string, string> = {};
  const seenAt: Record<string, string> = {};
  const semanticHashes: Record<string, string> = {};
  const semanticContracts: Record<string, boolean> = {};
  for (const [key, hash] of Object.entries(next.hashes)) {
    if (skip(key)) continue;
    hashes[key] = hash;
    seenAt[key] = next.seenAt[key] ?? next.nowIso;
    const semanticHash = next.semanticHashes[key];
    if (semanticHash !== undefined) {
      semanticHashes[key] = semanticHash;
      semanticContracts[key] = next.semanticContracts[key] === true;
    }
  }
  return {
    version: SYNC_CACHE_VERSION,
    hashes,
    relationshipHashes: next.relationshipHashes,
    entityHashes: next.entityHashes,
    sourceEntityIds: next.sourceEntityIds,
    shardRelationships: next.shardRelationships,
    seenAt,
    semanticHashes,
    semanticContracts,
    compilerFingerprint: SYNC_COMPILER_FINGERPRINT,
    extractionFailures: next.extractionFailures,
  };
}

export async function syncCommand(
  options: {
    validateOnly?: boolean;
    rebuild?: boolean;
    refreshSymbolCoordinates?: boolean;
    /** Explicitly rebuild an unreadable branch store from authored sources. */
    recoveryBackupPath?: string;
    /** Workspace to operate on when invoked through MCP or another host. */
    workspaceRoot?: string;
    /**
     * Internal: compile the read-only snapshot of a detached checkout into
     * the attachment from resolveReadBranchAttachment instead of a branch KB.
     */
    detachedSnapshot?: BranchAttachment;
    /** Keep stdout clean for a host's own output; stderr still reports. */
    quiet?: boolean;
    /**
     * Compile the store and write nothing Git tracks: no block-layout
     * rewrite of the symbol manifest and no adoption receipt. Auto-sync on
     * a store's first use runs this, so a read never dirties the checkout.
     */
    compileOnly?: boolean;
  } = {},
  runtime: SyncCommandRuntime = {},
): Promise<SyncResult> {
  const validateOnly = options.validateOnly ?? false;
  const info: (...args: unknown[]) => void = options.quiet
    ? () => undefined
    : (...args) => console.log(...args);
  const rebuild = options.rebuild ?? false;
  const recoveryBackupPath = options.recoveryBackupPath;
  const workspaceRoot = path.resolve(options.workspaceRoot ?? process.cwd());
  const startTime = Date.now();
  const diagnostics: Diagnostic[] = [];
  const entityCounts: Record<string, number> = {};
  let currentBranch: string | undefined;
  let stagingPath: string | undefined;
  let publicationLease: EnginePublicationLease | undefined;
  let compilerLock: SymbolCompilerLockHandle | undefined;
  let operationFailure: { readonly error: unknown } | undefined;

  const getCurrentCommit = (): string | undefined =>
    gitEntries(workspaceRoot, "git rev-parse HEAD", "\n")[0];

  const withOptionalCommit = <T extends object>(
    value: T,
    commit: string | undefined,
  ): T & { commit?: string } =>
    commit !== undefined ? { ...value, commit } : value;

  /** The result of a sync that published nothing. */
  const unpublished = (branch: string, success: boolean): SyncResult =>
    withOptionalCommit(
      {
        branch,
        timestamp: new Date().toISOString(),
        entityCounts,
        relationshipCount: 0,
        success,
        published: false,
        failures: diagnostics,
        durationMs: Date.now() - startTime,
        exitCode: success ? 0 : 1,
      },
      getCurrentCommit(),
    );

  try {
    if (!validateOnly) {
      compilerLock = await (
        runtime.acquireSymbolCompilerLock ?? acquireSymbolCompilerLock
      )(workspaceRoot);
    }
    assertNoUnresolvedGitConflicts(workspaceRoot);
    // Branch resolution
    if (
      options.detachedSnapshot !== undefined &&
      options.detachedSnapshot.kind !== "detached_snapshot"
    ) {
      throw new SyncError(
        "Only a detached HEAD snapshot attachment can be compiled explicitly",
        "SNAPSHOT_COMPILE_REFUSED",
      );
    }
    const branchResult =
      options.detachedSnapshot ?? resolveBranchAttachment(workspaceRoot);

    if ("error" in branchResult) {
      // A detached HEAD has no branch KB to compile; name the way out and
      // that reads keep working from the checkout's read-only snapshot.
      const reason =
        branchResult.code === "DETACHED_HEAD"
          ? detachedHeadWriteRefusal("kibi sync", workspaceRoot)
          : branchResult.error;
      const diagnostic = branchErrorToDiagnostic(branchResult.code, reason);
      diagnostics.push(diagnostic);
      console.error(`Failed to resolve active branch: ${reason}`);
      throw new SyncError(
        `Failed to resolve active branch: ${reason}`,
        "BRANCH_RESOLUTION_FAILED",
      );
    }

    if (branchResult.migrationRequired && !validateOnly) {
      throw new SyncError(
        `Sync blocked: KB is attached through legacy branch storage for '${branchResult.gitBranch}'. Run 'kibi branch migrate --from ${branchResult.kbBranch} --to ${branchResult.gitBranch} --apply' first.`,
        "LEGACY_BRANCH_STORAGE",
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
    // An untracked symbol manifest that only kb_upsert ever wrote (older Kibi
    // left it without a pending-source receipt) gets the receipt here, so
    // this sync compiles it and records its content hash. Without it the
    // sources its symbols reference read as newer after every clone.
    if (
      !validateOnly &&
      options.compileOnly !== true &&
      recoveryBackupPath === undefined &&
      options.detachedSnapshot === undefined &&
      runtime.createProlog === undefined
    ) {
      const branch = currentBranch;
      await adoptUpsertOnlySymbolManifest(workspaceRoot, (ids) =>
        storeHoldsAnyEntity(workspaceRoot, branch, ids),
      );
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
            "ENGINE_SOCKET_UNREACHABLE",
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
    const syncCache = readSyncCache(cachePath, undefined, {
      compilerFingerprint: SYNC_COMPILER_FINGERPRINT,
    });
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const currentSourceKeys = new Set(
      sourceFiles.map((file) => toCacheKey(workspaceRoot, file)),
    );
    const relationshipShardFiles = existsSync(relationshipsDir)
      ? trackedRelationshipFiles(
          workspaceRoot,
          relationshipsDir,
          recoveryBackupPath !== undefined,
          recoveredPendingReceiptPaths,
        )
      : [];

    // A manifest an older writer left in flow layout is rewritten as block
    // YAML before anything hashes it, ahead of the no-op fast path below, so
    // a project whose cache is already fresh still gets it on the next sync.
    if (!validateOnly && options.compileOnly !== true) {
      for (const file of manifestFiles) {
        const normalized = normalizeManifestLayout(file);
        if (normalized !== null) {
          console.log(
            `\u2713 Rewrote ${path.relative(workspaceRoot, file)} in block layout (${normalized} symbol${normalized === 1 ? "" : "s"})`,
          );
        }
      }
    }

    // Symbol coordinates are derived from the source tree and kept in a
    // gitignored artifact. Bring it up to date before anything hashes it, so
    // a source edit that moved a declaration recompiles the manifest. Only
    // symbols whose identity or source bytes changed are extracted again.
    // An explicit --refresh-symbol-coordinates run re-extracts everything
    // below instead.
    if (!validateOnly && !options.refreshSymbolCoordinates) {
      for (const file of manifestFiles) {
        try {
          await refreshManifestCoordinates(file, workspaceRoot, {
            incremental: true,
            // A read-only snapshot compile keeps the reader's stdout clean.
            ...(options.quiet === true ? { quiet: true } : {}),
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.warn(
            `Warning: could not update symbol coordinates for ${path.relative(workspaceRoot, file)}: ${message}`,
          );
        }
      }
    }

    // No-op is a first-class compiler result. Hashing the configured inputs is
    // sufficient when normalized entity/shard inventories are already fresh;
    // avoid rebuilding maps and rediscovering RDF state for the common path.
    // Symbol manifests hash together with their generated coordinate artifact
    // so artifact-only changes never masquerade as no-ops.
    const fastPathSourceHashOf = (file: string): string =>
      manifestFiles.includes(file)
        ? hashManifestWithCoordinates(
            workspaceRoot,
            file,
            path.join(path.dirname(file), "symbol-coordinates.yaml"),
          )
        : hashFile(workspaceRoot, file);
    if (
      !validateOnly &&
      !rebuild &&
      !options.refreshSymbolCoordinates &&
      runtime.createProlog === undefined &&
      compilerCacheHasEntityDelta(syncCache) &&
      compilerCacheIsFresh(syncCache, workspaceRoot, sourceFiles, nowMs) &&
      compilerCacheFilesMatch(
        syncCache,
        workspaceRoot,
        sourceFiles,
        relationshipShardFiles,
        fastPathSourceHashOf,
      )
    ) {
      await checkpointNoopSync(workspaceRoot, currentBranch);
      info("✓ Imported 0 entities, 0 relationships (no changes)");
      return unpublished(currentBranch, true);
    }

    // Explicit coordinate refresh must precede fingerprinting so the manifest
    // overlay that is persisted into RDF observes the newly generated
    // coordinates. Refresh failures are fatal: cache state may never advance
    // on a partially published compiler dependency.
    const refreshedManifestKeys = new Set<string>();
    if (!validateOnly && options.refreshSymbolCoordinates) {
      // A declared source analyzer that is missing or not the qualified
      // build would drop every coordinate it places; refuse the refresh and
      // keep the stored coordinates instead of reporting success.
      const installProblems = sourceAnalyzerInstallProblems(workspaceRoot);
      if (installProblems.length > 0)
        throw new SyncError(
          `Symbol coordinate refresh refused: ${installProblems.map((row) => row.problem).join("; ")}. ${installProblems.map((row) => row.fix).join(" ")} The stored coordinates were kept.`,
          "SOURCE_ANALYZER_UNAVAILABLE",
        );
      for (const file of manifestFiles) {
        await refreshManifestCoordinates(file, workspaceRoot, {
          refreshSymbolCoordinates: options.refreshSymbolCoordinates,
        });
        refreshedManifestKeys.add(toCacheKey(workspaceRoot, file));
      }
    }

    // The generated coordinate artifact is a compiler dependency of every
    // symbol manifest: its existence, emptiness, content, and deletion must
    // all change the effective source hash even when authored YAML is stable.
    const coordinatesPathForManifest = (manifestFile: string): string =>
      path.join(path.dirname(manifestFile), "symbol-coordinates.yaml");
    const effectiveSourceHash = (file: string): string =>
      manifestFiles.includes(file)
        ? hashManifestWithCoordinates(
            workspaceRoot,
            file,
            coordinatesPathForManifest(file),
          )
        : hashFile(workspaceRoot, file);

    const hashedSources = sourceFiles.map((file) => ({
      file,
      key: toCacheKey(workspaceRoot, file),
      hash: effectiveSourceHash(file),
    }));

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
    // On a first sync every source joins the semantic baseline, except a
    // source staged as new while another branch store has already synced:
    // that one is judged as an addition.
    const baselineExcludedKeys = initialSemanticBaseline
      ? anotherBranchStoreSynced(workspaceRoot, livePathForEngine)
        ? stagedNewSourceKeys(workspaceRoot)
        : new Set<string>()
      : undefined;
    const inSemanticBaseline = (key: string): boolean =>
      baselineExcludedKeys !== undefined && !baselineExcludedKeys.has(key);

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
      const key = toCacheKey(workspaceRoot, shardPath);
      currentRelationshipKeys.add(key);
      let hash: string | undefined;
      try {
        hash = hashFile(workspaceRoot, shardPath);
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

    for (const { file, key, hash } of hashedSources) {
      rememberChangedSourceOrWarn(file, () => {
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
          if (expired) forceEntitySourceKeys.add(key);
          if (markdownFiles.includes(file)) {
            changedMarkdownFiles.push(file);
          } else {
            changedManifestFiles.push(file);
          }
        }
      });
    }

    // A v1 cache has only whole-file hashes. Perform one compiler-metadata
    // backfill so subsequent edits can be reduced to normalized entity deltas.
    const supportsEntityDelta = compilerCacheHasEntityDelta(syncCache);
    if (!supportsEntityDelta) {
      for (const file of markdownFiles) {
        if (!changedMarkdownFiles.includes(file))
          changedMarkdownFiles.push(file);
      }
      for (const file of manifestFiles) {
        if (!changedManifestFiles.includes(file))
          changedManifestFiles.push(file);
      }
    }

    // Explicitly requested refreshes force coordinate-bearing symbols through
    // extraction and RDF persistence even when normalized entity hashes match
    // the cached state, repairing warm-cache RDF divergence.
    for (const file of manifestFiles) {
      if (
        !refreshedManifestKeys.has(toCacheKey(workspaceRoot, file)) ||
        changedManifestFiles.includes(file)
      ) {
        continue;
      }
      changedManifestFiles.push(file);
    }
    for (const key of refreshedManifestKeys) {
      forceEntitySourceKeys.add(key);
    }

    const performedFullReindex =
      changedMarkdownFiles.length === markdownFiles.length &&
      changedManifestFiles.length === manifestFiles.length;

    const extraction = await processExtractions(
      changedMarkdownFiles,
      changedManifestFiles,
      validateOnly,
      workspaceRoot,
    );
    const { failedCacheKeys, errors } = extraction;
    // Sources sync could not extract stay out of the store; record them so
    // kb_status can say so. A source that failed in the store's first
    // compilation (and in every sync since) is legacy content that missed the
    // semantic baseline, so it keeps the baseline treatment once it compiles.
    // One that compiled before keeps the semantic hash it last compiled with,
    // so restoring its prose (or fixing only what failed) is not new authoring.
    const previousExtractionFailures = syncCache.extractionFailures ?? {};
    const nextExtractionFailures: NonNullable<SyncCache["extractionFailures"]> =
      {};
    for (const failure of extraction.failures) {
      const key = toCacheKey(workspaceRoot, failure.file);
      const hash = nextHashes[key];
      if (hash === undefined) continue;
      const previousFailure = previousExtractionFailures[key];
      const semanticHash =
        syncCache.semanticHashes[key] ?? previousFailure?.semanticHash;
      const semanticContract =
        syncCache.semanticContracts[key] ?? previousFailure?.semanticContract;
      nextExtractionFailures[key] = {
        hash,
        message: failure.message,
        ...(inSemanticBaseline(key) || previousFailure?.baseline === true
          ? { baseline: true }
          : {}),
        ...(semanticHash !== undefined ? { semanticHash } : {}),
        ...(semanticContract !== undefined ? { semanticContract } : {}),
      };
    }
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
    const allRelationships = Object.values(nextShardRelationships)
      .flat()
      .map(relationshipFromKey);

    for (const deletedSource of deletedSourceFiles) {
      const sourceKey = toCacheKey(workspaceRoot, deletedSource);
      for (const id of nextSourceEntityIds[sourceKey] ?? []) {
        removedEntityIds.add(id);
        delete nextEntityHashes[id];
      }
      delete nextSourceEntityIds[sourceKey];
    }

    const resultsBySource = new Map<string, ExtractionResult[]>();
    for (const result of extractedResults) {
      const sourceKey = toCacheKey(workspaceRoot, result.entity.source);
      const sourceResults = resultsBySource.get(sourceKey) ?? [];
      sourceResults.push(result);
      resultsBySource.set(sourceKey, sourceResults);
    }
    for (const changedSource of [
      ...changedMarkdownFiles,
      ...changedManifestFiles,
    ]) {
      const sourceKey = toCacheKey(workspaceRoot, changedSource);
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

    // Every drifted inventory is reported in one run, not one per sync attempt.
    const inventoryFailures: string[] = [];
    // Requirements with no inventory at all: kibi migrate re-derives only an
    // inventory a requirement already states, so they need the advisor.
    const uninventoried: string[] = [];
    for (const result of extractedResults) {
      if (result.entity.type !== "req") continue;
      const key = toCacheKey(workspaceRoot, result.entity.source);
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
      // A source the last sync could not extract is judged by what it last
      // compiled with, by the rule kb_upsert applies to that file.
      const previousFailure =
        syncCache.hashes[key] === undefined
          ? previousExtractionFailures[key]
          : undefined;
      const enforceBoundary =
        advertisedContract ||
        (previousFailure !== undefined
          ? !failedSourceKeepsSemanticBaseline(
              previousFailure,
              boundary.sourceHash,
            )
          : (syncCache.hashes[key] === undefined && !inSemanticBaseline(key)) ||
            syncCache.semanticContracts[key] === true ||
            (previousSemanticHash !== undefined &&
              previousSemanticHash !== boundary.sourceHash));
      if (enforceBoundary && boundary.errors.length > 0) {
        inventoryFailures.push(
          `${key}: proposition-complete ingestion failed: ${boundary.errors.join("; ")}.`,
        );
        if (!advertisedContract) uninventoried.push(result.entity.id);
        continue;
      }
      nextSemanticHashes[key] = boundary.sourceHash;
      nextSemanticContracts[key] = advertisedContract;
    }
    if (inventoryFailures.length > 0) {
      throw new SyncError(
        [
          `${inventoryFailures.length} requirement(s) failed proposition-complete ingestion:`,
          ...inventoryFailures.map((failure) => `  ${failure}`),
          ...(uninventoried.length > 0
            ? [
                `${uninventoried.join(", ")} state(s) no inventory, which 'kibi migrate' does not derive: for each, run kb_model mode analyze (CLI: semantic-advisor) with the requirement's id and its complete semantic_text, then write the returned inventory contract into the requirement (kb_upsert with semantic_inventory, semantic_inventory_version, semantic_source_field, semantic_source_hash and logic_claims), or retire it through a superseding requirement.`,
              ]
            : []),
          ...(uninventoried.length < inventoryFailures.length
            ? [
                "Run 'kibi migrate' to re-derive inventories that drifted with the semantic advisor (it lists any that need a manual fix), or run kb_model mode analyze with the requirement's id and complete prose and preserve its inventory contract.",
              ]
            : []),
        ].join("\n"),
        "INVENTORY_INGESTION_FAILED",
      );
    }

    // Collect INVALID_AUTHORING diagnostics
    for (const err of errors) {
      const embeddedTypes = embeddedEntityTypes(err.message);
      if (embeddedTypes !== null) {
        diagnostics.push(
          createInvalidAuthoringDiagnostic(err.file, embeddedTypes),
        );
      }
    }

    if (validateOnly && errors.length > 0 && results.length === 0) {
      reportValidationErrors(errors);
      return unpublished(currentBranch, false);
    }

    const nextCache: NextSyncCache = {
      hashes: nextHashes,
      seenAt: nextSeenAt,
      semanticHashes: nextSemanticHashes,
      semanticContracts: nextSemanticContracts,
      relationshipHashes: nextRelationshipHashes,
      entityHashes: nextEntityHashes,
      sourceEntityIds: nextSourceEntityIds,
      shardRelationships: nextShardRelationships,
      extractionFailures: nextExtractionFailures,
      nowIso,
    };
    if (
      results.length === 0 &&
      removedEntityIds.size === 0 &&
      !relationshipChanged &&
      (useEntityDelta || changedMarkdownFiles.length === 0) &&
      (useEntityDelta || changedManifestFiles.length === 0) &&
      deletedSourceFiles.length === 0 &&
      !rebuild
    ) {
      // The durable KB checkpoint must precede the cache write: if the
      // checkpoint fails, cached fingerprints must stay stale so the next
      // sync recompiles instead of trusting uncommitted compiler output.
      if (runtime.createProlog === undefined) {
        await checkpointNoopSync(workspaceRoot, currentBranch);
      }

      writeSyncCache(
        cachePath,
        compiledSyncCache(nextCache, (key) => failedCacheKeys.has(key)),
      );

      info("✓ Imported 0 entities, 0 relationships (no changes)");
      return unpublished(currentBranch, true);
    }

    const livePath = branchStorePath(workspaceRoot, currentBranch);
    const kbExists = existsSync(livePath);
    maybePushKbMissingDiagnostic(
      diagnostics,
      kbExists,
      rebuild,
      currentBranch,
      livePath,
    );

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
        // Compilation reads (source lookups before retracts) must finish;
        // operator read limits are for interactive queries.
        readLimits: null,
      });
      const engineProlog = engine as unknown as PrologProcess;
      try {
        await engine.start();

        const describeAttachment = async (): Promise<{
          live: EngineAttachmentIdentity | null;
          attached: EngineAttachmentIdentity | null;
        }> => {
          const live = readEngineAttachmentIdentity(livePath);
          try {
            const status = await engine.queryStatusJson();
            return {
              live,
              attached: parseEngineAttachmentIdentity(
                status.bindings.JsonString,
              ),
            };
          } catch {
            return { live, attached: null };
          }
        };

        const mutationFailure = async (
          operation: string,
          cause: string,
        ): Promise<string> => {
          const { live, attached } = await describeAttachment();
          return `${cause}; ${formatEngineAttachmentMismatch(
            operation,
            live,
            attached,
          )}`;
        };

        const successfulChangedSources = [
          ...changedMarkdownFiles,
          ...changedManifestFiles,
        ].filter(
          (file) => !failedCacheKeys.has(toCacheKey(workspaceRoot, file)),
        );
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
          const clearChangedShards = async (): Promise<void> => {
            const cleared = await engine.query("kb_retract_all_relationships");
            if (!cleared.success) {
              throw new SyncError(
                await mutationFailure(
                  "kb_retract_all_relationships",
                  `Failed to clear changed relationship shards: ${cleared.error || "Unknown error"}`,
                ),
                "RELATIONSHIP_SHARD_CLEAR_FAILED",
              );
            }
          };
          try {
            await clearChangedShards();
          } catch {
            await engine.stop().catch(() => undefined);
            await engine.start();
            await clearChangedShards();
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
          reportDanglingRelationships(workspaceRoot, validationErrors);
        }
        const danglingKeys = new Set(
          validationErrors.map(
            ({ relationship }) =>
              `${relationship.type}|${relationship.from}|${relationship.to}`,
          ),
        );
        const shardDeltaByKey = new Map<string, ExtractedRelationship>();
        // Without a refreshed source no entity changed, so only the edges a
        // shard added are new.
        const shardCandidates = materializeAllRelationships
          ? allRelationships
          : addedShardRelationships;
        for (const relationship of shardCandidates) {
          if (
            !danglingKeys.has(
              `${relationship.type}|${relationship.from}|${relationship.to}`,
            )
          ) {
            shardDeltaByKey.set(relationshipKey(relationship), relationship);
          }
        }
        const {
          relationshipCount,
          kbModified: relationshipsModified,
          retrySources,
        } = await persistRelationships(
          engineProlog,
          results,
          [...shardDeltaByKey.values()],
          { workspaceRoot },
        );
        const relationshipRetryKeys = new Set(
          retrySources.map((source) => toCacheKey(workspaceRoot, source)),
        );

        const storeTotals = await queryStoreTotals(engineProlog);
        const kbModified =
          removedCount > 0 ||
          relationshipChanged ||
          entitiesModified ||
          relationshipsModified;
        if (kbModified) engine.invalidateCache();
        const saveResult = await engine.save();
        if (!saveResult.success) {
          throw new SyncError(
            await mutationFailure(
              "kb_save",
              `Failed to save journaled KB: ${saveResult.error || "Unknown error"}`,
            ),
            "KB_SAVE_FAILED",
          );
        }

        writeSyncCache(
          path.join(livePath, "sync-cache.json"),
          compiledSyncCache(
            nextCache,
            (key) => failedCacheKeys.has(key) || relationshipRetryKeys.has(key),
          ),
        );

        maybePushDocsNotIndexedDiagnostic(
          diagnostics,
          performedFullReindex,
          markdownFiles.length,
          entityCount,
        );
        info(
          `✓ Imported ${entityCount} entities, ${relationshipCount} relationships (removed ${removedCount} entities)`,
        );
        const commit = getCurrentCommit();
        const summary: SyncSummary = withOptionalCommit(
          {
            branch: currentBranch,
            timestamp: new Date().toISOString(),
            entityCounts,
            ...(storeTotals !== undefined ? { storeTotals } : {}),
            relationshipCount,
            success: true,
            published: true,
            failures: diagnostics,
            durationMs: Date.now() - startTime,
          },
          commit,
        );
        info(formatSyncSummary(summary));
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

    const prolog =
      runtime.createProlog?.({ timeout: 120000 }) ??
      new PrologProcess({ timeout: 120000 });
    await prolog.start();

    const attachResult = await prolog.query(
      `kb_attach('${escapeAtom(stagingPath)}')`,
    );

    if (!attachResult.success) {
      await prolog.terminate();
      throw new SyncError(
        `Failed to attach to staging KB: ${attachResult.error || "Unknown error"}`,
        "STAGING_ATTACH_FAILED",
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
      ].filter((file) => !failedCacheKeys.has(toCacheKey(workspaceRoot, file))),
    );

    if (relationshipChanged) {
      const clearRelationships = await prolog.query(
        "kb_retract_all_relationships",
      );
      assertRelationshipsCleared(clearRelationships);
    }

    const { entityCount, kbModified: entitiesModified } = await persistEntities(
      prolog,
      results,
      entityIds,
    );

    const validationErrors = validateRelationships(allRelationships, entityIds);
    if (validationErrors.length > 0) {
      reportDanglingRelationships(workspaceRoot, validationErrors);
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
    const {
      relationshipCount,
      kbModified: relationshipsModified,
      retrySources,
    } = await persistRelationships(prolog, results, validRelationships, {
      workspaceRoot,
    });
    const relationshipRetryKeys = new Set(
      retrySources.map((source) => toCacheKey(workspaceRoot, source)),
    );

    const kbModified = entitiesModified || relationshipsModified;

    if (validateOnly) {
      await prolog.query("kb_detach");
      await prolog.terminate();
      cleanupStaging(stagingPath);

      if (errors.length > 0) {
        reportValidationErrors(errors);
        return unpublished(currentBranch, false);
      }

      info(`OK: Validation passed (${entityCount} entities)`);
      return unpublished(currentBranch, true);
    }

    if (kbModified) {
      prolog.invalidateCache();
    }

    await runtime.beforeSave?.({ ...runtimeContext, kbModified });
    const storeTotals = await queryStoreTotals(prolog);

    const saveResult = await prolog.query("kb_save");
    if (!saveResult.success) {
      throw new SyncError(
        `Failed to save staging KB: ${saveResult.error || "Unknown error"}`,
        "STAGING_SAVE_FAILED",
      );
    }
    await prolog.query("kb_detach");
    await prolog.terminate();

    const journaledLive = existsSync(path.join(livePath, "storage.json"));
    if (recoveryBackupPath !== undefined) {
      if (!existsSync(livePath)) {
        throw new SyncError(
          `Recovery target disappeared before publication: ${livePath}`,
          "RECOVERY_TARGET_MISSING",
        );
      }
      if (existsSync(recoveryBackupPath)) {
        throw new SyncError(
          `Recovery backup path already exists: ${recoveryBackupPath}`,
          "RECOVERY_BACKUP_EXISTS",
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

    writeSyncCache(
      path.join(livePath, "sync-cache.json"),
      compiledSyncCache(
        nextCache,
        (key) => failedCacheKeys.has(key) || relationshipRetryKeys.has(key),
      ),
    );

    maybePushDocsNotIndexedDiagnostic(
      diagnostics,
      performedFullReindex,
      markdownFiles.length,
      entityCount,
    );

    info(
      `✓ Imported ${entityCount} entities, ${relationshipCount} relationships`,
    );

    const commit = getCurrentCommit();
    const summary: SyncSummary = withOptionalCommit(
      {
        branch: currentBranch,
        timestamp: new Date().toISOString(),
        entityCounts,
        ...(storeTotals !== undefined ? { storeTotals } : {}),
        relationshipCount,
        success: true,
        published: true,
        failures: diagnostics,
        durationMs: Date.now() - startTime,
      },
      commit,
    );

    info(formatSyncSummary(summary));
    return { ...summary, exitCode: 0 };
  } catch (error) {
    operationFailure = { error };
    if (stagingPath) {
      cleanupStaging(stagingPath);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMessage}`);
    markErrorReported(error);

    if (diagnostics.length > 0) {
      info("\nDiagnostics:");
      for (const d of diagnostics) {
        info(`  [${d.category}] ${d.severity}: ${d.message}`);
      }
    }

    throw error;
  } finally {
    publicationLease?.release();
    releaseSymbolCompilerLock(compilerLock, operationFailure);
  }
}

export { normalizeMarkdownPath } from "./sync/discovery.js";
