// implements REQ-014
import { describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRepoIgnorePolicy } from "../../src/public/ignore-policy.js";

describe("ignore-policy leftover walk and glob branches", () => {
  test("walks nested gitignores, denylists, and unreadable dirs", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "kibi-ignore-cov-"));
    try {
      mkdirSync(path.join(dir, "node_modules", "pkg"), { recursive: true });
      mkdirSync(path.join(dir, "vendor"), { recursive: true });
      mkdirSync(path.join(dir, "third_party"), { recursive: true });
      mkdirSync(path.join(dir, ".kb", "branches"), { recursive: true });
      mkdirSync(path.join(dir, "docs", "nested"), { recursive: true });
      mkdirSync(path.join(dir, ".git", "info"), { recursive: true });
      writeFileSync(path.join(dir, "node_modules", "pkg", ".gitignore"), "x");
      writeFileSync(
        path.join(dir, ".gitignore"),
        ["# comment", "/build/out.txt", "tmp", "!keep.tmp", ""].join("\n"),
      );
      writeFileSync(
        path.join(dir, ".git", "info", "exclude"),
        ["# note", "/hidden/secret.txt", "local", ""].join("\n"),
      );
      writeFileSync(
        path.join(dir, "docs", ".gitignore"),
        ["# nested", "/drafts.md", "scratch", "!keep.md", ""].join("\n"),
      );
      writeFileSync(path.join(dir, "docs", "nested", "keep.md"), "ok");
      const locked = path.join(dir, "locked");
      mkdirSync(locked);
      writeFileSync(path.join(locked, ".gitignore"), "x");
      try {
        chmodSync(locked, 0o000);
      } catch {
        // some hosts ignore chmod
      }

      const policy = createRepoIgnorePolicy(dir);
      expect(policy.isIgnored("node_modules/pkg/index.js")).toBe(true);
      expect(policy.isIgnored("vendor/lib.js")).toBe(true);
      expect(policy.isIgnored("third_party/x")).toBe(true);
      expect(policy.isIgnored(".kb/branches/main/x")).toBe(true);
      expect(policy.explain("docs/drafts.md").ignored).toBe(true);
      expect(policy.explain("docs/scratch").ignored).toBe(true);
      expect(policy.explain("build/out.txt").ignored).toBe(true);
      expect(policy.explain("hidden/secret.txt").ignored).toBe(true);
      expect(policy.explain("docs")).toEqual({ ignored: false });
      expect(policy.isIgnored(path.join(dir, "docs", "nested", "keep.md"))).toBe(
        false,
      );
      const globs = policy.getFastGlobIgnoreGlobs();
      expect(globs).toContain("**/build/out.txt");
      expect(globs).toContain("**/tmp");
      expect(globs).toContain("**/hidden/secret.txt");
      expect(globs).toContain("**/docs/drafts.md");
      expect(globs).toContain("**/docs/scratch");
      expect(globs.some((glob) => glob.includes("node_modules"))).toBe(true);
      expect(policy.explain("/tmp/outside-workspace").reason).toBe(
        "outside_workspace",
      );
      expect(policy.explain(dir).ignored).toBe(false);
      expect(policy.explain(".sisyphus/state").ignored).toBe(true);
      expect(policy.explain(".opencode/bin").ignored).toBe(true);
    } finally {
      try {
        chmodSync(path.join(dir, "locked"), 0o700);
      } catch {
        // ignore
      }
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
