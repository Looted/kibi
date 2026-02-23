import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

describe("kibi init", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-init-"));
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("creates .kb directory structure", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    expect(existsSync(path.join(tmpDir, ".kb"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/config.json"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/schema"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/branches"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/branches/develop"))).toBe(true);
  }, 30000);

  test("copies schema files to .kb/schema/", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    expect(existsSync(path.join(tmpDir, ".kb/schema/entities.pl"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/schema/relationships.pl"))).toBe(
      true,
    );
    expect(existsSync(path.join(tmpDir, ".kb/schema/validation.pl"))).toBe(
      true,
    );
  }, 30000);

  test("creates valid config.json with default paths", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const configPath = path.join(tmpDir, ".kb/config.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8"));

    expect(config.paths).toBeDefined();
    expect(config.paths.requirements).toBe("requirements");
    expect(config.paths.scenarios).toBe("scenarios");
    expect(config.paths.tests).toBe("tests");
    expect(config.paths.adr).toBe("adr");
    expect(config.paths.flags).toBe("flags");
    expect(config.paths.events).toBe("events");
    expect(config.paths.facts).toBe("facts");
    expect(config.paths.symbols).toBe("symbols.yaml");
  });

  test("does not fail if .kb already exists", () => {
    mkdirSync(path.join(tmpDir, ".kb"));

    const out = execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    // init is idempotent and prints a skipping message when .kb exists
    expect(out.toLowerCase()).toContain("already exists, skipping");
  });

  test("installs git hooks by default", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const postCheckout = path.join(tmpDir, ".git/hooks/post-checkout");
    const postMerge = path.join(tmpDir, ".git/hooks/post-merge");

    expect(existsSync(postCheckout)).toBe(true);
    expect(existsSync(postMerge)).toBe(true);

    // Check executable bit
    const checkoutStats = statSync(postCheckout);
    const mergeStats = statSync(postMerge);
    expect(checkoutStats.mode & 0o111).not.toBe(0);
    expect(mergeStats.mode & 0o111).not.toBe(0);
  });

  test("does not install hooks when --no-hooks is used", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const postCheckout = path.join(tmpDir, ".git/hooks/post-checkout");
    const postMerge = path.join(tmpDir, ".git/hooks/post-merge");
    const preCommit = path.join(tmpDir, ".git/hooks/pre-commit");

    expect(existsSync(postCheckout)).toBe(false);
    expect(existsSync(postMerge)).toBe(false);
    expect(existsSync(preCommit)).toBe(false);
  });

  test("installs pre-commit hook by default", () => {
    execSync("git init", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const preCommit = path.join(tmpDir, ".git/hooks/pre-commit");

    expect(existsSync(preCommit)).toBe(true);

    const preCommitStats = statSync(preCommit);
    expect(preCommitStats.mode & 0o111).not.toBe(0);

    const content = readFileSync(preCommit, "utf8");
    expect(content).toContain("kibi check");
  });

  test("exits with code 0 on success", () => {
    execSync("git init", { cwd: tmpDir });

    const result = execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    expect(result).toBeDefined();
  });

  test("prints helpful message if .kb/ already exists", () => {
    mkdirSync(path.join(tmpDir, ".kb"));

    const out = execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    // init is idempotent and prints a skipping message when .kb exists
    expect(out.toLowerCase()).toContain("already exists, skipping");
  });
});
