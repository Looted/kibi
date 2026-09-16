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

import { existsSync, rmSync } from "node:fs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { QueryResult } from "../prolog.js";
import { escapeAtom } from "./codec.js";
import type { PrologErrorRecord, PrologStoreLockOwner } from "./error-terms.js";

/**
 * Stewardship for the branch-store lock.
 *
 * rdf_persistency holds the store lock while an engine is attached, and the
 * ownership journal written by kb.pl records who the holder is. This module
 * classifies a recorded holder (alive, dead, unknown) and breaks the lock
 * only when the holder is provably dead — a crash, a kill, or a removed
 * worktree then self-heals on the next attach instead of wedging the store
 * behind an opaque "Access denied or KB locked".
 */
// implements REQ-core-journaled-engine-persistence

let cachedBootId: string | null | undefined;

/** Linux boot id; guards against PID reuse across reboots. Null elsewhere. */
export function currentBootId(): string | null {
  if (cachedBootId !== undefined) return cachedBootId;
  if (process.platform !== "linux") {
    cachedBootId = null;
    return cachedBootId;
  }
  try {
    const raw = readFileSync("/proc/sys/kernel/random/boot_id", "utf8");
    cachedBootId = raw.trim();
  } catch {
    cachedBootId = null;
  }
  return cachedBootId;
}

export function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | null)?.code;
    // EPERM means the process exists but is owned by another user.
    return code === "EPERM";
  }
}

export type StoreLockHolderState = "self" | "alive" | "dead" | "unknown";

export function classifyStoreLockHolder(
  owner: PrologStoreLockOwner | null,
): StoreLockHolderState {
  if (owner === null || typeof owner.pid !== "number") return "unknown";
  if (owner.pid === process.pid) return "self";
  const alive = isProcessAlive(owner.pid);
  if (!alive) return "dead";
  const bootId = currentBootId();
  // A recorded boot id that differs from ours means the holder ran before a
  // reboot: the PID cannot be trusted as a sign of life.
  if (bootId !== null && owner.bootId !== undefined && owner.bootId !== "") {
    return owner.bootId === bootId ? "alive" : "dead";
  }
  return "alive";
}

/**
 * Read an ownership journal from a branch store. Older builds kept the
 * journal beside the rdf lock; the store-root location wins when both exist.
 * Shared by the janitor sweep and the status stale-reason surfacing so both
 * classify the same evidence with the same boot-id-aware semantics.
 */
// implements REQ-core-journaled-engine-persistence
export function readStoreLockOwner(
  storePath: string,
): { owner: PrologStoreLockOwner; journalPath: string } | null {
  const candidates = [
    join(storePath, ".kibi-lock-owner.json"),
    join(storePath, "rdf", ".kibi-lock-owner.json"),
  ];
  for (const journalPath of candidates) {
    if (!existsSync(journalPath)) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(journalPath, "utf8"));
    } catch {
      continue;
    }
    if (parsed === null || typeof parsed !== "object") continue;
    const record = parsed as Record<string, unknown>;
    const owner: PrologStoreLockOwner = {
      ...(typeof record.pid === "number" ? { pid: record.pid } : {}),
      ...(typeof record.workspaceRoot === "string"
        ? { workspaceRoot: record.workspaceRoot }
        : {}),
      ...(typeof record.bootId === "string" ? { bootId: record.bootId } : {}),
      ...(typeof record.startedAt === "string"
        ? { startedAt: record.startedAt }
        : {}),
    };
    return { owner, journalPath };
  }
  return null;
}

/**
 * Remove the stale lock artifacts so a fresh attach can take the store.
 * The rdf lock lives inside the persistency directory; the ownership journal
 * lives at the branch-store root (older builds kept it beside the lock).
 */
export function breakStoreLock(rdfDirectory: string): void {
  const candidates = [
    join(rdfDirectory, "lock"),
    join(rdfDirectory, ".kibi-lock-owner.json"),
    join(dirname(rdfDirectory), ".kibi-lock-owner.json"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      rmSync(candidate, { force: true });
    }
  }
}

export interface StoreLockTakeoverDecision {
  readonly action: "break" | "surface";
  readonly reason: string;
}

/**
 * Decide whether a store-locked failure may be auto-healed. Only a provably
 * dead holder (or a holder from a previous boot) is broken; live or unknown
 * holders are surfaced so the operator can close the real session.
 */
export function decideStoreLockTakeover(
  owner: PrologStoreLockOwner | null,
): StoreLockTakeoverDecision {
  const state = classifyStoreLockHolder(owner);
  switch (state) {
    case "dead":
      return {
        action: "break",
        reason: `recorded holder pid ${owner?.pid ?? "?"} is no longer running`,
      };
    case "unknown":
      return {
        action: "surface",
        reason: "no ownership journal; the holder cannot be verified",
      };
    case "self":
    case "alive":
      return {
        action: "surface",
        reason: `holder pid ${owner?.pid ?? "?"} is still running${owner?.workspaceRoot !== undefined ? ` for ${owner.workspaceRoot}` : ""}`,
      };
  }
}

export interface StoreLockRetryContext {
  readonly query: (goal: string) => Promise<QueryResult>;
}

/**
 * A store-locked attach failure with a provably dead holder (crashed or
 * killed engine, removed worktree) is safe to auto-heal: break the stale
 * lock artifacts and retry once on the same port. Live or unverifiable
 * holders are surfaced with the holder identity and remediation. Shared by
 * the CLI runtime and the engine daemon attach paths.
 */
// implements REQ-core-journaled-engine-persistence
export async function retryAttachAfterBreakingStaleLock(
  prolog: StoreLockRetryContext,
  kbPath: string,
  failed: QueryResult,
): Promise<QueryResult> {
  const record: PrologErrorRecord | undefined = failed.errorRecord;
  const storeLocked = record?.storeLocked;
  if (storeLocked === undefined) return failed;
  const decision = decideStoreLockTakeover(storeLocked.owner);
  if (decision.action !== "break") {
    const holderSummary =
      storeLocked.owner === null
        ? decision.reason
        : `pid ${storeLocked.owner.pid ?? "?"} (${decision.reason})`;
    return {
      ...failed,
      error: `${failed.error}
Store lock holder: ${holderSummary}. Close that session, or run 'kibi engine stop' for its workspace, then retry.`,
    };
  }
  const lockDirectory =
    storeLocked.lockDirectory !== ""
      ? storeLocked.lockDirectory
      : join(kbPath, "rdf");
  breakStoreLock(lockDirectory);
  const retried = await prolog.query(`kb_attach('${escapeAtom(kbPath)}')`);
  if (retried.success) {
    console.warn(
      `[KIBI] Broke a stale branch-store lock (${decision.reason}) and reattached.`,
    );
  }
  return retried;
}
