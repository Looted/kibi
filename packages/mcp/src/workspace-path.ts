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
 along with this program. If not, see <https://www.gnu.org/licenses/>.
*/
import { realpathSync } from "node:fs";
import path from "node:path";

/**
 * Canonical repository-relative form of a recorded path. Returns null when the
 * candidate escapes `workspaceRoot` (absolute foreign path, `..` segment).
 * Kept in lockstep with packages/cli/src/utils/repo-relative-path.ts.
 */
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

/**
 * Resolve a recorded source path to an absolute path confined under
 * `workspaceRoot`. Returns null for escapes; callers must not read on null.
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
    const realRoot = realpathSync.native(path.resolve(workspaceRoot));
    const realFile = realpathSync.native(absolute);
    const confined = path.relative(realRoot, realFile);
    if (confined.startsWith("..") || path.isAbsolute(confined)) return null;
    return realFile;
  } catch {
    return absolute;
  }
}
