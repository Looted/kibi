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

import { spawnSync } from "node:child_process";
import { KB_PATHS } from "../../utils/kb-paths.js";

/** Schema version from which symbol coordinates are derived and never tracked. */
export const DERIVED_COORDINATES_SCHEMA_VERSION = 13;

/** What the schema 13 untracking step did to the Git index. */
// implements REQ-symbol-coordinates-derived-locally
export type CoordinateUntrackOutcome =
  | { outcome: "untracked" }
  | { outcome: "not_tracked" }
  | { outcome: "not_a_repository" }
  | { outcome: "failed"; reason: string };

function git(cwd: string, args: string[]) {
  return spawnSync("git", args, { cwd, encoding: "utf8" });
}

/** True when the derived coordinate artifact is in the Git index. */
// implements REQ-symbol-coordinates-derived-locally
export function isCoordinateArtifactTracked(cwd: string): boolean | null {
  const result = git(cwd, [
    "ls-files",
    "--error-unmatch",
    "--",
    KB_PATHS.symbolCoordinates,
  ]);
  if (result.error) return null;
  if (result.status === 0) return true;
  return /did not match any file/.test(result.stderr) ? false : null;
}

/**
 * Remove `.kb/symbol-coordinates.yaml` from the Git index and keep the local
 * file. Symbol coordinates are derived from source by every sync and are
 * gitignored from schema 13; tracking them made every two branches that
 * touch the same source file conflict.
 */
// implements REQ-symbol-coordinates-derived-locally
export function untrackCoordinateArtifact(
  cwd: string,
): CoordinateUntrackOutcome {
  const tracked = isCoordinateArtifactTracked(cwd);
  if (tracked === null) return { outcome: "not_a_repository" };
  if (!tracked) return { outcome: "not_tracked" };
  const result = git(cwd, [
    "rm",
    "--cached",
    "--quiet",
    "--",
    KB_PATHS.symbolCoordinates,
  ]);
  if (result.error || result.status !== 0) {
    return {
      outcome: "failed",
      reason: (result.error?.message ?? result.stderr).trim(),
    };
  }
  return { outcome: "untracked" };
}
