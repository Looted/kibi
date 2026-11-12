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
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * The command that runs the project's local kibi, chosen from its lockfile so
 * a pnpm, Yarn or Bun repository is not told to use npm.
 */
export function localKibiCommand(cwd: string): string {
  const has = (file: string) => existsSync(path.join(cwd, file));
  if (has("pnpm-lock.yaml")) return "pnpm exec kibi";
  if (has("yarn.lock")) return "yarn exec kibi";
  if (has("bun.lock") || has("bun.lockb")) return "bunx --no-install kibi";
  return "npm exec --no -- kibi";
}

/** The gap {@link manifestMergeDriverGaps} reports for a missing attribute. */
export const MERGE_ATTRIBUTE_GAP =
  ".kb/symbols.yaml is not routed to merge=kibi";

/** The gap {@link manifestMergeDriverGaps} reports for an unset driver. */
export const MERGE_DRIVER_GAP = "merge.kibi.driver is not set";

/**
 * How to route the authored manifests to `kibi merge-driver`. Given the
 * gaps {@link manifestMergeDriverGaps} found, it names only the missing
 * steps, so a repository whose `.gitattributes` already routes the manifests
 * is not told to add them again.
 */
export function mergeDriverSetup(
  cwd?: string,
  gaps: readonly string[] = [MERGE_ATTRIBUTE_GAP, MERGE_DRIVER_GAP],
): string {
  const command =
    cwd === undefined ? "npm exec --no -- kibi" : localKibiCommand(cwd);
  const attribute = gaps.includes(MERGE_ATTRIBUTE_GAP)
    ? 'Add to .gitattributes: ".kb/symbols.yaml merge=kibi" and ".kb/relationships/*.yaml merge=kibi"'
    : "";
  const driver = gaps.includes(MERGE_DRIVER_GAP)
    ? `git config merge.kibi.driver "${command} merge-driver %O %A %B"`
    : "";
  const steps =
    attribute && driver
      ? `${attribute}; then run: ${driver}`
      : attribute || `Run: ${driver}`;
  return `${steps} (see docs/cli-reference.md#kibi-merge-driver-base-current-other).`;
}

/** The npm form of {@link mergeDriverSetup}. */
export const MERGE_DRIVER_SETUP = mergeDriverSetup();

/** Trimmed stdout of a git command, or "" when it fails. */
function gitOutput(cwd: string, args: readonly string[]): string {
  let output = "";
  try {
    output = execFileSync("git", [...args], {
      cwd,
      encoding: "utf8",
      // rationale: this only keeps git's stderr off the console; stdout is
      // piped either way.
      // Stryker disable next-line ArrayDeclaration
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    // Not a work tree, or the config key is unset: no answer.
  }
  return output;
}

function hasSymbolRecords(cwd: string): boolean {
  try {
    return /^\s*-\s+id\s*:/m.test(
      readFileSync(path.join(cwd, ".kb", "symbols.yaml")).toString(),
    );
  } catch {
    // No manifest yet: nothing to merge.
  }
  return false;
}

/**
 * What keeps Git from resolving `.kb/symbols.yaml` with `kibi merge-driver`:
 * the attribute that routes the file to it, and the driver command. Empty
 * when both are set, and null outside a Git work tree or while the
 * manifest holds no symbol records (nothing to conflict on yet).
 */
export function manifestMergeDriverGaps(cwd: string): string[] | null {
  if (gitOutput(cwd, ["rev-parse", "--is-inside-work-tree"]) !== "true") {
    return null;
  }
  if (!hasSymbolRecords(cwd)) return null;
  const attribute = gitOutput(cwd, ["check-attr", "merge", ".kb/symbols.yaml"]);
  const routed = attribute.endsWith(": merge: kibi");
  const driver = gitOutput(cwd, ["config", "--get", "merge.kibi.driver"]);
  return [
    ...(routed ? [] : [MERGE_ATTRIBUTE_GAP]),
    ...(driver ? [] : [MERGE_DRIVER_GAP]),
  ];
}
