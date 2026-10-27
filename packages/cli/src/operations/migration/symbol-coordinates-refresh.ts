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
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { load as parseYAML } from "js-yaml";
import { resolveSymbolsManifestPaths } from "../../utils/manifest-paths.js";
import { republishPendingSourceReceipt } from "../mutation/source-authoring.js";
import { withSymbolCompilerLock } from "../mutation/symbol-compiler-lock.js";

/**
 * Bytes of the symbols manifest and its generated coordinate artifact at
 * their canonical paths; null for a file that does not exist.
 */
// implements REQ-cli-migration-first-commit
export type GeneratedManifestBytes = Readonly<{
  symbols: string | null;
  coordinates: string | null;
}>;

function readOrNull(filePath: string): string | null {
  return existsSync(filePath) ? readFileSync(filePath, "utf8") : null;
}

/** Snapshot taken before a migration writes, to tell what it rewrote. */
// implements REQ-cli-migration-first-commit
export function readGeneratedManifestBytes(
  workspaceRoot: string,
): GeneratedManifestBytes {
  const paths = resolveSymbolsManifestPaths(workspaceRoot);
  return {
    symbols: readOrNull(paths.symbolsPath),
    coordinates: readOrNull(paths.coordinatesPath),
  };
}

function hasSymbols(content: string): boolean {
  try {
    const parsed = parseYAML(content) as { symbols?: unknown } | null;
    return Array.isArray(parsed?.symbols) && parsed.symbols.length > 0;
  } catch {
    // An unreadable manifest is reported by the refresh itself.
    return true;
  }
}

/** What the post-migration coordinate refresh did. */
// implements REQ-cli-migration-first-commit
export type MigrationCoordinateRefresh =
  | { outcome: "skipped" }
  | { outcome: "refreshed" }
  | { outcome: "failed"; reason: string };

/**
 * Refresh generated symbol coordinates the way
 * `kibi sync --refresh-symbol-coordinates` does, after a migration rewrote or
 * moved the symbols manifest. The coordinate artifact binds each record by an
 * identity hash that includes `granularity_reason`, so a legacy-link mark
 * leaves the local coordinates stale, and the refresh also writes the
 * symbols manifest in the canonical layout the pre-commit
 * generated-manifest gate expects for the first commit after a migration.
 *
 * Skipped when `before` shows the run left both files untouched, or when the
 * manifest has no symbols. A refresh failure is returned, not thrown: the
 * migration itself is complete, and the caller tells the user to refresh by
 * hand before committing.
 */
// implements REQ-cli-migration-first-commit
export async function refreshCoordinatesAfterMigration(
  workspaceRoot: string,
  before?: GeneratedManifestBytes,
): Promise<MigrationCoordinateRefresh> {
  const after = readGeneratedManifestBytes(workspaceRoot);
  if (after.symbols === null || !hasSymbols(after.symbols))
    return { outcome: "skipped" };
  if (
    before !== undefined &&
    before.symbols === after.symbols &&
    before.coordinates === after.coordinates
  )
    return { outcome: "skipped" };
  const { symbolsPath, coordinatesPath } =
    resolveSymbolsManifestPaths(workspaceRoot);
  try {
    const { refreshManifestCoordinates } = await import(
      "../../commands/sync/manifest.js"
    );
    await withSymbolCompilerLock(workspaceRoot, () =>
      refreshManifestCoordinates(symbolsPath, workspaceRoot, {
        refreshSymbolCoordinates: true,
      }),
    );
    // Files the migration moved are still untracked and pinned by a
    // pending-source receipt; rebind each to its refreshed bytes so the next
    // sync does not refuse it as hash drift. A file without a receipt is
    // left alone.
    for (const filePath of [symbolsPath, coordinatesPath]) {
      if (!existsSync(filePath)) continue;
      republishPendingSourceReceipt(
        workspaceRoot,
        path.relative(workspaceRoot, filePath).split(path.sep).join("/"),
        createHash("sha256")
          .update(readFileSync(filePath, "utf8"), "utf8")
          .digest("hex"),
      );
    }
    return { outcome: "refreshed" };
  } catch (error) {
    return {
      outcome: "failed",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

/** The line a migration prints when its coordinate refresh failed. */
// implements REQ-cli-migration-first-commit
export function coordinateRefreshFailureMessage(reason: string): string {
  return `Could not refresh symbol coordinates after the migration (${reason}). Run 'kibi sync --refresh-symbol-coordinates' and stage .kb/symbols.yaml before the first commit, or the pre-commit hook reports generated manifest drift.`;
}
