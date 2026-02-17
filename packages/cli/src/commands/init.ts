import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";

interface InitOptions {
  hooks?: boolean;
}

const POST_CHECKOUT_HOOK = `#!/bin/sh
# Kibi git hook: sync KB on branch checkout
kibi sync
`;

const POST_MERGE_HOOK = `#!/bin/sh
# Kibi git hook: sync KB after merge
kibi sync
`;

const DEFAULT_CONFIG = {
  paths: {
    requirements: "requirements/**/*.md",
    scenarios: "scenarios/**/*.md",
    tests: "tests/**/*.md",
    adr: "adr/**/*.md",
    flags: "flags/**/*.md",
    events: "events/**/*.md",
    symbols: "symbols.yaml",
  },
};

export async function initCommand(options: InitOptions): Promise<void> {
  const kbDir = path.join(process.cwd(), ".kb");

  if (existsSync(kbDir)) {
    console.error("Error: .kb/ directory already exists");
    console.error("If you want to reinitialize, remove .kb/ first");
    process.exit(1);
  }

  try {
    mkdirSync(kbDir, { recursive: true });
    mkdirSync(path.join(kbDir, "schema"), { recursive: true });
    mkdirSync(path.join(kbDir, "branches", "main"), { recursive: true });

    writeFileSync(
      path.join(kbDir, "config.json"),
      JSON.stringify(DEFAULT_CONFIG, null, 2),
    );

    const cliSrcDir = path.resolve(__dirname, "..");
    const schemaSourceDir = path.resolve(cliSrcDir, "../../core/schema");
    const schemaFiles = await fg("*.pl", {
      cwd: schemaSourceDir,
      absolute: false,
    });

    for (const file of schemaFiles) {
      const sourcePath = path.join(schemaSourceDir, file);
      const destPath = path.join(kbDir, "schema", file);
      copyFileSync(sourcePath, destPath);
    }

    console.log("✓ Created .kb/ directory structure");
    console.log("✓ Created config.json with default paths");
    console.log(`✓ Copied ${schemaFiles.length} schema files`);
    console.log("✓ Created branches/main/ directory");

    if (options.hooks) {
      const gitDir = path.join(process.cwd(), ".git");
      if (!existsSync(gitDir)) {
        console.error("Warning: No git repository found, skipping hooks");
      } else {
        const hooksDir = path.join(gitDir, "hooks");
        mkdirSync(hooksDir, { recursive: true });

        const postCheckoutPath = path.join(hooksDir, "post-checkout");
        const postMergePath = path.join(hooksDir, "post-merge");

        writeFileSync(postCheckoutPath, POST_CHECKOUT_HOOK, { mode: 0o755 });
        writeFileSync(postMergePath, POST_MERGE_HOOK, { mode: 0o755 });

        console.log("✓ Installed git hooks (post-checkout, post-merge)");
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
