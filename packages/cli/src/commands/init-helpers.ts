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
  type Stats,
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
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

// Git executes hooks with the caller's PATH, which does not include
// node_modules/.bin, so a locally installed kibi CLI would not resolve.
// Each hook resolves the binary up front: PATH first (global installs),
// then a walk up from the repository root (git runs hooks from the top of
// the working tree) for local npm/bun dependencies.
const KIBI_BIN_RESOLVER = `KIBI_BIN="$(command -v kibi 2>/dev/null || true)"
if [ -z "$KIBI_BIN" ]; then
  kibi_dir="$PWD"
  while [ -n "$kibi_dir" ] && [ "$kibi_dir" != "/" ]; do
    if [ -x "$kibi_dir/node_modules/.bin/kibi" ]; then
      KIBI_BIN="$kibi_dir/node_modules/.bin/kibi"
      break
    fi
    kibi_parent="\${kibi_dir%/*}"
    if [ -z "$kibi_parent" ]; then
      kibi_parent="/"
    fi
    kibi_dir="$kibi_parent"
  done
fi
if [ -z "$KIBI_BIN" ]; then
  echo "kibi: cannot locate the kibi CLI (checked PATH and node_modules/.bin)." >&2
  echo "Install kibi globally or as a project dependency, then re-run 'kibi init'." >&2
  exit 1
fi`;

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

# File checkouts never refresh the KB; skip binary resolution so sandboxed
# test workspaces without an installed kibi CLI can restore tracked files.
if [ "$branch_flag" != "1" ]; then
  exit 0
fi

${KIBI_BIN_RESOLVER}

# Branch stores are derived from the checked-out tracked sources. Never copy
# the old branch's compiled store during checkout.
"$KIBI_BIN" sync
`;

const POST_MERGE_HOOK = `#!/bin/sh
# post-merge hook for kibi
# Parameter: squash_flag (not used)
# Refresh KB state after merge so branch-level assumptions remain current.
# Uses default non-coordinate-writing sync to avoid writing
# committed symbol artifacts during automatic hook execution.

${KIBI_BIN_RESOLVER}

"$KIBI_BIN" sync
`;

const POST_REWRITE_HOOK = `#!/bin/sh
# post-rewrite hook for kibi
# Triggered after git rebase, git commit --amend, etc.
# Parameter: rewrite_type (rebase or amend)
# Uses default non-coordinate-writing sync to avoid writing
# committed symbol artifacts during automatic hook execution.

rewrite_type=$1

${KIBI_BIN_RESOLVER}

if [ "$rewrite_type" = "rebase" ]; then
  "$KIBI_BIN" sync
fi
`;

const PRE_COMMIT_HOOK = `#!/bin/sh
# pre-commit hook for kibi
# Hard enforcement boundary: commits are blocked only here via kibi check.
# The OpenCode plugin remains advisory and must not replace this gate.
# Behavior-changing source edits require staged Kibi impact evidence
# (KB entity docs under .kb/, authored symbols metadata, or refreshed
# symbol coordinates). Test-only and docs-only edits are exempt.
# Generated manifests are checked against the exact staged snapshot before
# traceability validation. The check never stages files on the user's behalf.

set -e

${KIBI_BIN_RESOLVER}

"$KIBI_BIN" check-generated --staged --changed-only
"$KIBI_BIN" check --staged
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
  ".env.kibi",
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

export type InstallHookResult =
  | "installed"
  | "updated"
  | "skipped-foreign"
  | "skipped-symlink"
  | "skipped-unsupported";

function hookIntegrationRecipe(hook: string): string {
  // Recipes must reproduce the exact checks the Kibi template runs for that
  // hook, with failure propagation, or the delegation is weaker than the
  // template it replaces.
  switch (hook) {
    case "pre-commit":
      return "delegate from that hook with 'kibi check-generated --staged --changed-only && kibi check --staged' (both commands must succeed; '&&' propagates the first failure)";
    case "post-checkout":
      return "delegate from that hook to 'kibi sync' on branch checkouts (the template skips file checkouts)";
    case "post-merge":
      return "delegate from that hook to 'kibi sync'";
    case "post-rewrite":
      return "delegate from that hook to 'kibi sync' after rebase/amend rewrites";
    default:
      return "delegate to the matching Kibi template command";
  }
}

export function installHook(
  hookPath: string,
  content: string,
): InstallHookResult {
  // implements REQ-008
  // implements REQ-git-hook-effective-install
  const kibiSection = `${KIBI_HOOK_BEGIN}\n${content}\n${KIBI_HOOK_END}`;

  let hookStats: Stats;
  try {
    hookStats = lstatSync(hookPath);
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === "ENOENT" ||
      (error as NodeJS.ErrnoException).code === "ENOTDIR"
    ) {
      // Missing hook: create it through the parent directory. Refuse when an
      // ancestor is itself a symlink whose target leaves the resolved path
      // (realpath is checked by the caller's hooks-dir guard).
      writeFileSync(hookPath, `#!/bin/sh\n${kibiSection}\n`, { mode: 0o755 });
      chmodSync(hookPath, 0o755);
      return "installed";
    }
    console.error(
      `! Unable to inspect ${hookPath}: ${(error as Error).message}; leaving it untouched.`,
    );
    return "skipped-unsupported";
  }

  if (hookStats.isSymbolicLink()) {
    // Never follow a symlinked hook: read/write/chmod would modify an
    // arbitrary target outside our guard. Dangling symlinks are treated the
    // same (the intended target must not be auto-created either).
    return "skipped-symlink";
  }
  if (!hookStats.isFile()) {
    return "skipped-unsupported";
  }

  try {
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
      chmodSync(hookPath, 0o755);
      return "updated";
    }
    if (existing.trim().length > 0) {
      // A hook we did not write: never overwrite foreign enforcement.
      return "skipped-foreign";
    }

    const shebang = existing.startsWith("#!/") ? "" : "#!/bin/sh\n";
    writeFileSync(
      hookPath,
      `${shebang}${existing.trimEnd()}\n${kibiSection}\n`,
      { mode: 0o755 },
    );
    chmodSync(hookPath, 0o755);
    return "installed";
  } catch (error) {
    console.error(
      `! Unable to read ${hookPath}: ${(error as Error).message}; leaving it untouched.`,
    );
    return "skipped-unsupported";
  }
}

export interface GitHookInstallResult {
  hook: "pre-commit" | "post-checkout" | "post-merge" | "post-rewrite";
  result: InstallHookResult;
}

export function installGitHooks(
  hooksDir: string,
  options: { hooksPathOrigin?: string | null } = {},
): GitHookInstallResult[] {
  // implements REQ-git-hook-effective-install
  mkdirSync(hooksDir, { recursive: true });

  const targets: Array<{
    hook: GitHookInstallResult["hook"];
    hookPath: string;
    template: string;
  }> = [
    {
      hook: "post-checkout",
      hookPath: path.join(hooksDir, "post-checkout"),
      template: POST_CHECKOUT_HOOK,
    },
    {
      hook: "post-merge",
      hookPath: path.join(hooksDir, "post-merge"),
      template: POST_MERGE_HOOK,
    },
    {
      hook: "post-rewrite",
      hookPath: path.join(hooksDir, "post-rewrite"),
      template: POST_REWRITE_HOOK,
    },
    {
      hook: "pre-commit",
      hookPath: path.join(hooksDir, "pre-commit"),
      template: PRE_COMMIT_HOOK,
    },
  ];

  const results: GitHookInstallResult[] = targets.map(
    ({ hook, hookPath, template }) => ({
      hook,
      result: installHook(hookPath, template.replace("#!/bin/sh\n", "")),
    }),
  );

  for (const { hook, result } of results) {
    if (result === "skipped-foreign") {
      console.log(
        `! ${hook}: existing non-Kibi hook left untouched; Kibi enforcement is NOT installed for this hook. To integrate: ${hookIntegrationRecipe(hook)}.`,
      );
    } else if (result === "skipped-symlink") {
      console.log(
        `! ${hook}: hook is a symlink; Kibi never edits symlink targets. Manage the target manually (${hookIntegrationRecipe(hook)}).`,
      );
    } else if (result === "skipped-unsupported") {
      console.log(
        `! ${hook}: hook path is not a regular file; left untouched.`,
      );
    }
  }
  const installedOrUpdated = results.filter(
    (entry) => entry.result === "installed" || entry.result === "updated",
  );
  if (installedOrUpdated.length > 0) {
    console.log(
      `✓ Installed/updated Kibi git hooks at ${hooksDir} (${installedOrUpdated.map((entry) => entry.hook).join(", ")})`,
    );
  } else {
    console.log(
      `! No Kibi git hooks installed at ${hooksDir} (all hooks were skipped).`,
    );
  }
  if (options.hooksPathOrigin) {
    console.log(
      `! core.hooksPath is configured (${options.hooksPathOrigin}); hooks were installed for THIS checkout at ${hooksDir}. Git resolves a relative hooks path separately under every worktree, so coverage of other worktrees is INCOMPLETE/UNVERIFIED: commit a versioned launcher that delegates to kibi, or run 'kibi init' in each checkout. Kibi will not change core.hooksPath.`,
    );
  }
  return results;
}
