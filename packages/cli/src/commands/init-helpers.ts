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
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";
import {
  getBranchDiagnostic,
  resolveActiveBranch,
} from "../utils/branch-resolver.js";
import { DEFAULT_CONFIG } from "../utils/config.js";

const POST_CHECKOUT_HOOK = `#!/bin/sh
# post-checkout hook for kibi
# Parameters: old_ref new_ref branch_flag
# branch_flag is 1 for branch checkout, 0 for file checkout

old_ref=$1
new_ref=$2
branch_flag=$3

if [ "$branch_flag" = "1" ]; then
  # Try to resolve the branch we just left (strip decorations like ^ and ~)
  old_branch=$(git name-rev --name-only "$old_ref" 2>/dev/null | sed 's/\^.*//')

  # Basic validation: non-empty and does not contain ~ or ^
  if [ -n "$old_branch" ] && echo "$old_branch" | grep -qv '[~^]'; then
    kibi branch ensure --from "$old_branch" && kibi sync
  else
    kibi branch ensure && kibi sync
  fi
fi
`;

const POST_MERGE_HOOK = `#!/bin/sh
# post-merge hook for kibi
# Parameter: squash_flag (not used)

kibi sync
`;

const POST_REWRITE_HOOK = `#!/bin/sh
# post-rewrite hook for kibi
# Triggered after git rebase, git commit --amend, etc.
# Parameter: rewrite_type (rebase or amend)

rewrite_type=$1

if [ "$rewrite_type" = "rebase" ]; then
  kibi sync
fi
`;

const PRE_COMMIT_HOOK = `#!/bin/sh
# pre-commit hook for kibi
# Blocks commits if kibi check finds violations

set -e
kibi check --staged
`;

export async function getCurrentBranch(
  cwd: string = process.cwd(),
): Promise<string> {
  const result = resolveActiveBranch(cwd);

  if ("error" in result) {
    console.error(getBranchDiagnostic(undefined, result.error));
    throw new Error(`Failed to resolve active branch: ${result.error}`);
  }

  return result.branch;
}

export function createKbDirectoryStructure(
  kbDir: string,
  currentBranch: string,
): void {
  mkdirSync(kbDir, { recursive: true });
  mkdirSync(path.join(kbDir, "schema"), { recursive: true });
  mkdirSync(path.join(kbDir, "branches", currentBranch), {
    recursive: true,
  });
  console.log("✓ Created .kb/ directory structure");
  console.log(`✓ Created branches/${currentBranch}/ directory`);
}

export function createConfigFile(kbDir: string): void {
  writeFileSync(
    path.join(kbDir, "config.json"),
    JSON.stringify(DEFAULT_CONFIG, null, 2),
  );
  console.log("✓ Created config.json with default paths");
}

export function updateGitIgnore(cwd: string): void {
  const gitignorePath = path.join(cwd, ".gitignore");
  const gitignoreContent = existsSync(gitignorePath)
    ? readFileSync(gitignorePath, "utf8")
    : "";

  if (!gitignoreContent.includes(".kb/")) {
    const newContent = gitignoreContent
      ? `${gitignoreContent.trimEnd()}\n.kb/\n`
      : ".kb/\n";
    writeFileSync(gitignorePath, newContent);
    console.log("✓ Added .kb/ to .gitignore");
  }
}

export async function copySchemaFiles(
  kbDir: string,
  schemaSourceDir: string,
): Promise<void> {
  const schemaFiles = await fg("*.pl", {
    cwd: schemaSourceDir,
    absolute: false,
  });

  for (const file of schemaFiles) {
    const sourcePath = path.join(schemaSourceDir, file);
    const destPath = path.join(kbDir, "schema", file);
    copyFileSync(sourcePath, destPath);
  }
  console.log(`✓ Copied ${schemaFiles.length} schema files`);
}

export function installHook(hookPath: string, content: string): void {
  if (existsSync(hookPath)) {
    const existing = readFileSync(hookPath, "utf8");
    if (!existing.includes("kibi")) {
      writeFileSync(
        hookPath,
        `${existing}
${content}`,
        {
          mode: 0o755,
        },
      );
    }
  } else {
    writeFileSync(
      hookPath,
      `#!/bin/sh
${content}`,
      { mode: 0o755 },
    );
  }
  // Explicitly ensure hook is executable (mode option can be inconsistent in Docker)
  chmodSync(hookPath, 0o755);
}

export function installGitHooks(gitDir: string): void {
  const hooksDir = path.join(gitDir, "hooks");
  mkdirSync(hooksDir, { recursive: true });

  const postCheckoutPath = path.join(hooksDir, "post-checkout");
  const postMergePath = path.join(hooksDir, "post-merge");
  const postRewritePath = path.join(hooksDir, "post-rewrite");
  const preCommitPath = path.join(hooksDir, "pre-commit");

  installHook(postCheckoutPath, POST_CHECKOUT_HOOK.replace("#!/bin/sh\n", ""));
  installHook(postMergePath, POST_MERGE_HOOK.replace("#!/bin/sh\n", ""));
  installHook(postRewritePath, POST_REWRITE_HOOK.replace("#!/bin/sh\n", ""));
  installHook(preCommitPath, PRE_COMMIT_HOOK.replace("#!/bin/sh\n", ""));

  console.log(
    "✓ Installed git hooks (pre-commit, post-checkout, post-merge, post-rewrite)",
  );
}
