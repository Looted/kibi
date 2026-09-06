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

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import { existsSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import fg from "fast-glob";
import { getRelationshipsDir } from "../../extractors/relationships.js";
import {
  CANONICAL_ENTITY_PATHS,
  isSymbolsManifestPath,
} from "../../utils/kb-paths.js";

const MARKDOWN_DISCOVERY_IGNORE = ["**/README.md"] as const;
const execFileAsync = promisify(execFile);

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

async function gitTrackedPaths(cwd: string): Promise<Set<string>> {
  const result = await execFileAsync(
    "git",
    ["-C", cwd, "ls-files", "--cached", "-z", "--"],
    { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
  );
  return new Set(
    result.stdout
      .toString("utf8")
      .split("\0")
      .filter(Boolean)
      .map((value) => value.replaceAll("\\", "/")),
  );
}

function pendingSourcePaths(
  cwd: string,
  recoverMissing: boolean,
): {
  paths: Map<string, string>;
  recoveredReceipts: PendingSourceReceiptSnapshot[];
} {
  const root = path.join(cwd, ".kb", "recovery", "pending-sources");
  if (!existsSync(root)) {
    return { paths: new Map(), recoveredReceipts: [] };
  }
  const paths = new Map<string, string>();
  const recoveredReceipts: PendingSourceReceiptSnapshot[] = [];
  for (const name of readdirSync(root)) {
    if (!name.endsWith(".json")) continue;
    const receiptPath = path.join(root, name);
    try {
      const raw = readFileSync(receiptPath, "utf8");
      const receipt = JSON.parse(raw) as {
        path?: unknown;
        afterHash?: unknown;
      };
      if (
        typeof receipt.path === "string" &&
        receipt.path.length > 0 &&
        typeof receipt.afterHash === "string" &&
        /^[a-f0-9]{64}$/i.test(receipt.afterHash)
      ) {
        const relative = receipt.path.replaceAll("\\", "/");
        const absolute = path.resolve(cwd, relative);
        if (!absolute.startsWith(`${path.resolve(cwd)}${path.sep}`)) {
          throw new Error(
            `Pending source receipt escapes workspace: ${relative}`,
          );
        }
        if (!existsSync(absolute)) {
          if (recoverMissing) {
            recoveredReceipts.push({
              receiptPath,
              path: relative,
              afterHash: receipt.afterHash,
              rawHash: createHash("sha256").update(raw).digest("hex"),
            });
            continue;
          }
          throw new Error(`Pending source is missing: ${relative}`);
        }
        const actual = createHash("sha256")
          .update(readFileSync(absolute))
          .digest("hex");
        if (actual !== receipt.afterHash) {
          throw new Error(
            `Pending source hash drift blocks sync for ${relative}; expected ${receipt.afterHash}, found ${actual}`,
          );
        }
        paths.set(relative, receipt.afterHash);
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (/Pending source/.test(error.message) ||
          /Pending source receipt/.test(error.message))
      ) {
        throw error;
      }
      // Malformed receipts are ignored; an operator can remove or repair the
      // receipt through the normal recovery operation.
    }
  }
  return { paths, recoveredReceipts };
}

export function isFsEnoent(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

export function readTextOrEnoent(absolute: string): string | null {
  try {
    return fs.readFileSync(absolute, "utf8");
  } catch (error) {
    if (isFsEnoent(error)) return null;
    throw new Error(
      `Failed to inspect pending source receipt for ${absolute}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function unlinkOrEnoent(absolute: string): boolean {
  try {
    fs.unlinkSync(absolute);
    return true;
  } catch (error) {
    if (isFsEnoent(error)) return false;
    throw new Error(
      `Failed to retire pending source receipt for ${absolute}: ${error instanceof Error ? error.message : String(error)}`,
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
      throw new Error(
        `Pending source receipt escapes recovery root: ${absolute}`,
      );
    }
    if (!existsSync(absolute)) continue;

    // Compare-and-delete: a receipt may have been replaced while the
    // recovery rebuild was running.  Never remove the replacement merely
    // because it has the same receipt filename.  Failing closed here is
    // important: publication may have completed, but recovery must not claim
    // that pending intent was retired when a newer intent remains.
    const raw = readTextOrEnoent(absolute);
    if (raw === null) continue;
    const rawHash = createHash("sha256").update(raw).digest("hex");
    if (rawHash !== receipt.rawHash) {
      throw new Error(
        `Pending source receipt changed during recovery for ${receipt.path}; refusing to retire newer receipt`,
      );
    }
    let current: { path?: unknown; afterHash?: unknown };
    try {
      current = JSON.parse(raw) as {
        path?: unknown;
        afterHash?: unknown;
      };
    } catch {
      throw new Error(
        `Pending source receipt changed during recovery for ${receipt.path}; refusing to retire newer receipt`,
      );
    }
    if (
      current.path !== receipt.path ||
      current.afterHash !== receipt.afterHash
    ) {
      throw new Error(
        `Pending source receipt changed during recovery for ${receipt.path}; refusing to retire newer receipt`,
      );
    }
    unlinkOrEnoent(absolute);
  }
}

function filterTracked(
  cwd: string,
  files: readonly string[],
  tracked: ReadonlySet<string>,
  pending: ReadonlySet<string>,
): string[] {
  const retained: string[] = [];
  for (const file of files) {
    const relative = path.relative(cwd, file).replaceAll(path.sep, "/");
    if (tracked.has(relative)) {
      retained.push(file);
      continue;
    }
    if (pending.has(relative)) {
      retained.push(file);
    }
  }
  return retained;
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
  const markdownPatterns = [
    normalizeMarkdownPath(CANONICAL_ENTITY_PATHS.requirements),
    normalizeMarkdownPath(CANONICAL_ENTITY_PATHS.scenarios),
    normalizeMarkdownPath(CANONICAL_ENTITY_PATHS.tests),
    normalizeMarkdownPath(CANONICAL_ENTITY_PATHS.adr),
    normalizeMarkdownPath(CANONICAL_ENTITY_PATHS.flags),
    normalizeMarkdownPath(CANONICAL_ENTITY_PATHS.events),
    normalizeMarkdownPath(CANONICAL_ENTITY_PATHS.facts),
  ].filter((p): p is string => Boolean(p));

  const markdownFiles = await fg(markdownPatterns, {
    cwd,
    absolute: true,
    ignore: [...MARKDOWN_DISCOVERY_IGNORE],
  });
  let entityMarkdownFiles = (
    Array.isArray(markdownFiles) ? markdownFiles : []
  ).filter((file) => !file.endsWith("/README.md"));

  let manifestFiles = await fg(CANONICAL_ENTITY_PATHS.symbols, {
    cwd,
    absolute: true,
  });
  if (!Array.isArray(manifestFiles)) {
    manifestFiles = [];
  }
  const recoveredPendingReceiptPaths: PendingSourceReceiptSnapshot[] = [];

  if (options.trackedOnly) {
    const tracked = await gitTrackedPaths(cwd);
    const pending = pendingSourcePaths(
      cwd,
      options.recoverMissingPendingSources === true,
    );
    recoveredPendingReceiptPaths.push(...pending.recoveredReceipts);
    entityMarkdownFiles = filterTracked(
      cwd,
      entityMarkdownFiles,
      tracked,
      new Set(pending.paths.keys()),
    );
    manifestFiles = filterTracked(
      cwd,
      manifestFiles,
      tracked,
      new Set(pending.paths.keys()),
    );
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
        try {
          const receipt = JSON.parse(
            readFileSync(path.join(pendingRoot, name), "utf8"),
          ) as { path?: unknown };
          if (
            typeof receipt.path === "string" &&
            tracked.has(receipt.path.replaceAll("\\", "/"))
          ) {
            unlinkSync(path.join(pendingRoot, name));
          }
        } catch {
          // Leave malformed receipts for explicit recovery diagnostics.
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
