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

import path from "node:path";

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
// implements REQ-kibi-fresh-verification-receipts
export function normalizeRepoRelativePath(
  workspaceRoot: string,
  candidate: string,
): string | null {
  if (candidate.trim() === "") return null;
  let slashed = candidate.replaceAll("\\", "/");
  const foreignAbsolute =
    /^[A-Za-z]:\//.test(slashed) || slashed.startsWith("//");
  if (slashed.startsWith("/") || foreignAbsolute) {
    if (foreignAbsolute && path.sep === "/") return null;
    const root = path.resolve(workspaceRoot);
    const relative = path.relative(root, path.resolve(candidate));
    if (relative === "" || path.isAbsolute(relative)) return null;
    slashed = relative.replaceAll("\\", "/");
  }
  const normalized = path.posix.normalize(slashed).replace(/\/+$/, "");
  if (
    normalized === "" ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    return null;
  }
  return normalized;
}
