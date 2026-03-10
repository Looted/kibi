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

/*
 How to apply this header to source files (examples)

 1) Prepend header to a single file (POSIX shells):

    cat LICENSE_HEADER.txt "$FILE" > "$FILE".with-header && mv "$FILE".with-header "$FILE"

 2) Apply to multiple files (example: the project's main entry files):

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp packages/cli/src/*.ts packages/mcp/src/*.ts; do
      if [ -f "$f" ]; then
        cp "$f" "$f".bak
        (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
      fi
    done

 3) Avoid duplicating the header: run a quick guard to only add if missing

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp; do
      if [ -f "$f" ]; then
        if ! head -n 5 "$f" | grep -q "Copyright (C) 2026 Piotr Franczyk"; then
          cp "$f" "$f".bak
          (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
        fi
      fi
    done
*/
import * as fs from "node:fs";
import * as path from "node:path";
import {
  copyCleanSnapshot,
  getBranchDiagnostic,
  isValidBranchName,
  resolveActiveBranch,
  resolveDefaultBranch,
} from "../utils/branch-resolver.js";
import { loadConfig } from "../utils/config.js";

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
  const config = loadConfig(process.cwd());
  const defaultResult = resolveDefaultBranch(process.cwd(), config);

  if ("branch" in defaultResult) {
    const defaultBranch = defaultResult.branch;
    const defaultPath = path.join(process.cwd(), ".kb/branches", defaultBranch);
    if (fs.existsSync(defaultPath)) {
      return defaultBranch;
    }
  } else {
    console.warn(
      `Warning: could not resolve default branch: ${defaultResult.error}`,
    );
  }
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
