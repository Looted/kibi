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
import {
  copyCleanSnapshot,
  getBranchDiagnostic,
  isValidBranchName,
  resolveActiveBranch,
} from "../utils/branch-resolver.js";

export interface BranchEnsureOptions {
  from?: string;
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

function resolveDefaultSourceBranch(): string | null {
  // No default branch concept - branches are independent
  // When --from is not specified, an empty branch KB will be created
  return null;
}

function determineSourceBranch(
  explicitFromBranch: string | undefined,
): string | null {
  if (explicitFromBranch) {
    const fromResult = resolveExplicitFromBranch(explicitFromBranch);
    if (fromResult) {
      return fromResult;
    }
  }
  return resolveDefaultSourceBranch();
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
  const branchResult = resolveActiveBranch(process.cwd());

  if ("error" in branchResult) {
    console.error(getBranchDiagnostic(undefined, branchResult.error));
    throw new Error(`Failed to resolve active branch: ${branchResult.error}`);
  }

  const currentBranch = branchResult.branch;
  const kbPath = path.join(process.cwd(), ".kb/branches", currentBranch);

  if (fs.existsSync(kbPath)) {
    console.log(`Branch KB already exists: ${currentBranch}`);
    return;
  }

  const sourceBranch = determineSourceBranch(options?.from);
  if (sourceBranch) {
    createBranchKbFromSource(sourceBranch, currentBranch);
  } else {
    createEmptyBranchKb(currentBranch);
  }
}

export default branchEnsureCommand;
