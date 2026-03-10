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

  // Branch KB already exists - nothing to do
  if (fs.existsSync(kbPath)) {
    console.log(`Branch KB already exists: ${currentBranch}`);
    return;
  }

  // Determine source branch using fallback order:
  // 1. --from if provided and valid
  // 2. Resolved default branch
  // 3. Empty schema (no source)
  let sourceBranch: string | null = null;

  // 1. Try --from if provided
  if (options?.from) {
    if (!isValidBranchName(options.from)) {
      console.warn(
        `Warning: invalid branch name provided via --from: '${options.from}'`,
      );
    } else {
      const fromPath = path.join(process.cwd(), ".kb/branches", options.from);
      if (fs.existsSync(fromPath)) {
        sourceBranch = options.from;
      } else {
        console.warn(
          `Warning: --from branch '${options.from}' KB does not exist`,
        );
      }
    }
  }

  // 2. Fall back to resolved default branch
  if (!sourceBranch) {
    const config = loadConfig(process.cwd());
    const defaultResult = resolveDefaultBranch(process.cwd(), config);

    if ("branch" in defaultResult) {
      const defaultBranch = defaultResult.branch;
      const defaultPath = path.join(
        process.cwd(),
        ".kb/branches",
        defaultBranch,
      );
      if (fs.existsSync(defaultPath)) {
        sourceBranch = defaultBranch;
      }
    } else {
      console.warn(
        `Warning: could not resolve default branch: ${defaultResult.error}`,
      );
    }
  }

  // 3. Create branch KB (from source or empty)
  if (sourceBranch) {
    const sourcePath = path.join(process.cwd(), ".kb/branches", sourceBranch);
    copyCleanSnapshot(sourcePath, kbPath);
    console.log(`Created branch KB: ${currentBranch} (from ${sourceBranch})`);
  } else {
    // Initialize empty schema
    fs.mkdirSync(kbPath, { recursive: true });
    console.log(`Created branch KB: ${currentBranch} (empty schema)`);
  }
}

export default branchEnsureCommand;
