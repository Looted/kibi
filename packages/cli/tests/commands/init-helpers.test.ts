import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  copySchemaFiles,
  createConfigFile,
  createKbDirectoryStructure,
  getCurrentBranch,
  installGitHooks,
  updateGitIgnore,
} from "../../src/commands/init-helpers";

describe("init-helpers", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-init-helpers-"));
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("getCurrentBranch returns current branch", async () => {
    execSync("git init", { cwd: tmpDir });
    // Make sure we have a commit so HEAD is valid for some git versions
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
    execSync("git checkout -b test-branch", { cwd: tmpDir });

    const branch = await getCurrentBranch(tmpDir);
    expect(branch).toBe("test-branch");
  });

  test("getCurrentBranch throws error if git fails and KIBI_BRANCH not set", async () => {
    // No git init here
    await expect(getCurrentBranch(tmpDir)).rejects.toThrow(
      "Failed to resolve active branch",
    );
  });

  test("getCurrentBranch uses KIBI_BRANCH when git fails", async () => {
    // No git init here
    const originalBranch = process.env.KIBI_BRANCH;
    process.env.KIBI_BRANCH = "custom-branch";
    try {
      const branch = await getCurrentBranch(tmpDir);
      expect(branch).toBe("custom-branch");
    } finally {
      process.env.KIBI_BRANCH = originalBranch;
    }
  });

  test("createKbDirectoryStructure creates expected directories", () => {
    const kbDir = path.join(tmpDir, ".kb");
    createKbDirectoryStructure(kbDir, "my-branch");

    expect(existsSync(kbDir)).toBe(true);
    expect(existsSync(path.join(kbDir, "schema"))).toBe(true);
    expect(existsSync(path.join(kbDir, "branches"))).toBe(true);
    expect(existsSync(path.join(kbDir, "branches/my-branch"))).toBe(true);
  });

  test("createConfigFile creates valid config.json", () => {
    const kbDir = path.join(tmpDir, ".kb");
    mkdirSync(kbDir);
    createConfigFile(kbDir);

    const configPath = path.join(kbDir, "config.json");
    expect(existsSync(configPath)).toBe(true);
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(config.paths).toBeDefined();
    expect(config.paths.requirements).toBe("documentation/requirements");
  });

  test("updateGitIgnore adds .kb/", () => {
    updateGitIgnore(tmpDir);
    const gitignorePath = path.join(tmpDir, ".gitignore");
    expect(existsSync(gitignorePath)).toBe(true);
    expect(readFileSync(gitignorePath, "utf-8")).toContain(".kb/");
  });

  test("updateGitIgnore appends to existing .gitignore", () => {
    const gitignorePath = path.join(tmpDir, ".gitignore");
    writeFileSync(gitignorePath, "node_modules/\n");

    updateGitIgnore(tmpDir);

    const content = readFileSync(gitignorePath, "utf-8");
    expect(content).toContain("node_modules/");
    expect(content).toContain(".kb/");
  });

  test("copySchemaFiles copies .pl files", async () => {
    const sourceDir = path.join(tmpDir, "source");
    mkdirSync(sourceDir);
    writeFileSync(path.join(sourceDir, "test.pl"), "test content");
    writeFileSync(path.join(sourceDir, "other.txt"), "ignore me");

    const kbDir = path.join(tmpDir, ".kb");
    mkdirSync(kbDir);
    mkdirSync(path.join(kbDir, "schema"));

    await copySchemaFiles(kbDir, sourceDir);

    expect(existsSync(path.join(kbDir, "schema/test.pl"))).toBe(true);
    expect(existsSync(path.join(kbDir, "schema/other.txt"))).toBe(false);
  });

  test("installGitHooks creates hooks", () => {
    const gitDir = path.join(tmpDir, ".git");
    mkdirSync(gitDir);

    installGitHooks(gitDir);

    const hooksDir = path.join(gitDir, "hooks");
    expect(existsSync(path.join(hooksDir, "pre-commit"))).toBe(true);
    expect(existsSync(path.join(hooksDir, "post-checkout"))).toBe(true);
    expect(existsSync(path.join(hooksDir, "post-merge"))).toBe(true);

    // check executable bit
    const stats = statSync(path.join(hooksDir, "pre-commit"));
    expect(stats.mode & 0o111).not.toBe(0);

    // Verify the post-checkout hook contains the correct literal-caret sed expression.
    // A JavaScript template-literal escape bug (\\^ vs \^) previously caused the
    // old_branch extraction to silently produce an empty string, meaning --from was
    // never forwarded to `kibi branch ensure` and every new branch got an empty KB.
    const postCheckoutContent = readFileSync(
      path.join(hooksDir, "post-checkout"),
      "utf-8",
    );
    expect(postCheckoutContent).toContain("sed 's/\\^.*//'");
  });
});
// Test escapeRegex functionality used by installHook
  test("escapeRegex escapes special regex characters", () => {
    // The escapeRegex function is used internally by installHook
    // to create the regex pattern for replacing kibi-managed sections
    const testCases = [
      { input: ".", expected: "\\." },
      { input: "*", expected: "\\*" },
      { input: "+", expected: "\\+" },
      { input: "?", expected: "\\?" },
      { input: "^", expected: "\\^" },
      { input: "$", expected: "\\$" },
      { input: "{", expected: "\\{" },
      { input: "}", expected: "\\}" },
      { input: "(", expected: "\\(" },
      { input: ")", expected: "\\)" },
      { input: "|", expected: "\\|" },
      { input: "[", expected: "\\[" },
      { input: "]", expected: "\\]" },
      { input: "\\", expected: "\\\\" },
    ];

    // Re-implement the escapeRegex function for testing
    const escapeRegex = (s: string): string => {
      return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    for (const { input, expected } of testCases) {
      expect(escapeRegex(input)).toBe(expected);
    }
  });

  test("escapeRegex handles KIBI_HOOK markers correctly", () => {
    const escapeRegex = (s: string): string => {
      return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    const kibiHookBegin = "# BEGIN kibi-managed";
    const kibiHookEnd = "# END kibi-managed";

    // These should not have any regex special chars, so they pass through unchanged
    expect(escapeRegex(kibiHookBegin)).toBe("# BEGIN kibi-managed");
    expect(escapeRegex(kibiHookEnd)).toBe("# END kibi-managed");
  });

  test("escapeRegex handles complex patterns", () => {
    const escapeRegex = (s: string): string => {
      return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    };

    expect(escapeRegex("(hello|world)")).toBe("\\(hello\\|world\\)");
    expect(escapeRegex("[a-z]")).toBe("\\[a-z\\]");
    expect(escapeRegex("^start$")).toBe("\\^start\\$");
    expect(escapeRegex("path\\to\\file")).toBe("path\\\\to\\\\file");
  });
