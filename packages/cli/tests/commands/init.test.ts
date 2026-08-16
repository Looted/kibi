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
import { branchStorePath } from "../../src/utils/branch-store-locator.js";
import { LATEST_KB_SCHEMA_VERSION } from "../../src/utils/schema-version.js";

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
    execSync("git init -b main", { cwd: tmpDir });
    // Create initial commit so branch exists (required per ADR-012)
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });

    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    expect(existsSync(path.join(tmpDir, ".kb"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/config.json"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/schema"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/branches"))).toBe(true);
    // The explicit test branch remains main.
    expect(existsSync(branchStorePath(tmpDir, "main"))).toBe(true);
  }, 30000);

  test("copies schema files to .kb/schema/", () => {
    execSync("git init -b main", { cwd: tmpDir });
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
    execSync("git init -b main", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const configPath = path.join(tmpDir, ".kb/config.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8"));

    expect(config.$schema).toBe(
      "https://raw.githubusercontent.com/Looted/kibi/master/packages/cli/schema/config.json",
    );
    expect(config.schemaVersion).toBe(LATEST_KB_SCHEMA_VERSION);
    expect(config.paths).toBeDefined();
    expect(config.paths.requirements).toBe("documentation/requirements");
    expect(config.paths.scenarios).toBe("documentation/scenarios");
    expect(config.paths.tests).toBe("documentation/tests");
    expect(config.paths.adr).toBe("documentation/adr");
    expect(config.paths.flags).toBe("documentation/flags");
    expect(config.paths.events).toBe("documentation/events");
    expect(config.paths.facts).toBe("documentation/facts");
    expect(config.paths.symbols).toBe("documentation/symbols.yaml");
  });

  test("creates documentation/symbols.yaml when it is missing", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const symbolsPath = path.join(tmpDir, "documentation", "symbols.yaml");
    expect(existsSync(symbolsPath)).toBe(true);
    const content = readFileSync(symbolsPath, "utf-8");
    expect(content).toContain("# symbols.yaml");
    expect(content).toContain("symbols: []");
  });

  test("adds only .kb to .gitignore", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });

    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const gitignorePath = path.join(tmpDir, ".gitignore");
    const content = readFileSync(gitignorePath, "utf-8");

    expect(content).toContain(".kb/");
    expect(content).not.toContain(".kb/briefs/");
  }, 30000);

  test("creates config.json with all check rules explicitly set to true", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const configPath = path.join(tmpDir, ".kb/config.json");
    const config = JSON.parse(readFileSync(configPath, "utf-8"));

    expect(config.checks).toBeDefined();
    expect(config.checks.rules).toBeDefined();
    expect(config.checks.rules["must-priority-coverage"]).toBe(true);
    expect(config.checks.rules["symbol-coverage"]).toBe(true);
    expect(config.checks.rules["symbol-traceability"]).toBe(true);
    expect(config.checks.rules["no-dangling-refs"]).toBe(true);
    expect(config.checks.rules["no-cycles"]).toBe(true);
    expect(config.checks.rules["required-fields"]).toBe(true);
    expect(config.checks.rules["deprecated-adr-no-successor"]).toBe(true);
    expect(config.checks.rules["domain-contradictions"]).toBe(true);
    expect(config.checks.rules["strict-fact-shape"]).toBe(false); // disabled by default
    expect(config.checks.rules["strict-req-fact-pairing"]).toBe(false); // disabled by default
    expect(config.checks.rules["strict-readiness"]).toBe(false); // disabled by default
    expect(config.checks.symbolTraceability).toBeDefined();
    expect(config.checks.symbolTraceability.requireAdr).toBe(false);
  });

  test("does not fail if .kb already exists", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
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
    execSync("git init -b main", { cwd: tmpDir });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
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
    execSync("git init -b main", { cwd: tmpDir });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
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
    execSync("git init -b main", { cwd: tmpDir });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
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
    expect(content).toContain("documentation/symbols.yaml");
    expect(content).toContain("kibi sync --refresh-symbol-coordinates");
  });

  test("exits with code 0 on success", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });

    const result = execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    expect(result).toBeDefined();
  });

  test("allows init in a non-git directory with an explicit branch", () => {
    execSync(`bun ${kibiBin} init --no-hooks`, {
      cwd: tmpDir,
      env: { ...process.env, KIBI_BRANCH: "trunk" },
      stdio: "pipe",
    });

    expect(existsSync(path.join(tmpDir, ".kb"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/config.json"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/schema"))).toBe(true);
    expect(existsSync(branchStorePath(tmpDir, "trunk"))).toBe(true);
  });

  test("prints helpful message if .kb/ already exists", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
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
