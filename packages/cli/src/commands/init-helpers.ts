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
import { ensureBranchStoreManifest } from "../utils/branch-store-locator.js";
import { defaultKbManifest, writeKbManifest } from "../utils/kb-manifest.js";
import { ENTITY_LANES, KB_PATHS } from "../utils/kb-paths.js";
import { SYMBOLS_MANIFEST_COMMENT_BLOCK } from "./sync/manifest.js";

const POST_CHECKOUT_HOOK = `#!/bin/sh
# post-checkout hook for kibi
# Parameters: old_ref new_ref branch_flag
# branch_flag is 1 for branch checkout, 0 for file checkout
# Refresh branch/worktree assumptions after checkout so advisory plugin state
# starts from synced KB data instead of stale in-memory cache assumptions.
# Uses default non-coordinate-writing sync to avoid writing
# committed symbol artifacts during automatic hook execution.

old_ref=$1
new_ref=$2
branch_flag=$3

if [ "$branch_flag" = "1" ]; then
  # Branch stores are derived from the checked-out tracked sources. Never copy
  # the old branch's compiled store during checkout.
  kibi sync
fi
`;

const POST_MERGE_HOOK = `#!/bin/sh
# post-merge hook for kibi
# Parameter: squash_flag (not used)
# Refresh KB state after merge so branch-level assumptions remain current.
# Uses default non-coordinate-writing sync to avoid writing
# committed symbol artifacts during automatic hook execution.

kibi sync
`;

const POST_REWRITE_HOOK = `#!/bin/sh
# post-rewrite hook for kibi
# Triggered after git rebase, git commit --amend, etc.
# Parameter: rewrite_type (rebase or amend)
# Uses default non-coordinate-writing sync to avoid writing
# committed symbol artifacts during automatic hook execution.

rewrite_type=$1

if [ "$rewrite_type" = "rebase" ]; then
  kibi sync
fi
`;

const PRE_COMMIT_HOOK = `#!/bin/sh
# pre-commit hook for kibi
# Hard enforcement boundary: commits are blocked only here via kibi check.
# The OpenCode plugin remains advisory and must not replace this gate.
# Behavior-changing source edits require staged Kibi impact evidence
# (KB entity docs under .kb/, authored symbols metadata, or refreshed
# symbol coordinates). Test-only and docs-only edits are exempt.
# Refresh with:
#   kibi sync --refresh-symbol-coordinates && git add .kb/symbol-coordinates.yaml .kb/symbols.yaml

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
  // Canonical tracked knowledge lanes under .kb/.
  for (const lane of ENTITY_LANES) {
    mkdirSync(path.join(kbDir, lane), { recursive: true });
  }
  ensureBranchStoreManifest(path.dirname(kbDir), currentBranch);
  console.log("✓ Created .kb/ directory structure");
  console.log(`✓ Created hashed branch store for ${currentBranch}`);
}

export function createManifestFile(kbDir: string): void {
  writeKbManifest(path.dirname(kbDir), defaultKbManifest());
  console.log("✓ Created Kibi lifecycle manifest at .kb/manifest.json");
}

export function updateGitIgnore(cwd: string): void {
  // implements REQ-cli-init-canonical
  const gitignorePath = path.join(cwd, ".gitignore");
  const gitignoreContent = existsSync(gitignorePath)
    ? readFileSync(gitignorePath, "utf8")
    : "";

  const ensureEntry = (current: string, entry: string): string => {
    const lines = current.split(/\r?\n/).map((line) => line.trim());
    if (lines.includes(entry)) {
      return current;
    }

    return current ? `${current.trimEnd()}\n${entry}\n` : `${entry}\n`;
  };

  // Derived runtime state stays ignored. Authored knowledge lanes, the
  // symbols manifest, relationship shards, schema, and the lifecycle
  // manifest stay committable. `.kb/migrations/` is derived runtime
  // audit state, not tracked project knowledge.
  let updatedContent = stripLegacyKibiGitIgnoreStanza(gitignoreContent);
  for (const entry of CANONICAL_DERIVED_GITIGNORE_ENTRIES) {
    updatedContent = ensureEntry(updatedContent, entry);
  }

  if (updatedContent !== gitignoreContent) {
    writeFileSync(gitignorePath, updatedContent);
    console.log("✓ Configured .gitignore for the canonical .kb/ layout");
  }
}

/** Exact derived-runtime entries owned by current Kibi init/migrate. */
const CANONICAL_DERIVED_GITIGNORE_ENTRIES = [
  ".kb/branches/",
  ".kb/recovery/",
  ".kb/proof/runs/",
  ".kb/briefs/",
  ".kb/migrations/",
  ".kb/usage.log",
] as const;

/**
 * Pre-canonical Kibi init wrote a blanket `.kb/` fence and then
 * re-included only config/schema/relationship artifacts. After the
 * knowledge cutover that fence would keep `.kb/requirements/*` ignored.
 */
const LEGACY_KIBI_GITIGNORE_FENCE = ".kb/";
const LEGACY_KIBI_GITIGNORE_REINCLUDES = [
  "!.kb/",
  "!.kb/config.json",
  "!.kb/schema/",
  "!.kb/relationships/",
  "!.kb/relationships/*.yaml",
] as const;

function stripLegacyKibiGitIgnoreStanza(content: string): string {
  if (content.length === 0) return content;
  const lines = content.split(/\r?\n/);
  const trimmed = lines.map((line) => line.trim());
  const hasFence = trimmed.includes(LEGACY_KIBI_GITIGNORE_FENCE);
  const hasReinclude = LEGACY_KIBI_GITIGNORE_REINCLUDES.some((entry) =>
    trimmed.includes(entry),
  );
  if (!hasFence || !hasReinclude) {
    return content;
  }
  const drop = new Set<string>([
    LEGACY_KIBI_GITIGNORE_FENCE,
    ...LEGACY_KIBI_GITIGNORE_REINCLUDES,
  ]);
  const kept = lines.filter((line) => !drop.has(line.trim()));
  while (kept.length > 0 && kept[kept.length - 1] === "") {
    kept.pop();
  }
  return kept.length === 0 ? "" : `${kept.join("\n")}\n`;
}

// implements REQ-003
export function ensureSymbolsManifestFile(cwd: string): void {
  const symbolsRelPath = KB_PATHS.symbolsManifest;
  const symbolsPath = path.join(cwd, symbolsRelPath);
  if (existsSync(symbolsPath)) {
    return;
  }

  mkdirSync(path.dirname(symbolsPath), { recursive: true });
  writeFileSync(symbolsPath, `${SYMBOLS_MANIFEST_COMMENT_BLOCK}symbols: []\n`);
  console.log(`✓ Created ${symbolsRelPath}`);
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

const KIBI_HOOK_BEGIN = "# BEGIN kibi-managed";
const KIBI_HOOK_END = "# END kibi-managed";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function installHook(hookPath: string, content: string): void {
  // implements REQ-008
  const kibiSection = `${KIBI_HOOK_BEGIN}\n${content}\n${KIBI_HOOK_END}`;

  if (existsSync(hookPath)) {
    const existing = readFileSync(hookPath, "utf8");

    if (
      existing.includes(KIBI_HOOK_BEGIN) &&
      existing.includes(KIBI_HOOK_END)
    ) {
      // Replace only the kibi-managed section, preserving any user-authored content
      const updated = existing.replace(
        new RegExp(
          `${escapeRegex(KIBI_HOOK_BEGIN)}[\\s\\S]*?${escapeRegex(KIBI_HOOK_END)}`,
        ),
        kibiSection,
      );
      writeFileSync(hookPath, updated, { mode: 0o755 });
    } else if (existing.trim().length > 0) {
      return;
    } else {
      const shebang = existing.startsWith("#!/") ? "" : "#!/bin/sh\n";
      writeFileSync(
        hookPath,
        `${shebang}${existing.trimEnd()}\n${kibiSection}\n`,
        { mode: 0o755 },
      );
    }
  } else {
    writeFileSync(hookPath, `#!/bin/sh\n${kibiSection}\n`, { mode: 0o755 });
  }
  // Explicitly ensure hook is executable
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
