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

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import * as path from "node:path";
import { autoSyncEnabled } from "../commands/setup-choices.js";
import {
  compilerFingerprintReason,
  hashManifestWithCoordinates,
} from "../commands/sync/cache.js";
import { adoptNoGitStore } from "../vcs/no-git-adoption.js";
import {
  type AuthoredSources,
  authoredSourcesSync,
  kbFilesOnDisk,
} from "../vcs/source-inventory.js";
import type { BranchAttachment } from "./branch-resolver.js";
import {
  inspectBranchStore,
  uncompiledBranchStoreReason,
} from "./branch-store.js";
import {
  createFreshnessMemo,
  readSyncCacheRecord,
  stringHashMap,
} from "./content-freshness.js";
import { KB_PATHS, KB_ROOT, isSyncableKbSourcePath } from "./kb-paths.js";
import { pendingReceiptScope } from "./pending-source-branch.js";

export type AutoCompileOutcome =
  | "compiled"
  | "not-needed"
  | "disabled"
  | "failed";

const AUTO_COMPILE_BACKOFF_MS = 60_000;
const AUTO_COMPILE_LOCK_TIMEOUT_MS = 500;

/**
 * Operations that never compile on their own: applying a plan revalidates
 * its hash against the live state, and kb_status exists to report freshness.
 */
const NO_AUTO_COMPILE = new Set(["kb_apply_plan", "kb_status"]);

const inFlightCompiles = new Map<string, Promise<AutoCompileOutcome>>();
const recentFailures = new Map<string, number>();

type TriggerReason =
  | { kind: "uncompiled"; authoredSources: unknown }
  | { kind: "drift"; kindLabel: string };

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * The syncable `.kb` sources, and whether pending receipts add to them: what
 * Git tracks in a repository, every one on disk outside any repository. Null
 * when Git fails in a repository (freshness is then unknown).
 */
function listSyncableKbSources(
  workspaceRoot: string,
): { paths: string[]; receipts: boolean } | null {
  let sources: AuthoredSources;
  try {
    sources = authoredSourcesSync(workspaceRoot, [KB_ROOT]);
  } catch {
    return null;
  }
  const listed =
    sources.kind === "git"
      ? [...sources.tracked]
      : kbFilesOnDisk(workspaceRoot);
  return {
    paths: listed.filter((entry) => isSyncableKbSourcePath(entry)),
    receipts: sources.kind === "git",
  };
}

function readInScopePendingReceipts(
  workspaceRoot: string,
): Map<string, string> {
  const result = new Map<string, string>();
  const pendingRoot = path.join(
    workspaceRoot,
    KB_ROOT,
    "recovery",
    "pending-sources",
  );
  if (!existsSync(pendingRoot)) return result;
  const inScope = pendingReceiptScope(workspaceRoot);
  let names: string[];
  try {
    names = readdirSync(pendingRoot);
  } catch {
    return result;
  }
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    try {
      const receipt = JSON.parse(
        readFileSync(path.join(pendingRoot, name), "utf8"),
      ) as { path?: unknown; afterHash?: unknown };
      if (
        typeof receipt?.path !== "string" ||
        typeof receipt?.afterHash !== "string" ||
        !inScope(receipt)
      ) {
        continue;
      }
      result.set(receipt.path.replaceAll("\\", "/"), receipt.afterHash);
    } catch {
      // Malformed receipts do not mask tracked drift.
    }
  }
  return result;
}

function storeSnapshotMtimeMs(storePath: string): number {
  for (const candidate of ["CURRENT", "kb.rdf"]) {
    try {
      return statSync(path.join(storePath, candidate)).mtimeMs;
    } catch {
      // Try next marker.
    }
  }
  return 0;
}

function hasCompiledSyncableDrift(
  workspaceRoot: string,
  storePath: string,
): string | null {
  if (compilerFingerprintReason(storePath) !== null) {
    return "compiler contract changed";
  }
  const sources = listSyncableKbSources(workspaceRoot);
  if (sources === null) return null;
  const tracked = sources.paths;

  const syncCache = readSyncCacheRecord(storePath);
  const pending = sources.receipts
    ? readInScopePendingReceipts(workspaceRoot)
    : new Map<string, string>();
  const memo = createFreshnessMemo(storePath);
  let snapshotMtime: number | undefined;
  const getSnapshotMtime = (): number => {
    snapshotMtime ??= storeSnapshotMtimeMs(storePath);
    return snapshotMtime;
  };
  let syncCacheMtime: number | undefined;
  const getSyncCacheMtime = (): number => {
    if (syncCacheMtime === undefined) {
      try {
        syncCacheMtime = statSync(
          path.join(storePath, "sync-cache.json"),
        ).mtimeMs;
      } catch {
        syncCacheMtime = 0;
      }
    }
    return syncCacheMtime;
  };
  const isCommittedToStoreSinceSyncCache = (key: string): boolean => {
    const snap = getSnapshotMtime();
    const cacheTime = getSyncCacheMtime();
    if (cacheTime <= 0 || snap <= cacheTime) return false;
    try {
      const st = statSync(path.resolve(workspaceRoot, key));
      return st.mtimeMs > cacheTime && Math.max(st.mtimeMs, st.ctimeMs) <= snap;
    } catch {
      return false;
    }
  };

  try {
    if (syncCache === null) {
      const snap = getSnapshotMtime();
      for (const key of tracked) {
        const abs = path.resolve(workspaceRoot, key);
        let mtimeMs: number;
        try {
          mtimeMs = statSync(abs).mtimeMs;
        } catch {
          continue;
        }
        if (mtimeMs <= snap) continue;
        const pendingHash = pending.get(key);
        if (
          pendingHash !== undefined &&
          memo.fileSha256(workspaceRoot, key) === pendingHash
        ) {
          continue;
        }
        return "tracked .kb/ sources changed after store snapshot";
      }
      return null;
    }

    const hashes = stringHashMap(syncCache.hashes);
    const relationshipHashes = stringHashMap(syncCache.relationshipHashes);
    const manifestBytesHashes = stringHashMap(syncCache.manifestBytesHashes);
    const extractionFailures = record(syncCache.extractionFailures) ?? {};

    for (const key of Object.keys(hashes)) {
      if (
        isSyncableKbSourcePath(key) &&
        !existsSync(path.resolve(workspaceRoot, key))
      ) {
        return `removed tracked source ${key}`;
      }
    }
    for (const key of Object.keys(relationshipHashes)) {
      if (!existsSync(path.resolve(workspaceRoot, key))) {
        return `removed relationship shard ${key}`;
      }
    }

    let drifted = 0;
    for (const key of tracked) {
      const currentHash = memo.fileSha256(workspaceRoot, key);
      if (currentHash === null) continue;
      if (pending.get(key) === currentHash) continue;

      const failure = record(extractionFailures[key]);
      if (failure !== null && typeof failure.hash === "string") {
        if (key === KB_PATHS.symbolsManifest) {
          const abs = path.resolve(workspaceRoot, key);
          const coords = path.join(
            path.dirname(abs),
            "symbol-coordinates.yaml",
          );
          try {
            if (
              hashManifestWithCoordinates(workspaceRoot, abs, coords) ===
              failure.hash
            ) {
              continue;
            }
          } catch {
            // Fall through if unreadable.
          }
        } else if (failure.hash === currentHash) {
          continue;
        }
      }

      if (key.startsWith(`${KB_PATHS.relationships}/`)) {
        if (
          currentHash !== relationshipHashes[key] &&
          !isCommittedToStoreSinceSyncCache(key)
        ) {
          drifted += 1;
        }
      } else if (key === KB_PATHS.symbolsManifest) {
        if (manifestBytesHashes[key] !== undefined) {
          if (
            currentHash !== manifestBytesHashes[key] &&
            !isCommittedToStoreSinceSyncCache(key)
          ) {
            drifted += 1;
          }
        } else {
          const abs = path.resolve(workspaceRoot, key);
          try {
            if (statSync(abs).mtimeMs > getSnapshotMtime()) {
              const coords = path.join(
                path.dirname(abs),
                "symbol-coordinates.yaml",
              );
              if (
                hashManifestWithCoordinates(workspaceRoot, abs, coords) !==
                hashes[key]
              ) {
                drifted += 1;
              }
            }
          } catch {
            // Ignore unreadable manifest during drift check.
          }
        }
      } else if (
        currentHash !== hashes[key] &&
        !isCommittedToStoreSinceSyncCache(key)
      ) {
        drifted += 1;
      }
    }

    return drifted > 0 ? `${drifted} tracked .kb/ source(s) changed` : null;
  } finally {
    memo.save();
  }
}

/**
 * Compiles this branch's store from authored `.kb/` sources when it was never
 * compiled (fresh clone or new branch) OR when a healthy compiled store has
 * tracked `.kb/` or compiler-contract drift (never untracked `.kb/` files or
 * bare production code edits). Writes only derived, gitignored state.
 */
export async function ensureBranchStoreCompiled(
  workspaceRoot: string,
  attachment: BranchAttachment,
  spec: {
    readonly name: string;
    /**
     * False compiles only a store nothing compiled yet: a staged check judges
     * the commit against HEAD, and syncing the working tree into the store
     * first would count the staged change as already there.
     */
    readonly syncDrift?: boolean;
  },
  env: NodeJS.ProcessEnv = process.env,
): Promise<AutoCompileOutcome> {
  if (NO_AUTO_COMPILE.has(spec.name)) return "not-needed";
  if (
    attachment.kind === "detached_snapshot" ||
    attachment.readOnly !== undefined ||
    attachment.migrationRequired
  ) {
    return "not-needed";
  }

  // A repository created since Kibi last ran without Git takes over the
  // knowledge recorded there; the store then compiles below as usual.
  const adopted = adoptNoGitStore(workspaceRoot, attachment);
  if (adopted !== null) console.error(`[KIBI] ${adopted.notice}`);

  const flightKey = `${path.resolve(workspaceRoot)}\0${attachment.kbBranch}`;
  const store = inspectBranchStore(workspaceRoot, attachment.kbBranch);
  const uncompiled = uncompiledBranchStoreReason(
    workspaceRoot,
    store,
    attachment.kbBranch,
  );

  let trigger: TriggerReason | null = null;
  if (uncompiled !== null) {
    trigger = {
      kind: "uncompiled",
      authoredSources: uncompiled.authoredSources,
    };
  } else if (store.state === "healthy" && spec.syncDrift !== false) {
    const driftDetail = hasCompiledSyncableDrift(workspaceRoot, store.path);
    if (driftDetail !== null) {
      trigger = { kind: "drift", kindLabel: driftDetail };
    }
  }

  if (trigger === null) {
    recentFailures.delete(flightKey);
    return "not-needed";
  }
  if (!autoSyncEnabled(workspaceRoot, env)) return "disabled";

  const existing = inFlightCompiles.get(flightKey);
  if (existing !== undefined) return existing;

  const blockedUntil = recentFailures.get(flightKey);
  if (blockedUntil !== undefined && Date.now() < blockedUntil) {
    return "failed";
  }

  const notice =
    trigger.kind === "uncompiled"
      ? `[KIBI] Compiling the KB store for branch ${attachment.kbBranch} from ${String(trigger.authoredSources)} authored source file(s): first use in this checkout. Set KIBI_AUTO_SYNC=0 to turn this off.`
      : `[KIBI] Syncing stale KB branch store for branch ${attachment.kbBranch} (${trigger.kindLabel}). Set KIBI_AUTO_SYNC=0 to turn this off.`;

  const promise = (async (): Promise<AutoCompileOutcome> => {
    console.error(notice);
    // Sync prints progress with console.log; a JSON route's or MCP server's
    // stdout must carry only its own output.
    const { log, info } = console;
    const toStderr = (...args: unknown[]) => console.error(...args);
    console.log = toStderr;
    console.info = toStderr;
    try {
      const { syncCommand } = await import("../commands/sync.js");
      const result = await syncCommand({
        workspaceRoot,
        quiet: true,
        compileOnly: true,
        lockTimeoutMs: AUTO_COMPILE_LOCK_TIMEOUT_MS,
      });
      if (result.success) {
        recentFailures.delete(flightKey);
        return "compiled";
      }
      recentFailures.set(flightKey, Date.now() + AUTO_COMPILE_BACKOFF_MS);
      console.error(
        "[KIBI] Compiling the KB store did not complete; run 'kibi sync' to see why.",
      );
      return "failed";
    } catch (error) {
      recentFailures.set(flightKey, Date.now() + AUTO_COMPILE_BACKOFF_MS);
      console.error(
        `[KIBI] Compiling the KB store failed: ${error instanceof Error ? error.message : String(error)}. Run 'kibi sync' to compile it.`,
      );
      return "failed";
    } finally {
      console.log = log;
      console.info = info;
      inFlightCompiles.delete(flightKey);
    }
  })();

  inFlightCompiles.set(flightKey, promise);
  return promise;
}
