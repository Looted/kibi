import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import fg from "fast-glob";

const POST_CHECKOUT_HOOK = `#!/bin/sh
kibi sync
`;

const POST_MERGE_HOOK = `#!/bin/sh
kibi sync
`;

const PRE_COMMIT_HOOK = `#!/bin/sh
set -e
kibi check
`;

const DEFAULT_CONFIG = {
  paths: {
    requirements: "requirements",
    scenarios: "scenarios",
    tests: "tests",
    adr: "adr",
    flags: "flags",
    events: "events",
    facts: "facts",
    symbols: "symbols.yaml",
  },
};

export async function getCurrentBranch(
  cwd: string = process.cwd(),
): Promise<string> {
  let currentBranch = "develop";
  try {
    const { execSync } = await import("node:child_process");
    const branch = execSync("git branch --show-current", {
      cwd,
      encoding: "utf8",
    }).trim();
    if (branch && branch !== "master") {
      currentBranch = branch;
    }
  } catch {
    currentBranch = "develop";
  }
  return currentBranch;
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
}

export function installGitHooks(gitDir: string): void {
  const hooksDir = path.join(gitDir, "hooks");
  mkdirSync(hooksDir, { recursive: true });

  const postCheckoutPath = path.join(hooksDir, "post-checkout");
  const postMergePath = path.join(hooksDir, "post-merge");
  const preCommitPath = path.join(hooksDir, "pre-commit");

  installHook(postCheckoutPath, POST_CHECKOUT_HOOK.replace("#!/bin/sh\n", ""));
  installHook(postMergePath, POST_MERGE_HOOK.replace("#!/bin/sh\n", ""));
  installHook(preCommitPath, PRE_COMMIT_HOOK.replace("#!/bin/sh\n", ""));

  console.log("✓ Installed git hooks (pre-commit, post-checkout, post-merge)");
}
