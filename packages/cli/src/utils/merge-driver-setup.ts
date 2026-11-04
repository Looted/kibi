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
// implements REQ-cli-doctor
export function localKibiCommand(cwd: string): string {
  const has = (file: string) => existsSync(path.join(cwd, file));
  if (has("pnpm-lock.yaml")) return "pnpm exec kibi";
  if (has("yarn.lock")) return "yarn exec kibi";
  if (has("bun.lock") || has("bun.lockb")) return "bunx --no-install kibi";
  return "npm exec --no -- kibi";
}

/** How to route the authored manifests to `kibi merge-driver`. */
// implements REQ-cli-doctor
export function mergeDriverSetup(cwd?: string): string {
  const command =
    cwd === undefined ? "npm exec --no -- kibi" : localKibiCommand(cwd);
  return `Add to .gitattributes: ".kb/symbols.yaml merge=kibi" and ".kb/relationships/*.yaml merge=kibi"; then run: git config merge.kibi.driver "${command} merge-driver %O %A %B" (see docs/cli-reference.md#kibi-merge-driver-base-current-other).`;
}

/** The npm form of {@link mergeDriverSetup}. */
// implements REQ-cli-doctor
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
// implements REQ-cli-doctor
export function manifestMergeDriverGaps(cwd: string): string[] | null {
  if (gitOutput(cwd, ["rev-parse", "--is-inside-work-tree"]) !== "true") {
    return null;
  }
  if (!hasSymbolRecords(cwd)) return null;
  const attribute = gitOutput(cwd, ["check-attr", "merge", ".kb/symbols.yaml"]);
  const routed = attribute.endsWith(": merge: kibi");
  const driver = gitOutput(cwd, ["config", "--get", "merge.kibi.driver"]);
  return [
    ...(routed ? [] : [".kb/symbols.yaml is not routed to merge=kibi"]),
    ...(driver ? [] : ["merge.kibi.driver is not set"]),
  ];
}
