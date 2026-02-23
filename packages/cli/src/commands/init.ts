import { existsSync } from "node:fs";
import * as path from "node:path";
import {
  copySchemaFiles,
  createConfigFile,
  createKbDirectoryStructure,
  getCurrentBranch,
  installGitHooks,
  updateGitIgnore,
} from "./init-helpers";

interface InitOptions {
  hooks?: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const kbDir = path.join(process.cwd(), ".kb");
  const kbExists = existsSync(kbDir);

  const currentBranch = await getCurrentBranch();

  try {
    if (!kbExists) {
      createKbDirectoryStructure(kbDir, currentBranch);
      createConfigFile(kbDir);
      updateGitIgnore(process.cwd());

      const cliSrcDir = path.resolve(__dirname, "..");
      const schemaSourceDir = path.resolve(cliSrcDir, "../../core/schema");

      await copySchemaFiles(kbDir, schemaSourceDir);
    } else {
      console.log("✓ .kb/ directory already exists, skipping creation");
    }

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

    process.exit(0);
  } catch (error) {
    console.error("Error during initialization:", error);
    process.exit(1);
  }
}
