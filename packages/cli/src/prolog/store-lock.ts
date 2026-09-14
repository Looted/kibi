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
import { join } from "node:path";
import type { PrologStoreLockOwner } from "./error-terms.js";

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

/** Remove the stale lock artifacts so a fresh attach can take the store. */
export function breakStoreLock(lockDirectory: string): void {
  for (const name of ["lock", ".kibi-lock-owner.json"]) {
    const candidate = join(lockDirectory, name);
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

/** Best-effort host qualifier for cross-machine mounts. */
export function hostMatchesJournal(): boolean {
  // The journal currently records only a boot id; a future revision may add a
  // hostname. Everything on a locally mounted path shares this host.
  return true;
}

// Re-exported for callers that already hold a decoded owner JSON string.
export function parseStoreLockOwner(
  ownerJson: string,
): PrologStoreLockOwner | null {
  try {
    const parsed = JSON.parse(ownerJson) as PrologStoreLockOwner;
    if (parsed === null || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}
