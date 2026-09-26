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

import { existsSync, lstatSync, realpathSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyActivation } from "../operations/bootstrap/activation.js";
import { nodeFilesystem } from "../public/operations/node-ports.js";
import { resolveBranchAttachment } from "../utils/branch-resolver.js";
import {
  type GitRepositoryContext,
  resolveGitRepository,
} from "../utils/git-repository-context.js";
import { scaffoldGitHubIntegration } from "./github-init.js";
import {
  copySchemaFiles,
  createKbDirectoryStructure,
  createManifestFile,
  ensureSymbolsManifestFile,
  installGitHooks,
  updateGitIgnore,
} from "./init-helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * A hooks directory may be auto-managed only when Git resolves it inside this
 * repository: under the common Git directory (the default hooks location) or
 * under the current worktree root (repository-local relative core.hooksPath).
 * Anything else — global configs, other repositories, external directories —
 * must never receive auto-installed hooks.
 * implements REQ-git-hook-effective-install
 */
function isRepositoryManagedHooksDir(context: GitRepositoryContext): boolean {
  const realpathAllowMissingTail = (candidate: string): string | null => {
    let current = path.resolve(candidate);
    const missingSegments: string[] = [];

    while (true) {
      try {
        return path.resolve(realpathSync.native(current), ...missingSegments);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "ENOENT" && code !== "ENOTDIR") return null;

        // A dangling symlink cannot be canonicalized. Do not treat it as an
        // ordinary missing suffix: mkdir could follow it into an external
        // directory when Git's hooks path is created.
        try {
          if (lstatSync(current).isSymbolicLink()) return null;
        } catch (statError) {
          const statCode = (statError as NodeJS.ErrnoException).code;
          if (statCode !== "ENOENT" && statCode !== "ENOTDIR") return null;
        }

        const parent = path.dirname(current);
        if (parent === current) return null;
        missingSegments.unshift(path.basename(current));
        current = parent;
      }
    }
  };

  const isWithin = (candidate: string, root: string) => {
    const relative = path.relative(root, candidate);
    return (
      relative === "" ||
      (relative !== ".." &&
        !relative.startsWith(`..${path.sep}`) &&
        !path.isAbsolute(relative))
    );
  };

  const hooksDir = realpathAllowMissingTail(context.effectiveHooksDir);
  const commonGitDir = realpathAllowMissingTail(context.commonGitDir);
  const worktreeRoot = realpathAllowMissingTail(context.worktreeRoot);
  if (!hooksDir || !commonGitDir || !worktreeRoot) return false;

  // The default hooks dir in a linked worktree is shared under the common Git
  // directory, which can sit outside the current worktree root.
  return isWithin(hooksDir, commonGitDir) || isWithin(hooksDir, worktreeRoot);
}

interface InitOptions {
  hooks?: boolean;
  github?: boolean;
  badgeOnly?: boolean;
}

async function initNextAction(projectRoot: string): Promise<{
  readonly operation: string;
  readonly message: string;
}> {
  const sourceFiles = await nodeFilesystem.glob(
    [
      ".kb/requirements/**/*.md",
      ".kb/scenarios/**/*.md",
      ".kb/tests/**/*.md",
      ".kb/adrs/**/*.md",
      ".kb/adr/**/*.md",
      ".kb/flags/**/*.md",
      ".kb/events/**/*.md",
      ".kb/facts/**/*.md",
    ],
    { cwd: projectRoot },
  );
  const activation = await classifyActivation(
    {
      workspaceRoot: projectRoot,
      signal: new AbortController().signal,
      clock: () => new Date(),
      fs: nodeFilesystem,
    },
    sourceFiles,
  );
  switch (activation.activationState) {
    case "root_active_seeded":
      return {
        operation: "continue-kibi-workflow",
        message:
          "  Next: your repository already has seeded Kibi knowledge; continue working with your coding agent.",
      };
    case "root_partial":
      return {
        operation: "kibi doctor",
        message:
          "  Next: run 'kibi doctor' to repair degraded Kibi infrastructure before bootstrapping.",
      };
    default:
      return {
        operation: "kb_plan_bootstrap",
        message:
          "  Next: ask your coding agent “Bootstrap Kibi for this repository.”",
      };
  }
}

// implements REQ-cli-init
// implements REQ-kibi-github-report-integration
export async function initCommand(
  options: InitOptions,
): Promise<{ exitCode: number }> {
  if (options.badgeOnly === true && options.github !== true) {
    console.error(
      "Error: --badge-only requires --github. The recommended integration is `kibi init --github` (badge + full report).",
    );
    return { exitCode: 1 };
  }

  // Resolve the repository once and derive every project path from Git's own
  // answer, so init works from linked worktrees (.git is a file there) and
  // from subdirectories (cwd has no .kb or .git at all). Bare repositories
  // and unreadable contexts are refused before any workspace write.
  // implements REQ-git-hook-effective-install
  const resolution = resolveGitRepository(process.cwd());
  if (resolution.status === "unsupported") {
    console.error(`Error: ${resolution.reason}`);
    console.error(
      "Kibi requires a working-tree checkout; refusing to create workspace state.",
    );
    return { exitCode: 1 };
  }
  const repoContext = resolution.status === "ok" ? resolution.context : null;
  const projectRoot = repoContext?.worktreeRoot ?? process.cwd();
  const kbDir = path.join(projectRoot, ".kb");
  const kbExists = existsSync(kbDir);

  // Resolve the exact active Git branch against the project root (not cwd):
  // recovery journals, legacy stores, and identity manifests are read from
  // the same .kb tree init is about to write.
  // Standalone use must be explicit via KIBI_BRANCH; there is no implicit
  // default branch.
  let currentBranch: string;
  const result = resolveBranchAttachment(projectRoot);

  if ("error" in result) {
    const isNonGitError =
      result.code === "NOT_A_GIT_REPO" || result.code === "GIT_NOT_AVAILABLE";

    console.error("Error: Failed to resolve the active git branch.");
    console.error(
      isNonGitError
        ? `${result.error} Set KIBI_BRANCH explicitly for a standalone workspace.`
        : result.error,
    );
    return { exitCode: 1 };
  }
  if (result.migrationRequired) {
    console.error(
      `Error: KB is attached through legacy branch storage for '${result.gitBranch}'. Run 'kibi branch migrate --from ${result.kbBranch} --to ${result.gitBranch} --apply' first.`,
    );
    return { exitCode: 1 };
  }
  currentBranch = result.kbBranch;

  try {
    if (!kbExists) {
      createKbDirectoryStructure(kbDir, currentBranch);
      createManifestFile(kbDir);
      updateGitIgnore(projectRoot);

      const schemaSourceDir = path.resolve(__dirname, "..", "..", "schema");

      await copySchemaFiles(kbDir, schemaSourceDir);
    } else {
      console.log("✓ .kb/ directory already exists, skipping creation");
      // An orphan branch can legitimately remove tracked `.kb/manifest.json`
      // while the ignored branch stores remain on disk. Recreate the
      // lifecycle manifest so status/doctor stay coherent; entity paths are
      // canonical and require no per-repository configuration.
      if (!existsSync(path.join(kbDir, "manifest.json"))) {
        createManifestFile(kbDir);
      }
    }

    ensureSymbolsManifestFile(projectRoot);

    if (options.hooks) {
      if (!repoContext) {
        console.error("Warning: No git repository found, skipping hooks");
      } else if (!isRepositoryManagedHooksDir(repoContext)) {
        console.error(
          `Warning: core.hooksPath points outside this repository (${repoContext.effectiveHooksDir}); refusing to install hooks into unrelated directories. Kibi enforcement stays OFF for this repository until the hooks path is repository-managed.`,
        );
      } else {
        installGitHooks(repoContext.effectiveHooksDir, {
          hooksPathOrigin: repoContext.hooksPathOrigin,
        });
        if (repoContext.isLinkedWorktree && !repoContext.hooksPathConfig) {
          // Only the default common hooks directory is shared by Git across
          // worktrees; a configured hooksPath resolves per checkout.
          console.log(
            `✓ Repository-common hooks directory shared with all worktrees (${repoContext.effectiveHooksDir})`,
          );
        }
      }
    }

    console.log(
      "\n✓ Kibi initialized. Kibi infrastructure is ready for this repository.",
    );
    console.log("  No product knowledge was inferred or changed by kibi init.");
    if (kbExists) {
      console.log("  Existing Kibi source knowledge was preserved.");
    }
    console.log((await initNextAction(projectRoot)).message);
    console.log(
      "  Optional diagnostic: run 'kibi doctor' if setup appears degraded.",
    );

    if (options.github === true) {
      scaffoldGitHubIntegration({
        cwd: projectRoot,
        badgeOnly: options.badgeOnly === true,
      });
    }

    return { exitCode: 0 };
  } catch (error) {
    console.error("Error during initialization:", error);
    return { exitCode: 1 };
  }
}
