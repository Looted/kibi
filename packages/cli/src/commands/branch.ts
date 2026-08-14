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

import * as fs from "node:fs";
import * as path from "node:path";
import { EngineClient, engineSocketPath } from "../engine.js";
import {
  copyCleanSnapshot,
  getBranchDiagnostic,
  isValidBranchName,
  resolveActiveBranch,
  resolveBranchAttachment,
} from "../utils/branch-resolver.js";

export interface BranchEnsureOptions {
  from?: string;
}

export interface BranchMigrateOptions {
  from?: string;
  apply?: boolean;
}

function resolveExplicitFromBranch(fromBranch: string): string | null {
  if (!isValidBranchName(fromBranch)) {
    console.warn(
      `Warning: invalid branch name provided via --from: '${fromBranch}'`,
    );
    return null;
  }
  const fromPath = path.join(process.cwd(), ".kb/branches", fromBranch);
  if (fs.existsSync(fromPath)) {
    return fromBranch;
  }
  console.warn(`Warning: --from branch '${fromBranch}' KB does not exist`);
  return null;
}

function createBranchKbFromSource(
  sourceBranch: string,
  targetBranch: string,
): void {
  const sourcePath = path.join(process.cwd(), ".kb/branches", sourceBranch);
  const targetPath = path.join(process.cwd(), ".kb/branches", targetBranch);
  copyCleanSnapshot(sourcePath, targetPath);
  console.log(`Created branch KB: ${targetBranch} (from ${sourceBranch})`);
}

function createEmptyBranchKb(branch: string): void {
  const kbPath = path.join(process.cwd(), ".kb/branches", branch);
  fs.mkdirSync(kbPath, { recursive: true });
  console.log(`Created branch KB: ${branch} (empty schema)`);
}

export async function branchEnsureCommand(
  options?: BranchEnsureOptions,
): Promise<void> {
  const branchResult = resolveBranchAttachment(process.cwd());

  if ("error" in branchResult) {
    console.error(getBranchDiagnostic(undefined, branchResult.error));
    throw new Error(`Failed to resolve active branch: ${branchResult.error}`);
  }

  if (branchResult.migrationRequired) {
    throw new Error(
      `Branch ensure blocked by legacy attachment (${branchResult.gitBranch} -> ${branchResult.kbBranch}). Run 'kibi branch migrate --from ${branchResult.kbBranch} --apply' first.`,
    );
  }
  const currentBranch = branchResult.kbBranch;
  const kbPath = path.join(process.cwd(), ".kb/branches", currentBranch);

  if (fs.existsSync(kbPath)) {
    console.log(`Branch KB already exists: ${currentBranch}`);
    return;
  }

  if (options?.from !== undefined) {
    const sourceBranch = resolveExplicitFromBranch(options.from);
    if (!sourceBranch) {
      throw new Error(
        `Cannot copy branch KB: explicit source '${options.from}' does not exist or is invalid`,
      );
    }
    createBranchKbFromSource(sourceBranch, currentBranch);
  } else {
    createEmptyBranchKb(currentBranch);
  }
}

/**
 * Move a legacy branch-named KB into the exact active Git branch namespace.
 * Preview is the default; --apply is required because this changes tracked
 * workspace state.
 */
export async function branchMigrateCommand(
  options: BranchMigrateOptions = {},
): Promise<void> {
  const from = options.from?.trim();
  if (!from || !isValidBranchName(from)) {
    throw new Error("branch migrate requires a valid --from branch name");
  }
  const active = resolveActiveBranch(process.cwd());
  if ("error" in active) {
    throw new Error(`Failed to resolve active branch: ${active.error}`);
  }
  const to = active.branch;
  if (from === to) {
    throw new Error(`Source and active branch are both '${to}'`);
  }
  const root = path.join(process.cwd(), ".kb", "branches");
  const sourcePath = path.join(root, from);
  const targetPath = path.join(root, to);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Legacy source KB does not exist: ${sourcePath}`);
  }
  if (fs.existsSync(targetPath)) {
    throw new Error(`Target branch KB already exists: ${targetPath}`);
  }
  console.log(`Branch KB migration preview: ${from} -> ${to}`);
  console.log(`Source: ${sourcePath}`);
  console.log(`Target: ${targetPath}`);
  if (!options.apply) {
    console.log("Preview only. Re-run with --apply to move the branch KB.");
    return;
  }
  const engine = new EngineClient({
    workspaceRoot: process.cwd(),
    branch: from,
    timeout: 2_000,
  });
  if (fs.existsSync(engineSocketPath(process.cwd(), from))) {
    await engine.stop(false).catch(() => undefined);
    await engine.terminate().catch(() => undefined);
  }
  fs.mkdirSync(root, { recursive: true });
  fs.renameSync(sourcePath, targetPath);
  console.log(`Migrated branch KB to exact Git branch '${to}'.`);
  console.log(`Git branch remains '${to}'; no branch rename was performed.`);
}

export default branchEnsureCommand;
