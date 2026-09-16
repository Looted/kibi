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

import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  type StoreLockHolderState,
  breakStoreLock,
  classifyStoreLockHolder,
  isProcessAlive,
  readStoreLockOwner,
} from "./store-lock.js";

/**
 * Orphan janitor for engine daemons and branch-store locks.
 *
 * Kibi's lock stewardship records who holds a branch store, but recorded
 * state alone still needs a sweep: daemons killed outright leave sockets and
 * pid files, worktree removals strand daemons whose workspace is gone, and
 * crashed engines leave journals behind. The janitor classifies each piece
 * of evidence and cleans only what is provably stale.
 */
// implements REQ-core-journaled-engine-persistence

export interface StoreLockFinding {
  readonly kind: "store-lock";
  readonly storePath: string;
  readonly workspaceRoot?: string;
  readonly pid?: number;
  readonly startedAt?: string;
  readonly holderState: StoreLockHolderState;
  readonly workspaceExists: boolean;
  readonly action: "clean" | "kill-and-clean" | "keep";
}

export interface SocketFinding {
  readonly kind: "socket";
  readonly socketPath: string;
  readonly pid?: number;
  readonly holderState: StoreLockHolderState;
  readonly action: "clean" | "keep";
}

export type JanitorFinding = StoreLockFinding | SocketFinding;

export interface JanitorOptions {
  /** Branch stores live under <workspaceRoot>/.kb/branches. */
  readonly workspaceRoot: string;
  /** Runtime directory holding daemon sockets and pid files. */
  readonly runtimeDirectory: string;
  /** Also sweep runtime-directory sockets from other workspaces. */
  readonly all?: boolean;
  /** Execute cleanups; when false the scan only reports (dry run). */
  readonly apply?: boolean;
}

/** Scan one branch store's ownership journal and clean stale artifacts. */
// implements REQ-core-journaled-engine-persistence
export function sweepStoreLock(
  storePath: string,
  apply: boolean,
): StoreLockFinding | null {
  const journal = readStoreLockOwner(storePath);
  if (journal === null) return null;
  const owner = journal.owner;
  const holderState = classifyStoreLockHolder(owner);
  const workspaceRoot = owner.workspaceRoot;
  const workspaceExists =
    workspaceRoot !== undefined && existsSync(workspaceRoot);
  const workspaceVerifiablyGone =
    workspaceRoot !== undefined && !workspaceExists;
  let action: StoreLockFinding["action"];
  if (holderState === "dead") {
    action = "clean";
  } else if (
    (holderState === "alive" || holderState === "self") &&
    workspaceVerifiablyGone
  ) {
    // A live daemon whose workspace is verifiably gone can never serve
    // again; the watchdog should have stopped it already — this is the
    // backstop. A journal without workspaceRoot stays hands-off: absence of
    // evidence is not evidence of a removed workspace.
    action = "kill-and-clean";
  } else {
    action = "keep";
  }
  if (apply && action !== "keep") {
    if (action === "kill-and-clean" && typeof owner.pid === "number") {
      try {
        process.kill(owner.pid, "SIGTERM");
      } catch {
        // Already gone — fall through to artifact cleanup.
      }
    }
    // Same artifact sweep as the attach-takeover path, so the janitor and
    // the takeover agree on what stale artifacts exist.
    breakStoreLock(join(storePath, "rdf"));
  }
  return {
    kind: "store-lock",
    storePath,
    ...(workspaceRoot !== undefined ? { workspaceRoot } : {}),
    ...(owner.pid !== undefined ? { pid: owner.pid } : {}),
    ...(owner.startedAt !== undefined ? { startedAt: owner.startedAt } : {}),
    holderState,
    workspaceExists,
    action,
  };
}

/** Scan all branch stores under <workspaceRoot>/.kb/branches. */
// implements REQ-core-journaled-engine-persistence
export function sweepWorkspaceStoreLocks(
  options: JanitorOptions,
): StoreLockFinding[] {
  const branchesDir = join(options.workspaceRoot, ".kb", "branches");
  if (!existsSync(branchesDir)) return [];
  const findings: StoreLockFinding[] = [];
  for (const entry of readdirSync(branchesDir)) {
    const storePath = join(branchesDir, entry);
    try {
      if (!existsSync(join(storePath, "storage.json"))) continue;
    } catch {
      continue;
    }
    const finding = sweepStoreLock(storePath, options.apply === true);
    if (finding !== null) findings.push(finding);
  }
  return findings;
}

/**
 * Sweep runtime-directory daemon sockets. A socket is stale when its pid
 * file records a dead process or a connect attempt is refused.
 */
// implements REQ-core-journaled-engine-persistence
export function sweepRuntimeSockets(options: JanitorOptions): SocketFinding[] {
  if (!options.all) return [];
  if (!existsSync(options.runtimeDirectory)) return [];
  const findings: SocketFinding[] = [];
  for (const entry of readdirSync(options.runtimeDirectory)) {
    if (!entry.endsWith(".sock")) continue;
    const socketPath = join(options.runtimeDirectory, entry);
    const pidPath = `${socketPath}.pid`;
    let pid: number | undefined;
    if (existsSync(pidPath)) {
      try {
        const parsed = Number.parseInt(
          readFileSync(pidPath, "utf8").trim(),
          10,
        );
        if (Number.isInteger(parsed) && parsed > 0) pid = parsed;
      } catch {
        // The daemon being swept removed its pid file mid-scan; leave the
        // pid unknown rather than failing the whole run.
      }
    }
    const holderState =
      pid === undefined ? "unknown" : isProcessAlive(pid) ? "alive" : "dead";
    if (holderState === "dead") {
      if (options.apply === true) {
        rmSync(socketPath, { force: true });
        rmSync(pidPath, { force: true });
      }
      findings.push({
        kind: "socket",
        socketPath,
        ...(pid !== undefined ? { pid } : {}),
        holderState,
        action: "clean",
      });
    } else {
      findings.push({
        kind: "socket",
        socketPath,
        ...(pid !== undefined ? { pid } : {}),
        holderState,
        action: "keep",
      });
    }
  }
  return findings;
}

/** Full janitor sweep across branch stores and (optionally) runtime sockets. */
// implements REQ-core-journaled-engine-persistence
export function runJanitor(options: JanitorOptions): JanitorFinding[] {
  return [
    ...sweepWorkspaceStoreLocks(options),
    ...sweepRuntimeSockets(options),
  ];
}
