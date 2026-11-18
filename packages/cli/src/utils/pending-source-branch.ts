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
import { createHash } from "node:crypto";
import { resolveActiveBranch } from "./branch-resolver.js";

/**
 * The branch a pending-source receipt is written on, or undefined when the
 * workspace has no resolvable branch (outside Git, or a detached HEAD no
 * branch points at). Such a receipt names no branch and is checked on every
 * branch, as every receipt was before receipts recorded one.
 */
export function pendingReceiptBranch(
  workspaceRoot: string,
): string | undefined {
  const resolved = resolveActiveBranch(workspaceRoot);
  return "branch" in resolved ? resolved.branch : undefined;
}

/**
 * Decides, per receipt, whether it belongs to the active branch. Receipts
 * live in one workspace folder that a git checkout does not change. An
 * untracked file stays in the working tree across a checkout, so its receipt
 * binds it on every branch; but a file committed on the branch that wrote the
 * receipt is absent elsewhere, and there sync leaves the receipt alone
 * instead of failing. The active branch is resolved once, on the first
 * receipt that names a branch.
 */
export function pendingReceiptScope(
  workspaceRoot: string,
): (receipt: unknown) => boolean {
  let active: { branch: string | undefined } | undefined;
  return (receipt) => {
    const recorded = (receipt as { branch?: unknown } | null)?.branch;
    if (typeof recorded !== "string") return true;
    active ??= { branch: pendingReceiptBranch(workspaceRoot) };
    return active.branch === undefined || active.branch === recorded;
  };
}

/**
 * Decides whether a pending source missing from this checkout is committed on
 * another local branch with the bytes its receipt recorded. That branch's Git
 * owns those bytes, so the receipt's file was not lost: it was committed
 * somewhere else, often on a branch made after the receipt was written. A
 * file at the same path with other content is not the receipt's file, so it
 * does not count. The local branches are listed once, on the first path
 * asked about; outside Git nothing is committed anywhere.
 */
export function committedOnLocalBranch(
  workspaceRoot: string,
): (relative: string, afterHash: string) => boolean {
  let refs: readonly string[] | undefined;
  return (relative, afterHash) => {
    refs ??= localBranchRefs(workspaceRoot);
    if (refs.length === 0) return false;
    let output: Buffer;
    try {
      output = execFileSync("git", ["cat-file", "--batch"], {
        cwd: workspaceRoot,
        input: refs.map((ref) => `${ref}:${relative}\n`).join(""),
        stdio: ["pipe", "pipe", "ignore"],
        maxBuffer: 1024 * 1024 * 1024,
      });
    } catch {
      return false;
    }
    return batchBlobs(output).some(
      (bytes) => createHash("sha256").update(bytes).digest("hex") === afterHash,
    );
  };
}

/**
 * The blob contents in `git cat-file --batch` output. Each object is a
 * `<oid> <type> <size>` header line, its bytes and a newline; a name Git
 * cannot resolve is one `<name> missing` line.
 */
function batchBlobs(output: Buffer): Buffer[] {
  const blobs: Buffer[] = [];
  let offset = 0;
  while (offset < output.length) {
    const lineEnd = output.indexOf(0x0a, offset);
    // Git ends every header with a newline.
    const header = output.subarray(offset, lineEnd).toString("utf8");
    offset = lineEnd + 1;
    const match = / (blob|tree|commit|tag) (\d+)$/.exec(header);
    if (match === null) continue;
    const size = Number(match[2]);
    if (match[1] === "blob") blobs.push(output.subarray(offset, offset + size));
    offset += size + 1;
  }
  return blobs;
}

function localBranchRefs(workspaceRoot: string): readonly string[] {
  try {
    return execFileSync(
      "git",
      ["for-each-ref", "--format=%(refname)", "refs/heads"],
      {
        cwd: workspaceRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    )
      .split("\n")
      .filter((ref) => ref.length > 0);
  } catch {
    return [];
  }
}
