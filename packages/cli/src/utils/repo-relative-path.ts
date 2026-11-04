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

import { realpathSync } from "node:fs";
import path from "node:path";

/** Drive and UNC spellings name another machine on a POSIX host. */
// rationale: the path separator is fixed per host, so on the POSIX hosts that
// run mutation tests forcing this to true changes nothing observable.
// Stryker disable next-line ConditionalExpression
const POSIX_PATHS = path.sep === "/";

/**
 * Canonical repository-relative form of a recorded path, as proof freshness
 * reads it: POSIX separators and no `.` segments. An absolute path that
 * points inside `workspaceRoot` is re-expressed relative to it, so
 * `packages/a.ts`, `./packages/a.ts`, `packages\a.ts` and
 * `<root>/packages/a.ts` all name the same file. Returns null for a path that
 * leaves the repository (a `..` escape, another machine's absolute path, a
 * drive letter or UNC share outside the root): such a location exists on one
 * machine only, so hashing it would make the same commit prove differently
 * in CI and on a developer checkout.
 *
 * The Unicode form of each name is kept as recorded: the result is used to
 * read the file, and a case- or normalization-sensitive filesystem only finds
 * a name under the exact bytes git checked out. Where a path is an identity
 * (the workspace snapshot), the caller compares it in NFC.
 */
// implements REQ-kibi-fresh-verification-receipts-v2
export function normalizeRepoRelativePath(
  workspaceRoot: string,
  candidate: string,
): string | null {
  if (candidate.trim() === "") return null;
  let slashed = candidate.replaceAll("\\", "/");
  const foreignAbsolute =
    /^[A-Za-z]:\//.test(slashed) || slashed.startsWith("//");
  if (slashed.startsWith("/") || foreignAbsolute) {
    if (foreignAbsolute && POSIX_PATHS) return null;
    const root = path.resolve(workspaceRoot);
    const relative = path.relative(root, path.resolve(candidate));
    // rationale: path.relative returns an absolute path only across Windows
    // drives, so on the POSIX hosts that run mutation tests this never holds.
    // Stryker disable next-line ConditionalExpression
    if (path.isAbsolute(relative)) return null;
    // An empty `relative` (the root itself) normalizes to "." below.
    slashed = relative.replaceAll("\\", "/");
  }
  // posix.normalize already collapses repeated slashes, so at most one trails;
  // it never returns "".
  const normalized = path.posix.normalize(slashed).replace(/\/$/, "");
  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    return null;
  }
  return normalized;
}

/**
 * Resolve a recorded source path to an absolute path that is lexically (and,
 * when the file exists, via realpath) confined under `workspaceRoot`.
 * Returns null for escapes, empty input, or symlink targets outside the root.
 * Callers must treat null as "do not read".
 */
// implements REQ-symbol-sourcefile-workspace-confinement
export function resolveWorkspaceSourceAbsolute(
  workspaceRoot: string,
  sourceFile: string,
): string | null {
  const relative = normalizeRepoRelativePath(workspaceRoot, sourceFile);
  if (relative === null) return null;
  const absolute = path.resolve(workspaceRoot, relative);
  try {
    const realRoot = realpathSync.native(workspaceRoot);
    const realFile = realpathSync.native(absolute);
    // A symlink inside the root may point outside it: the real file must
    // still be confined under the real root.
    return normalizeRepoRelativePath(realRoot, realFile) === null
      ? null
      : realFile;
  } catch {
    // Missing path: lexical confinement from normalizeRepoRelativePath is enough.
    return absolute;
  }
}
