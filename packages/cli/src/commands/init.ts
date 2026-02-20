import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";

interface InitOptions {
  hooks?: boolean;
}

const POST_CHECKOUT_HOOK = `#!/bin/sh
bun __KIBI_BIN__ sync
`;

const POST_MERGE_HOOK = `#!/bin/sh
bun __KIBI_BIN__ sync
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
  const kbExists = existsSync(kbDir);

  let currentBranch = "main";
  try {
    const { execSync } = await import("node:child_process");
    const branch = execSync("git branch --show-current", {
      cwd: process.cwd(),
      encoding: "utf8",
    }).trim();
    if (branch && branch !== "master") {
      currentBranch = branch;
    }
  } catch {
    currentBranch = "main";
  }

  try {
    if (!kbExists) {
      mkdirSync(kbDir, { recursive: true });
      mkdirSync(path.join(kbDir, "schema"), { recursive: true });
      mkdirSync(path.join(kbDir, "branches", currentBranch), {
        recursive: true,
      });

      writeFileSync(
        path.join(kbDir, "config.json"),
        JSON.stringify(DEFAULT_CONFIG, null, 2),
      );

      const gitignorePath = path.join(process.cwd(), ".gitignore");
      const gitignoreContent = existsSync(gitignorePath)
        ? readFileSync(gitignorePath, "utf8")
        : "";

      if (!gitignoreContent.includes(".kb/")) {
        const newContent = gitignoreContent
          ? `${gitignoreContent.trimEnd()}
.kb/
`
          : ".kb/
";
        writeFileSync(gitignorePath, newContent);
        console.log("✓ Added .kb/ to .gitignore");
      }

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
      console.log(`✓ Created branches/${currentBranch}/ directory`);
    } else {
      console.log("✓ .kb/ directory already exists, skipping creation");
    }

    if (options.hooks) {
      const gitDir = path.join(process.cwd(), ".git");
      if (!existsSync(gitDir)) {
        console.error("Warning: No git repository found, skipping hooks");
      } else {
        const hooksDir = path.join(gitDir, "hooks");
        mkdirSync(hooksDir, { recursive: true });

        const postCheckoutPath = path.join(hooksDir, "post-checkout");
        const postMergePath = path.join(hooksDir, "post-merge");

        const binPath = path.resolve(__dirname, "../../bin/kibi");

        const checkoutHookContent = POST_CHECKOUT_HOOK.replace(
          "__KIBI_BIN__",
          binPath,
        );
        const mergeHookContent = POST_MERGE_HOOK.replace(
          "__KIBI_BIN__",
          binPath,
        );

        const installHook = (hookPath: string, content: string) => {
          if (existsSync(hookPath)) {
            const existing = readFileSync(hookPath, "utf8");
            if (!existing.includes(`bun ${binPath}`)) {
              writeFileSync(hookPath, `${existing}
${content}`, {
                mode: 0o755,
              });
            }
          } else {
            writeFileSync(hookPath, `#!/bin/sh
${content}`, { mode: 0o755 });
          }
        };

        installHook(
          postCheckoutPath,
          checkoutHookContent.replace("#!/bin/sh
", ""),
        );
        installHook(postMergePath, mergeHookContent.replace("#!/bin/sh
", ""));

        console.log("✓ Installed git hooks (post-checkout, post-merge)");
      }
    }

    console.log("
Kibi initialized successfully!");
    console.log("Next steps:");
    console.log("  1. Run 'kibi doctor' to verify setup");
    console.log("  2. Run 'kibi sync' to extract entities from documents");

    process.exit(0);
  } catch (error) {
    console.error("Error during initialization:", error);
    process.exit(1);
  }
}
