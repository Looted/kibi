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

import { execFileSync } from "node:child_process";
import {
  existsSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
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

function processInfo(pid: number): { parent: number; command: string } | null {
  try {
    if (process.platform === "linux") {
      // `comm` is in parentheses; the fields after it are state, ppid, ...
      const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
      const open = stat.indexOf("(");
      const close = stat.lastIndexOf(")");
      return {
        command: stat.slice(open + 1, close),
        parent: Number(stat.slice(close + 2).split(" ")[1]),
      };
    }
    if (process.platform === "win32") return null;
    const [parent, ...command] = execFileSync(
      "ps",
      ["-o", "ppid=,comm=", "-p", String(pid)],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 2000 },
    )
      .trim()
      .split(/\s+/);
    return { parent: Number(parent), command: basename(command.join(" ")) };
  } catch {
    return null;
  }
}

/**
 * The process to stop for a store lock holder. The lock records the engine's
 * SWI-Prolog child; its parent (the daemon, or another Kibi process hosting
 * the session) is what a user ends or stops.
 */
// implements REQ-core-journaled-engine-persistence
export function lockHolderProcess(pid: number): {
  pid: number;
  prologPid?: number;
} {
  const info = processInfo(pid);
  if (
    info === null ||
    !/^swipl/.test(info.command) ||
    !Number.isInteger(info.parent) ||
    info.parent <= 1
  )
    return { pid };
  return { pid: info.parent, prologPid: pid };
}

/** "pid N", naming the owning Kibi process when N is its SWI-Prolog child. */
// implements REQ-core-journaled-engine-persistence
export function describeLockHolderPid(pid: number): string {
  const holder = lockHolderProcess(pid);
  return holder.prologPid === undefined
    ? `pid ${holder.pid}`
    : `pid ${holder.pid} (through its SWI-Prolog process, pid ${holder.prologPid})`;
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

/** Store-root record of the last stale-lock takeover (see below). */
export const STORE_LOCK_TAKEOVER_FILE = ".kibi-lock-takeover.json";

/**
 * How long a takeover stays visible in kb_status and kibi doctor. A takeover
 * happens inside a detached engine whose output nobody reads, so the record
 * outlives that engine (which may idle out within minutes) long enough to be
 * seen on the next working session; the next takeover replaces it.
 */
export const STORE_LOCK_TAKEOVER_VISIBLE_MS = 24 * 60 * 60 * 1000;

export type StoreLockTakeoverRecord = Readonly<{
  brokenPid: number | null;
  reason: string;
  at: string;
  path: string;
}>;

/**
 * Record that a stale branch-store lock is about to be broken. Best effort:
 * the record is diagnostic and must never block the takeover itself.
 */
// implements REQ-core-journaled-engine-persistence
export function recordStoreLockTakeover(
  storePath: string,
  brokenPid: number | null,
  reason: string,
  at: Date = new Date(),
): void {
  try {
    writeFileSync(
      join(storePath, STORE_LOCK_TAKEOVER_FILE),
      `${JSON.stringify({ brokenPid, reason, at: at.toISOString() })}\n`,
      { mode: 0o600 },
    );
  } catch {
    // A read-only or vanished store still gets its lock broken.
  }
}

/** The last takeover record of a branch store, or null when none is readable. */
// implements REQ-core-journaled-engine-persistence
export function readStoreLockTakeover(
  storePath: string,
): StoreLockTakeoverRecord | null {
  const recordPath = join(storePath, STORE_LOCK_TAKEOVER_FILE);
  if (!existsSync(recordPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(recordPath, "utf8")) as Record<
      string,
      unknown
    >;
    if (typeof parsed.at !== "string" || Number.isNaN(Date.parse(parsed.at)))
      return null;
    return {
      brokenPid: typeof parsed.brokenPid === "number" ? parsed.brokenPid : null,
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
      at: parsed.at,
      path: recordPath,
    };
  } catch {
    return null;
  }
}

/** The holder pid an rdf_persistency `lock` file records, or null. */
// implements REQ-core-journaled-engine-persistence
export function readRdfLockPid(lockPath: string): number | null {
  try {
    const match = /pid\((\d+)\)/.exec(readFileSync(lockPath, "utf8"));
    const pid = Number.parseInt(match?.[1] ?? "", 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

/**
 * Note, before `kb_attach`, whether a dead holder left this branch store
 * locked, and return the step that records the takeover once the attach has
 * succeeded.
 *
 * rdf_persistency locks the store with an OS advisory lock that the kernel
 * releases when its holder dies, so a killed engine never makes the next
 * attach fail with `store_locked`: the attach simply takes the store over.
 * The only trace is the `rdf/lock` file, which SWI deletes on every detach
 * and halt; one that is still present was left by a holder that crashed or
 * was killed. Its holder (the ownership journal when it names the same
 * process, which adds the boot id, else the lock file's pid) is classified
 * the same way a `store_locked` failure is. The returned step is a no-op
 * unless that holder is provably dead; callers run it only after a
 * successful attach, which proves the holder no longer held the lock.
 */
// implements REQ-core-journaled-engine-persistence
export function noteDeadHolderBeforeAttach(kbPath: string): () => void {
  const lockPath = join(kbPath, "rdf", "lock");
  if (!existsSync(lockPath)) return () => undefined;
  const lockPid = readRdfLockPid(lockPath);
  const journal = readStoreLockOwner(kbPath)?.owner ?? null;
  const owner: PrologStoreLockOwner | null =
    journal !== null && (lockPid === null || journal.pid === lockPid)
      ? journal
      : lockPid !== null
        ? { pid: lockPid }
        : null;
  const decision = decideStoreLockTakeover(owner, { storePath: kbPath });
  if (decision.action !== "break") return () => undefined;
  const brokenPid = owner?.pid ?? null;
  return () => recordStoreLockTakeover(kbPath, brokenPid, decision.reason);
}

export interface StoreLockTakeoverDecision {
  readonly action: "break" | "surface";
  readonly reason: string;
}

/** Reason prefix of a takeover that removed lock artifacts copied in. */
export const FOREIGN_STORE_LOCK_REASON_PREFIX =
  "journal belongs to another workspace";

function existingRealPath(pathname: string): string | null {
  try {
    return realpathSync(pathname);
  } catch {
    return null;
  }
}

function sameDirectory(left: string, right: string): boolean {
  try {
    const a = statSync(left);
    const b = statSync(right);
    return a.dev === b.dev && a.ino === b.ino;
  } catch {
    return false;
  }
}

/**
 * The workspace that owns a branch store: `<root>/.kb/branches/<key>` (a
 * legacy key may span several segments) is owned by `<root>`. Null for a
 * path outside that layout.
 */
function owningWorkspaceRoot(storePath: string): string | null {
  let current = storePath;
  for (;;) {
    const parent = dirname(current);
    if (parent === current) return null;
    if (basename(parent) === "branches" && basename(dirname(parent)) === ".kb")
      return dirname(dirname(parent));
    current = parent;
  }
}

/**
 * The recorded root of an ownership journal that another workspace wrote,
 * or null when the journal belongs to this store (or cannot be judged).
 *
 * kb.pl records the attached store directory as `workspaceRoot`; a journal
 * may also name a workspace root. Either way it is foreign only when the
 * workspace it names differs from the one that owns `storePath`, which
 * happens when a `.kb` was copied (`cp -a`, a backup restore) while another
 * workspace's engine held its store. An advisory lock is never inherited by
 * a copied file, so nobody holds this store on the journal's behalf.
 *
 * The journal is judged only when that is safe: when the store's `rdf/lock`
 * names a different pid than the journal, a process of this workspace has
 * locked the store since the copy; when the recorded path no longer exists,
 * the store may have been moved here while its holder still runs; and a
 * recorded path that is this very directory (a bind mount) is not another
 * workspace. Each of those returns null.
 */
// implements REQ-core-journaled-engine-persistence
export function foreignStoreLockJournalRoot(
  owner: PrologStoreLockOwner | null,
  storePath: string,
): string | null {
  const recorded = owner?.workspaceRoot;
  if (recorded === undefined || recorded === "") return null;
  const store = existingRealPath(storePath);
  if (store === null) return null;
  const ownWorkspace = owningWorkspaceRoot(store);
  if (ownWorkspace === null) return null;
  const lockPid = readRdfLockPid(join(storePath, "rdf", "lock"));
  if (lockPid !== null && lockPid !== owner?.pid) return null;
  const recordedPath = existingRealPath(recorded);
  if (recordedPath === null || recordedPath === store) return null;
  if (sameDirectory(recordedPath, store)) return null;
  const recordedWorkspace = owningWorkspaceRoot(recordedPath) ?? recordedPath;
  return recordedWorkspace === ownWorkspace ? null : recorded;
}

/**
 * Decide whether a store-locked failure may be auto-healed. Only a provably
 * dead holder (or a holder from a previous boot) is broken, and, when the
 * caller names the store being attached, a journal copied in from another
 * workspace; live or unknown holders are surfaced so the operator can close
 * the real session.
 */
// implements REQ-core-journaled-engine-persistence
export function decideStoreLockTakeover(
  owner: PrologStoreLockOwner | null,
  options: { readonly storePath?: string } = {},
): StoreLockTakeoverDecision {
  const state = classifyStoreLockHolder(owner);
  if (state === "dead") {
    return {
      action: "break",
      reason: `recorded holder pid ${owner?.pid ?? "?"} is no longer running`,
    };
  }
  const foreignRoot =
    options.storePath === undefined
      ? null
      : foreignStoreLockJournalRoot(owner, options.storePath);
  if (foreignRoot !== null) {
    return {
      action: "break",
      reason: `${FOREIGN_STORE_LOCK_REASON_PREFIX} ${foreignRoot}`,
    };
  }
  switch (state) {
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
  const decision = decideStoreLockTakeover(storeLocked.owner, {
    storePath: kbPath,
  });
  if (decision.action !== "break") {
    const holderSummary =
      storeLocked.owner === null
        ? decision.reason
        : `${storeLocked.owner.pid === undefined ? "pid ?" : describeLockHolderPid(storeLocked.owner.pid)} (${decision.reason})`;
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
  recordStoreLockTakeover(
    kbPath,
    storeLocked.owner?.pid ?? null,
    decision.reason,
  );
  breakStoreLock(lockDirectory);
  const retried = await prolog.query(`kb_attach('${escapeAtom(kbPath)}')`);
  if (retried.success) {
    console.warn(
      `[KIBI] Broke a stale branch-store lock (${decision.reason}) and reattached.`,
    );
  }
  return retried;
}
