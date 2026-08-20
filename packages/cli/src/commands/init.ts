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

import { existsSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveBranchAttachment } from "../utils/branch-resolver.js";
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

interface InitOptions {
  hooks?: boolean;
  github?: boolean;
  badgeOnly?: boolean;
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

  const kbDir = path.join(process.cwd(), ".kb");
  const kbExists = existsSync(kbDir);

  // Resolve the exact active Git branch. Standalone use must be explicit via
  // KIBI_BRANCH; there is no implicit default branch.
  let currentBranch: string;
  const result = resolveBranchAttachment();

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
      updateGitIgnore(process.cwd());

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

    ensureSymbolsManifestFile(process.cwd());

    if (options.hooks) {
      const gitDir = path.join(process.cwd(), ".git");
      if (!existsSync(gitDir)) {
        console.error("Warning: No git repository found, skipping hooks");
      } else {
        installGitHooks(gitDir);
      }
    }

    console.log("\nKibi initialized successfully!");
    console.log("Next steps:");
    console.log("  1. Run 'kibi doctor' to verify setup");
    console.log("  2. Run 'kibi sync' to extract entities from documents");

    if (options.github === true) {
      scaffoldGitHubIntegration({
        cwd: process.cwd(),
        badgeOnly: options.badgeOnly === true,
      });
    }

    return { exitCode: 0 };
  } catch (error) {
    console.error("Error during initialization:", error);
    return { exitCode: 1 };
  }
}
