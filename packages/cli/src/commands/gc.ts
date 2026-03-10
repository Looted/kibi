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
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export async function gcCommand(options: {
  dryRun?: boolean;
  force?: boolean;
}) {
  // If force is true, perform deletion. Otherwise default to dry run.
  const dryRun = options?.force ? false : (options?.dryRun ?? true);

  try {
    const kbRoot = path.resolve(process.cwd(), ".kb/branches");

    if (!fs.existsSync(kbRoot)) {
      console.error("No branch KBs found (.kb/branches does not exist)");
      process.exitCode = 1;
      return;
    }

    let gitBranches: Set<string>;
    try {
      execSync("git rev-parse --git-dir", {
        encoding: "utf-8",
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"],
        env: process.env,
      });

      const output = execSync("git branch --format='%(refname:short)'", {
        encoding: "utf-8",
        cwd: process.cwd(),
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
      console.error(
        `Not in a git repository or git command failed: ${message}`,
      );
      process.exitCode = 1;
      return;
    }

    const kbBranches = fs
      .readdirSync(kbRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const protectedBranches = new Set(["main", "develop"]);
    const staleBranches = kbBranches.filter(
      (kb) => !protectedBranches.has(kb) && !gitBranches.has(kb),
    );

    // Perform deletion when dryRun is false (force requested)
    const performDelete = !dryRun;
    let deletedCount = 0;
    if (performDelete && staleBranches.length > 0) {
      for (const branch of staleBranches) {
        const branchPath = path.join(kbRoot, branch);
        fs.rmSync(branchPath, { recursive: true, force: true });
        deletedCount++;
      }
    }

    if (dryRun) {
      console.log(
        `Found ${staleBranches.length} stale branch KB(s) (dry run - not deleted)`,
      );
      if (staleBranches.length > 0) {
        for (const b of staleBranches) console.log(`  - ${b}`);
      }
    } else {
      console.log(`Deleted ${deletedCount} stale branch KB(s)`);
    }

    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Branch GC failed: ${message}`);
    process.exitCode = 1;
  }
}

export default gcCommand;
