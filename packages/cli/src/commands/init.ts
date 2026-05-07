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
import { resolveActiveBranch } from "../utils/branch-resolver.js";
import {
  copySchemaFiles,
  createConfigFile,
  createKbDirectoryStructure,
  ensureSymbolsManifestFile,
  installGitHooks,
  updateGitIgnore,
} from "./init-helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface InitOptions {
  hooks?: boolean;
}

// implements REQ-003
export async function initCommand(
  options: InitOptions,
): Promise<{ exitCode: number }> {
  const kbDir = path.join(process.cwd(), ".kb");
  const kbExists = existsSync(kbDir);

  // Resolve branch: allow non-git repos to use default "main" for init
  let currentBranch: string;
  const result = resolveActiveBranch();

  if ("error" in result) {
    const isNonGitError =
      result.code === "NOT_A_GIT_REPO" || result.code === "GIT_NOT_AVAILABLE";

    if (isNonGitError) {
      // For init command, use "main" as default branch when not in a git repo.
      // This allows initialization before git init, which is useful for first-time setup.
      console.warn("Warning: Not in a git repository");
      console.warn(
        "Using 'main' as default branch. Run 'kibi sync' in a git repo for proper branch-aware behavior.",
      );
      currentBranch = "main";
    } else {
      console.error("Error: Failed to resolve the active git branch.");
      console.error(result.error);
      return { exitCode: 1 };
    }
  } else {
    currentBranch = result.branch;
  }

  try {
    if (!kbExists) {
      createKbDirectoryStructure(kbDir, currentBranch);
      createConfigFile(kbDir);
      updateGitIgnore(process.cwd());

      const schemaSourceDir = path.resolve(__dirname, "..", "..", "schema");

      await copySchemaFiles(kbDir, schemaSourceDir);
    } else {
      console.log("✓ .kb/ directory already exists, skipping creation");
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

    return { exitCode: 0 };
  } catch (error) {
    console.error("Error during initialization:", error);
    return { exitCode: 1 };
  }
}
