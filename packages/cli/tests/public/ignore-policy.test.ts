import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { createRepoIgnorePolicy } from "../../src/public/ignore-policy.js";

describe("createRepoIgnorePolicy", () => {
  function createTempWorkspace(): string {
    const dir = mkdtempSync(path.join(tmpdir(), "ignore-policy-test-"));
    return dir;
  }

  function withTempWorkspace(run: (dir: string) => void): void {
    const dir = createTempWorkspace();
    try {
      run(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  test("hard denylist ignores .sisyphus/drafts", () => {
    const dir = createTempWorkspace();
    const policy = createRepoIgnorePolicy(dir);
    expect(policy.isIgnored(".sisyphus/drafts/foo.md")).toBe(true);
    expect(policy.explain(".sisyphus/drafts/foo.md")).toEqual({
      ignored: true,
      reason: "hard_deny",
    });
  });

  test("hard denylist ignores .opencode files", () => {
    const dir = createTempWorkspace();
    const policy = createRepoIgnorePolicy(dir);
    expect(policy.isIgnored(".opencode/plans/bar.md")).toBe(true);
  });

  test("hard denylist ignores derived .kb runtime trees but not authored lanes", () => {
    withTempWorkspace((dir) => {
      const policy = createRepoIgnorePolicy(dir);
      expect(policy.isIgnored(".kb/branches/main/entities.json")).toBe(true);
      expect(policy.isIgnored(".kb/recovery/pending.json")).toBe(true);
      expect(policy.isIgnored(".kb/proof/runs/snapshot.json")).toBe(true);
      expect(policy.isIgnored(".kb/briefs/note.md")).toBe(true);
      expect(policy.isIgnored(".kb/migrations/001.json")).toBe(true);
      expect(policy.isIgnored(".kb/requirements/REQ-001.md")).toBe(false);
      expect(policy.isIgnored(".kb/proof/integrations.json")).toBe(false);
      expect(policy.isIgnored(".kb/symbols.yaml")).toBe(false);
    });
  });

  test("root .gitignore is honored", () => {
    const dir = createTempWorkspace();
    writeFileSync(path.join(dir, ".gitignore"), "*.log\n");
    const policy = createRepoIgnorePolicy(dir);
    expect(policy.isIgnored("debug.log")).toBe(true);
    expect(policy.explain("debug.log")).toEqual({
      ignored: true,
      reason: "gitignored",
    });
  });

  test("nested .gitignore applies relative to its directory", () => {
    const dir = createTempWorkspace();
    mkdirSync(path.join(dir, "docs"), { recursive: true });
    writeFileSync(path.join(dir, "docs", ".gitignore"), "private.md\n");
    const policy = createRepoIgnorePolicy(dir);
    expect(policy.isIgnored("docs/private.md")).toBe(true);
    expect(policy.isIgnored("other/private.md")).toBe(false);
  });

  test(".git/info/exclude is honored", () => {
    const dir = createTempWorkspace();
    mkdirSync(path.join(dir, ".git", "info"), { recursive: true });
    writeFileSync(path.join(dir, ".git", "info", "exclude"), "secret.txt\n");
    const policy = createRepoIgnorePolicy(dir);
    expect(policy.isIgnored("secret.txt")).toBe(true);
    expect(policy.explain("secret.txt")).toEqual({
      ignored: true,
      reason: "git_info_exclude",
    });
  });

  test(".gitignore negation can re-include normal files", () => {
    const dir = createTempWorkspace();
    writeFileSync(path.join(dir, ".gitignore"), "*.md\n!important.md\n");
    const policy = createRepoIgnorePolicy(dir);
    expect(policy.isIgnored("other.md")).toBe(true);
    expect(policy.isIgnored("important.md")).toBe(false);
  });

  test("negation cannot override hard denylist", () => {
    const dir = createTempWorkspace();
    writeFileSync(path.join(dir, ".gitignore"), "!.sisyphus/drafts/foo.md\n");
    const policy = createRepoIgnorePolicy(dir);
    expect(policy.isIgnored(".sisyphus/drafts/foo.md")).toBe(true);
  });

  test("paths outside workspace are ignored", () => {
    const dir = createTempWorkspace();
    const policy = createRepoIgnorePolicy(dir);
    expect(policy.isIgnored("/etc/passwd")).toBe(true);
    expect(policy.explain("/etc/passwd")).toEqual({
      ignored: true,
      reason: "outside_workspace",
    });
  });

  test("getFastGlobIgnoreGlobs returns globs for hard denylist", () => {
    const dir = createTempWorkspace();
    const policy = createRepoIgnorePolicy(dir);
    const globs = policy.getFastGlobIgnoreGlobs();
    expect(globs.some((g) => g.includes(".sisyphus"))).toBe(true);
    expect(globs.some((g) => g.includes(".kb"))).toBe(true);
  });

  test("getFastGlobIgnoreGlobs includes rooted, nested, slash, and exclude patterns", () => {
    withTempWorkspace((dir) => {
      mkdirSync(path.join(dir, ".git", "info"), { recursive: true });
      mkdirSync(path.join(dir, "docs", "private"), { recursive: true });
      writeFileSync(
        path.join(dir, ".gitignore"),
        ["/dist/output.txt", "*.log", "!keep.log", ""].join("\n"),
      );
      writeFileSync(
        path.join(dir, ".git", "info", "exclude"),
        ["cache/tmp.txt", "*.secret", ""].join("\n"),
      );
      writeFileSync(
        path.join(dir, "docs", "private", ".gitignore"),
        ["/drafts/*.md", "*.tmp", "!allowed.tmp", ""].join("\n"),
      );

      const globs = createRepoIgnorePolicy(dir).getFastGlobIgnoreGlobs();

      expect(globs).toContain("**/dist/output.txt");
      expect(globs).toContain("**/*.log");
      expect(globs).toContain("**/cache/tmp.txt");
      expect(globs).toContain("**/*.secret");
      expect(globs).toContain("**/docs/private/drafts/*.md");
      expect(globs).toContain("**/docs/private/*.tmp");
      expect(globs).not.toContain("**/keep.log");
      expect(globs).not.toContain("**/docs/private/allowed.tmp");
    });
  });

  test("returns not ignored for the workspace root and unreadable ignore files", () => {
    withTempWorkspace((dir) => {
      mkdirSync(path.join(dir, ".gitignore"));
      const policy = createRepoIgnorePolicy(dir);

      expect(policy.explain(dir)).toEqual({ ignored: false });
    });
  });

  test("returns not ignored when the workspace cannot be scanned", () => {
    const dir = path.join(tmpdir(), "kibi-ignore-policy-missing-root");
    const policy = createRepoIgnorePolicy(dir);

    expect(policy.explain("src/index.ts")).toEqual({ ignored: false });
  });
});
