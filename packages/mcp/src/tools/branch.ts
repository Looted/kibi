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

 Notes:
 - Apply the header to the source files (TS/JS/other) in `packages/*/src` before building.
 - For small CLI wrapper scripts (e.g. `packages/*/bin/*`) you can add the header as a block comment directly above the shebang line or below it; if you need the shebang to remain the very first line, place the header after the shebang.
 - Built `dist/` files are generated; prefer to modify source files and rebuild rather than editing `dist/` directly.

*/

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import { resolveKbPath, resolveWorkspaceRoot } from "../workspace.js";

export interface BranchEnsureArgs {
  branch: string;
}

export interface BranchEnsureResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    created: boolean;
    path: string;
  };
}

export interface BranchGcArgs {
  dry_run?: boolean;
}

export interface BranchGcResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    stale: string[];
    deleted: number;
  };
}

/**
 * Handle kb_branch_ensure tool calls - create branch KB if not exists
 */
export async function handleKbBranchEnsure(
  _prolog: PrologProcess,
  args: BranchEnsureArgs,
): Promise<BranchEnsureResult> {
  const { branch } = args;

  if (!branch || branch.trim() === "") {
    throw new Error("Branch name is required");
  }

  // Sanitize branch name (prevent path traversal)
  const isSafe = (name: string) => {
    // No empty or excessively long names
    if (!name || name.length > 255) return false;
    // No path traversal or absolute paths
    if (name.includes("..") || path.isAbsolute(name) || name.startsWith("/")) {
      return false;
    }
    // Whitelist characters (alphanumeric, dot, underscore, hyphen, forward slash)
    if (!/^[a-zA-Z0-9._\-/]+$/.test(name)) return false;
    // No redundant slashes or trailing slash/dot
    if (
      name.includes("//") ||
      name.endsWith("/") ||
      name.endsWith(".") ||
      name.includes("\\")
    ) {
      return false;
    }

    return true;
  };

  if (!isSafe(branch)) {
    throw new Error(`Invalid branch name: ${branch}`);
  }
  const safeBranch = branch;

  try {
    const workspaceRoot = resolveWorkspaceRoot();
    const branchPath = resolveKbPath(workspaceRoot, safeBranch);
    const developPath = resolveKbPath(workspaceRoot, "develop");

    // Check if branch KB already exists
    if (fs.existsSync(branchPath)) {
      return {
        content: [
          {
            type: "text",
            text: `Branch KB '${safeBranch}' already exists`,
          },
        ],
        structuredContent: {
          created: false,
          path: branchPath,
        },
      };
    }

    // Ensure develop branch exists
    if (!fs.existsSync(developPath)) {
      throw new Error("Develop branch KB does not exist. Run 'kb init' first.");
    }

    // Copy develop branch KB to new branch
    fs.cpSync(developPath, branchPath, { recursive: true });

    return {
      content: [
        {
          type: "text",
          text: `Created branch KB '${safeBranch}' from develop`,
        },
      ],
      structuredContent: {
        created: true,
        path: branchPath,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Branch ensure failed: ${message}`);
  }
}

/**
 * Handle kb_branch_gc tool calls - garbage collect stale branch KBs
 */
export async function handleKbBranchGc(
  _prolog: PrologProcess,
  args: BranchGcArgs,
): Promise<BranchGcResult> {
  const { dry_run = true } = args;

  try {
    const workspaceRoot = resolveWorkspaceRoot();
    const kbRoot = path.dirname(resolveKbPath(workspaceRoot, "develop"));

    // Check if .kb/branches exists
    if (!fs.existsSync(kbRoot)) {
      return {
        content: [
          {
            type: "text",
            text: "No branch KBs found (.kb/branches does not exist)",
          },
        ],
        structuredContent: {
          stale: [],
          deleted: 0,
        },
      };
    }

    let gitBranches: Set<string>;
    try {
      execSync("git rev-parse --git-dir", {
        encoding: "utf-8",
        cwd: workspaceRoot,
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
      });

      const output = execSync("git branch --format='%(refname:short)'", {
        encoding: "utf-8",
        cwd: workspaceRoot,
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
      });
      gitBranches = new Set(
        output
          .trim()
          .split("\n")
          .map((b) => b.trim().replace(/^'|'$/g, ""))
          .filter((b) => b),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Not in a git repository or git command failed: ${message}`,
      );
    }

    // Get all KB branches
    const kbBranches = fs
      .readdirSync(kbRoot, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    // Find stale branches (KB exists but git branch doesn't, excluding develop)
    const staleBranches = kbBranches.filter(
      (kb) => kb !== "develop" && !gitBranches.has(kb),
    );

    // Delete stale branches if not dry run
    let deletedCount = 0;
    if (!dry_run && staleBranches.length > 0) {
      for (const branch of staleBranches) {
        const branchPath = path.join(kbRoot, branch);
        fs.rmSync(branchPath, { recursive: true, force: true });
        deletedCount++;
      }
    }

    const summary = dry_run
      ? `Found ${staleBranches.length} stale branch KB(s) (dry run - not deleted)`
      : `Deleted ${deletedCount} stale branch KB(s)`;

    return {
      content: [
        {
          type: "text",
          text: summary,
        },
      ],
      structuredContent: {
        stale: staleBranches,
        deleted: deletedCount,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Branch GC failed: ${message}`);
  }
}
