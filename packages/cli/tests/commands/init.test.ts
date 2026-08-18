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
    expect(existsSync(path.join(tmpDir, ".kb/manifest.json"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/config.json"))).toBe(false);
    expect(existsSync(path.join(tmpDir, ".kb/schema"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/requirements"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/scenarios"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/tests"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/facts"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/adr"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/flags"))).toBe(true);
    expect(existsSync(path.join(tmpDir, ".kb/events"))).toBe(true);
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

  test("creates a Kibi-owned lifecycle manifest without path or check policy", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const manifestPath = path.join(tmpDir, ".kb/manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

    expect(manifest.manifestVersion).toBe(1);
    expect(manifest.schemaVersion).toBe(LATEST_KB_SCHEMA_VERSION);
    expect(manifest.semanticAdvisorBackfill).toBe("not_applicable");
    expect(manifest.paths).toBeUndefined();
    expect(manifest.checks).toBeUndefined();
  });

  test("creates .kb/symbols.yaml when it is missing", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    const symbolsPath = path.join(tmpDir, ".kb", "symbols.yaml");
    expect(existsSync(symbolsPath)).toBe(true);
    const content = readFileSync(symbolsPath, "utf-8");
    expect(content).toContain("# symbols.yaml");
    expect(content).toContain("symbols: []");
  });

  test("ignores derived .kb/ state while keeping knowledge tracked", () => {
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

    expect(content).toContain(".kb/branches/");
    expect(content).toContain(".kb/recovery/");
    expect(content).toContain(".kb/verification/");
    expect(content).toContain(".kb/briefs/");
    expect(content).toContain(".kb/migrations/");
    expect(content).toContain(".kb/usage.log");
    expect(content).not.toMatch(/^\.kb\/$/m);
  }, 30000);

  test("does not scaffold a user-editable check policy", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "inherit",
    });

    expect(existsSync(path.join(tmpDir, ".kb/config.json"))).toBe(false);
    const manifest = JSON.parse(
      readFileSync(path.join(tmpDir, ".kb/manifest.json"), "utf-8"),
    );
    expect(manifest.checks).toBeUndefined();
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
    expect(content).toContain(".kb/symbols.yaml");
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
    expect(existsSync(path.join(tmpDir, ".kb/manifest.json"))).toBe(true);
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

  test("init --help documents --github and --badge-only", () => {
    const help = execSync(`bun ${kibiBin} init --help`, {
      cwd: tmpDir,
      encoding: "utf8",
    });
    expect(help).toContain("--github");
    expect(help).toContain("--badge-only");
  });

  test("rejects --badge-only without --github", () => {
    let caught: { status?: number | null; stderr?: string } | undefined;
    try {
      execSync(`bun ${kibiBin} init --badge-only`, {
        cwd: tmpDir,
        encoding: "utf8",
        stdio: "pipe",
      });
    } catch (error) {
      caught = error as { status?: number | null; stderr?: string };
    }
    expect(caught).toBeDefined();
    expect(caught?.status).toBe(1);
    expect(caught?.stderr ?? "").toContain("--badge-only requires --github");
  });

  test("init --github scaffolds the documented report workflow", () => {
    execSync("git init -b main", { cwd: tmpDir });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
    execSync("git remote add origin https://github.com/Acme/Widgets.git", {
      cwd: tmpDir,
    });
    writeFileSync(path.join(tmpDir, "README.md"), "# Widgets\n");

    const out = execSync(`bun ${kibiBin} init --github --no-hooks`, {
      cwd: tmpDir,
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(out).toContain("Added .github/workflows/kibi-report.yml");
    expect(out).toContain(
      "GitHub → Settings → Pages → Source → GitHub Actions",
    );
    const workflow = readFileSync(
      path.join(tmpDir, ".github/workflows/kibi-report.yml"),
      "utf8",
    );
    expect(workflow).toContain("kibi report --output kibi-report");
    expect(workflow).toContain("KIBI_BRANCH: ${{ github.head_ref || github.ref_name }}");
    expect(workflow).toContain("pull_request:");
    expect(workflow).not.toContain("pull_request_target");
    expect(workflow).toContain("name: kibi-pr-report");
    const readme = readFileSync(path.join(tmpDir, "README.md"), "utf8");
    expect(readme).toContain(
      "[![Kibi requirement health](https://acme.github.io/widgets/kibi-report/badge.svg)](https://acme.github.io/widgets/kibi-report/)",
    );
    expect(readFileSync(path.join(tmpDir, ".gitignore"), "utf8")).toContain(
      "kibi-report/",
    );
  }, 30000);
});
