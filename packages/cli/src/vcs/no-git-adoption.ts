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

/**
 * When a workspace that Kibi used without Git gets a repository (`git
 * init`), its knowledge carries over on the first Kibi call: every authored
 * `.kb` source on disk that Git does not track yet is sealed with a
 * pending-source receipt for the new branch, so the branch store compiles
 * exactly the bytes the no-Git store answered from. The no-Git store is
 * derived state; it is kept under .kb/recovery/ rather than renamed onto a
 * branch identity, and nothing is deleted.
 */

import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import * as path from "node:path";
import { noGitAdoptionNotice } from "kibi-agent-core/version-control";
import { writePendingSourceReceipt } from "../operations/mutation/source-authoring.js";
import {
  type BranchAttachment,
  NO_GIT_KB_BRANCH,
} from "../utils/branch-resolver.js";
import { branchStorePath } from "../utils/branch-store-locator.js";
import { isSyncableKbSourcePath } from "../utils/kb-paths.js";
import { authoredSourcesSync, kbFilesOnDisk } from "./source-inventory.js";

export type NoGitAdoption = {
  /** The Git branch the knowledge now belongs to. */
  readonly branch: string;
  /** Authored sources sealed for that branch. */
  readonly files: number;
  /** Where the no-Git store was kept. */
  readonly retiredStorePath: string;
  /** The notice for the agent: what happened and the two follow-ups. */
  readonly notice: string;
};

/** The adoption this process performed and no result has reported yet. */
let unreportedAdoption: NoGitAdoption | null = null;

/**
 * The adoption to report on the next result, once: whichever path adopted
 * the store (an auto-compile, sync, init), the agent learns it from the
 * envelope it reads rather than from stderr.
 */
export function takeNoGitAdoption(): NoGitAdoption | null {
  const adoption = unreportedAdoption;
  unreportedAdoption = null;
  return adoption;
}

function adoptionRoot(workspaceRoot: string): string {
  return path.join(workspaceRoot, ".kb", "recovery", "no-git-adoption");
}

/**
 * Adopt the no-Git store into the attached Git branch, once. Returns null
 * when there is nothing to adopt: the attachment is not a Git branch of its
 * own, or no no-Git store exists. A second call (or a process that lost the
 * race) finds no store and returns null.
 */
export function adoptNoGitStore(
  workspaceRoot: string,
  attachment: BranchAttachment,
): NoGitAdoption | null {
  if (attachment.kind !== "exact" || attachment.noGit !== undefined)
    return null;
  const noGitStore = branchStorePath(workspaceRoot, NO_GIT_KB_BRANCH);
  if (!fs.existsSync(noGitStore)) return null;

  const sources = authoredSourcesSync(workspaceRoot, [".kb"]);
  // The attachment is a Git branch, so Git answered.
  const tracked = sources.kind === "git" ? sources.tracked : new Set<string>();
  const untracked = kbFilesOnDisk(workspaceRoot).filter(
    (file) => isSyncableKbSourcePath(file) && !tracked.has(file),
  );

  const id = `${new Date().toISOString().replaceAll(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const root = adoptionRoot(workspaceRoot);
  fs.mkdirSync(root, { recursive: true });
  const journalPath = path.join(root, `${id}.json`);
  const journal = {
    version: 1,
    state: "prepared",
    branch: attachment.kbBranch,
    files: untracked,
    recordedAt: new Date().toISOString(),
  };
  fs.writeFileSync(journalPath, `${JSON.stringify(journal, null, 2)}\n`);

  for (const relative of untracked) {
    const bytes = fs.readFileSync(path.join(workspaceRoot, relative));
    writePendingSourceReceipt(
      workspaceRoot,
      relative,
      createHash("sha256").update(bytes).digest("hex"),
    );
  }

  const retiredStorePath = path.join(root, `${id}-store`);
  try {
    fs.renameSync(noGitStore, retiredStorePath);
  } catch (error) {
    // Another process adopted it first; its receipts bind the same bytes.
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  fs.writeFileSync(
    journalPath,
    `${JSON.stringify({ ...journal, state: "committed", retiredStorePath }, null, 2)}\n`,
  );
  unreportedAdoption = {
    branch: attachment.kbBranch,
    files: untracked.length,
    retiredStorePath,
    notice: noGitAdoptionNotice(attachment.kbBranch, untracked.length),
  };
  return unreportedAdoption;
}
