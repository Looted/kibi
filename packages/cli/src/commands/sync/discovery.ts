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

import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { existsSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";
import { getRelationshipsDir } from "../../extractors/relationships.js";
import {
  CANONICAL_ENTITY_PATHS,
  isSymbolsManifestPath,
} from "../../utils/kb-paths.js";
import {
  committedOnLocalBranch,
  pendingReceiptScope,
} from "../../utils/pending-source-branch.js";
import { authoredSources } from "../../vcs/source-inventory.js";
import {
  SyncError,
  pendingSourceHashDriftError,
  pendingSourceMissingError,
} from "./errors.js";

const MARKDOWN_DISCOVERY_IGNORE = ["**/README.md"] as const;

export type DiscoveryOptions = Readonly<{
  trackedOnly?: boolean;
  recoverMissingPendingSources?: boolean;
  /** Read-only callers must not consume receipts merely by discovering files. */
  consumeTrackedPendingReceipts?: boolean;
}>;

/**
 * A missing-source receipt selected for explicit recovery.
 *
 * The receipt path alone is not enough: another Kibi process may publish a
 * newer receipt between discovery and the derived-store publication.  The
 * raw digest lets the recovery boundary compare-and-delete the exact receipt
 * it observed, leaving a newer receipt available for its owner to handle.
 */
export type PendingSourceReceiptSnapshot = Readonly<{
  receiptPath: string;
  path: string;
  afterHash: string;
  rawHash: string;
}>;

type PendingReceipt = Readonly<{
  raw: string;
  path: string;
  afterHash: string;
  receipt: unknown;
}>;

type ReceiptFile = Readonly<{
  raw: string;
  receipt: { path?: unknown; afterHash?: unknown; branch?: unknown } | null;
}>;

/** The receipt's text and JSON, or null when it cannot be read or parsed. */
function readReceiptFile(receiptPath: string): ReceiptFile | null {
  try {
    const raw = readFileSync(receiptPath).toString();
    return { raw, receipt: JSON.parse(raw) };
  } catch {
    return null;
  }
}

/** A well-formed receipt, or null for one recovery diagnostics report. */
function readPendingReceipt(receiptPath: string): PendingReceipt | null {
  const file = readReceiptFile(receiptPath);
  if (file === null) return null;
  const recorded = file.receipt?.path;
  const afterHash = file.receipt?.afterHash;
  if (
    typeof recorded !== "string" ||
    recorded.length === 0 ||
    typeof afterHash !== "string" ||
    !/^[a-f0-9]{64}$/i.test(afterHash)
  )
    return null;
  return { raw: file.raw, path: recorded, afterHash, receipt: file.receipt };
}

/**
 * The sources bound by pending receipts. A receipt whose file Git now tracks
 * is kept as an input but not compared, whatever its hash says: the tracked
 * bytes are the authored input, and the caller retires that receipt. Only a
 * receipt for a still-untracked file can refuse the sync on hash drift.
 */
function pendingSourcePaths(
  cwd: string,
  recoverMissing: boolean,
  tracked: ReadonlySet<string>,
): {
  paths: Map<string, string>;
  recoveredReceipts: PendingSourceReceiptSnapshot[];
  committedElsewhere: Set<string>;
} {
  const root = path.join(cwd, ".kb", "recovery", "pending-sources");
  const paths = new Map<string, string>();
  const recoveredReceipts: PendingSourceReceiptSnapshot[] = [];
  const committedElsewhere = new Set<string>();
  if (!existsSync(root))
    return { paths, recoveredReceipts, committedElsewhere };
  const inScope = pendingReceiptScope(cwd);
  const committedOnBranch = committedOnLocalBranch(cwd);
  for (const name of readdirSync(root)) {
    if (!name.endsWith(".json")) continue;
    const receiptPath = path.join(root, name);
    const receipt = readPendingReceipt(receiptPath);
    if (receipt === null) continue;
    const relative = receipt.path.replaceAll("\\", "/");
    if (tracked.has(relative)) {
      // Git now owns these bytes; the receipt is consumed below.
      paths.set(relative, receipt.afterHash);
      continue;
    }
    const absolute = path.resolve(cwd, relative);
    if (!absolute.startsWith(`${path.resolve(cwd)}${path.sep}`)) {
      throw new SyncError(
        `Pending source receipt escapes workspace: ${relative}`,
        "PENDING_SOURCE_ESCAPES_WORKSPACE",
      );
    }
    if (!existsSync(absolute)) {
      // A file committed on the branch that wrote the receipt is absent
      // here; that branch keeps the receipt.
      if (!inScope(receipt.receipt)) continue;
      // A file committed on another local branch (one made after the
      // receipt, say) was not lost: that branch's Git owns it, and the
      // receipt is retired below.
      if (committedOnBranch(relative, receipt.afterHash)) {
        committedElsewhere.add(relative);
        continue;
      }
      if (recoverMissing) {
        recoveredReceipts.push({
          receiptPath,
          path: relative,
          afterHash: receipt.afterHash,
          rawHash: createHash("sha256").update(receipt.raw).digest("hex"),
        });
        continue;
      }
      throw pendingSourceMissingError(relative);
    }
    let actual: string;
    try {
      actual = createHash("sha256")
        .update(readFileSync(absolute))
        .digest("hex");
    } catch {
      // An unreadable source (a directory, say) is left for recovery.
      continue;
    }
    if (actual !== receipt.afterHash) {
      throw pendingSourceHashDriftError(relative, receipt.afterHash, actual);
    }
    paths.set(relative, receipt.afterHash);
  }
  return { paths, recoveredReceipts, committedElsewhere };
}

export function isFsEnoent(error: unknown): boolean {
  // A thrown primitive has no code; only null and undefined need the guard.
  return (error as { code?: unknown } | null | undefined)?.code === "ENOENT";
}

export function readTextOrEnoent(absolute: string): string | null {
  try {
    // Buffer#toString decodes UTF-8.
    return fs.readFileSync(absolute).toString();
  } catch (error) {
    if (isFsEnoent(error)) return null;
    throw new SyncError(
      `Failed to inspect pending source receipt for ${absolute}: ${error instanceof Error ? error.message : String(error)}`,
      "PENDING_SOURCE_RECEIPT_IO",
    );
  }
}

export function unlinkOrEnoent(absolute: string): boolean {
  try {
    fs.unlinkSync(absolute);
    return true;
  } catch (error) {
    if (isFsEnoent(error)) return false;
    throw new SyncError(
      `Failed to retire pending source receipt for ${absolute}: ${error instanceof Error ? error.message : String(error)}`,
      "PENDING_SOURCE_RECEIPT_IO",
    );
  }
}

export function clearRecoveredPendingSourceReceipts(
  cwd: string,
  receipts: readonly PendingSourceReceiptSnapshot[],
): void {
  const root = path.resolve(cwd, ".kb", "recovery", "pending-sources");
  for (const receipt of receipts) {
    const absolute = path.resolve(receipt.receiptPath);
    if (!absolute.startsWith(`${root}${path.sep}`)) {
      throw new SyncError(
        `Pending source receipt escapes recovery root: ${absolute}`,
        "PENDING_SOURCE_ESCAPES_WORKSPACE",
      );
    }

    // Compare-and-delete: a receipt may have been replaced while the
    // recovery rebuild was running.  Never remove the replacement merely
    // because it has the same receipt filename.  Failing closed here is
    // important: publication may have completed, but recovery must not claim
    // that pending intent was retired when a newer intent remains.
    const raw = readTextOrEnoent(absolute);
    if (raw === null) continue;
    const rawHash = createHash("sha256").update(raw).digest("hex");
    if (rawHash !== receipt.rawHash) {
      throw new SyncError(
        `Pending source receipt changed during recovery for ${receipt.path}; refusing to retire newer receipt`,
        "PENDING_SOURCE_RECEIPT_CHANGED",
      );
    }
    let current: { path?: unknown; afterHash?: unknown };
    try {
      current = JSON.parse(raw) as {
        path?: unknown;
        afterHash?: unknown;
      };
    } catch {
      throw new SyncError(
        `Pending source receipt changed during recovery for ${receipt.path}; refusing to retire newer receipt`,
        "PENDING_SOURCE_RECEIPT_CHANGED",
      );
    }
    if (
      current.path !== receipt.path ||
      current.afterHash !== receipt.afterHash
    ) {
      throw new SyncError(
        `Pending source receipt changed during recovery for ${receipt.path}; refusing to retire newer receipt`,
        "PENDING_SOURCE_RECEIPT_CHANGED",
      );
    }
    unlinkOrEnoent(absolute);
  }
}

/** The files Git tracks; pending sources are added back by the caller. */
function filterTracked(
  cwd: string,
  files: readonly string[],
  tracked: ReadonlySet<string>,
): string[] {
  return files.filter((file) =>
    tracked.has(path.relative(cwd, file).replaceAll(path.sep, "/")),
  );
}

export function normalizeMarkdownPath(
  pattern: string | undefined,
): string | null {
  if (!pattern) return null;
  if (pattern.includes("*")) return pattern;
  return `${pattern}/**/*.md`;
}

export async function discoverSourceFiles(
  cwd: string,
  options: DiscoveryOptions = {},
): Promise<{
  markdownFiles: string[];
  manifestFiles: string[];
  relationshipsDir: string;
  recoveredPendingReceiptPaths: PendingSourceReceiptSnapshot[];
}> {
  // Canonical lanes are never empty, so each yields a pattern.
  const markdownPatterns = [
    CANONICAL_ENTITY_PATHS.requirements,
    CANONICAL_ENTITY_PATHS.scenarios,
    CANONICAL_ENTITY_PATHS.tests,
    CANONICAL_ENTITY_PATHS.adr,
    CANONICAL_ENTITY_PATHS.flags,
    CANONICAL_ENTITY_PATHS.events,
    CANONICAL_ENTITY_PATHS.facts,
  ].map((lane) => normalizeMarkdownPath(lane) as string);

  const markdownFiles = await fg(markdownPatterns, {
    cwd,
    absolute: true,
    ignore: [...MARKDOWN_DISCOVERY_IGNORE],
  });
  // The ignore list already leaves every README.md out.
  let entityMarkdownFiles = markdownFiles;

  let manifestFiles = await fg(CANONICAL_ENTITY_PATHS.symbols, {
    cwd,
    absolute: true,
  });
  const recoveredPendingReceiptPaths: PendingSourceReceiptSnapshot[] = [];

  // Outside any Git repository every authored source on disk is input and
  // receipts do not apply, so only a Git workspace filters.
  const sources = options.trackedOnly ? await authoredSources(cwd) : null;
  if (sources?.kind === "git") {
    const tracked = sources.tracked;
    const pending = pendingSourcePaths(
      cwd,
      options.recoverMissingPendingSources === true,
      tracked,
    );
    recoveredPendingReceiptPaths.push(...pending.recoveredReceipts);
    entityMarkdownFiles = filterTracked(cwd, entityMarkdownFiles, tracked);
    manifestFiles = filterTracked(cwd, manifestFiles, tracked);
    for (const relative of pending.paths.keys()) {
      const absolute = path.resolve(cwd, relative);
      if (!existsSync(absolute)) continue;
      if (relative.endsWith(".md") && !entityMarkdownFiles.includes(absolute)) {
        entityMarkdownFiles.push(absolute);
      }
      if (
        isSymbolsManifestPath(relative) &&
        !manifestFiles.includes(absolute)
      ) {
        manifestFiles.push(absolute);
      }
    }
    // A pending receipt is consumed as soon as Git tracks its file. This is
    // deliberately best-effort metadata; the source hash remains authoritative.
    const pendingRoot = path.join(cwd, ".kb", "recovery", "pending-sources");
    if (
      options.consumeTrackedPendingReceipts !== false &&
      existsSync(pendingRoot)
    ) {
      for (const name of readdirSync(pendingRoot)) {
        if (!name.endsWith(".json")) continue;
        const receiptPath = path.join(pendingRoot, name);
        const file = readReceiptFile(receiptPath);
        // Leave malformed receipts for explicit recovery diagnostics. A
        // receipt whose file Git tracks on this branch is retired whichever
        // branch wrote it: Git owns those bytes here. So is one whose missing
        // file another local branch has committed.
        if (file === null) continue;
        const recorded = file.receipt?.path;
        if (
          typeof recorded === "string" &&
          (tracked.has(recorded.replaceAll("\\", "/")) ||
            pending.committedElsewhere.has(recorded.replaceAll("\\", "/")))
        ) {
          try {
            unlinkSync(receiptPath);
          } catch {
            // Best effort: a receipt removed meanwhile is already consumed.
          }
        }
      }
    }
  }

  const relationshipsDir = getRelationshipsDir(path.join(cwd, ".kb"));

  return {
    markdownFiles: entityMarkdownFiles,
    manifestFiles,
    relationshipsDir,
    recoveredPendingReceiptPaths,
  };
}
