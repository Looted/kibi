// implements REQ-cli-canonical-runtime
import { afterEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRepoIgnorePolicy } from "../../src/public/ignore-policy.js";
import {
  createTempDir,
  isolateKibiEnv,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) {
    try {
      chmodSync(path.join(root, "unreadable.gitignore"), 0o644);
    } catch {
      // best effort
    }
    try {
      chmodSync(path.join(root, "locked-dir"), 0o700);
    } catch {
      // best effort
    }
    removeTempDir(root);
  }
});

describe("createRepoIgnorePolicy leftover walk and glob branches", () => {
  test("skips comments, bangs, derived kb trees, and unreadable ignore files", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = createTempDir("kibi-ignore-rem-");
    roots.push(root);
    mkdirSync(path.join(root, ".git", "info"), { recursive: true });
    mkdirSync(path.join(root, ".kb", "branches", "main"), { recursive: true });
    mkdirSync(path.join(root, ".kb", "requirements"), { recursive: true });
    mkdirSync(path.join(root, "docs", "nested"), { recursive: true });
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, "src", "index.ts"), "export {}\n");
    writeFileSync(
      path.join(root, ".gitignore"),
      ["# comment", "", "!keep.tmp", "/build/out.txt", "tmp", "["].join("\n"),
    );
    writeFileSync(
      path.join(root, ".git", "info", "exclude"),
      ["# note", "!keep.local", "/hidden/secret.txt", "local"].join("\n"),
    );
    writeFileSync(
      path.join(root, "docs", ".gitignore"),
      ["# nested", "!keep.md", "/drafts.md", "scratch"].join("\n"),
    );
    writeFileSync(path.join(root, "docs", "nested", "notes.txt"), "ok");
    writeFileSync(path.join(root, "unreadable.gitignore"), "x");
    try {
      chmodSync(path.join(root, "unreadable.gitignore"), 0o000);
    } catch {
      // some hosts ignore chmod
    }
    const locked = path.join(root, "locked-dir");
    mkdirSync(locked);
    writeFileSync(path.join(locked, ".gitignore"), "secret");
    try {
      chmodSync(locked, 0o000);
    } catch {
      // some hosts ignore chmod
    }

    const policy = createRepoIgnorePolicy(root);
    expect(policy.isIgnored(".kb/branches/main/x")).toBe(true);
    expect(policy.isIgnored(".kb/requirements/REQ.md")).toBe(false);
    expect(policy.explain("build/out.txt").ignored).toBe(true);
    expect(policy.explain("hidden/secret.txt").ignored).toBe(true);
    expect(policy.explain("docs/drafts.md").ignored).toBe(true);
    expect(policy.explain(path.join(root, "src", "index.ts")).ignored).toBe(
      false,
    );
    expect(policy.explain("docs").ignored).toBe(false);
    const globs = policy.getFastGlobIgnoreGlobs();
    expect(globs).toContain("**/build/out.txt");
    expect(globs).toContain("**/tmp");
    expect(globs).toContain("**/hidden/secret.txt");
    expect(globs).toContain("**/docs/drafts.md");
    expect(globs.some((glob) => glob.includes("keep"))).toBe(false);
    expect(policy.explain("/tmp/outside-workspace").reason).toBe(
      "outside_workspace",
    );
    expect(policy.explain("vendor/pkg/index.js").reason).toBe("hard_deny");
    expect(policy.explain("local").reason).toBe("git_info_exclude");
  });

  test("returns not ignored for empty ignore files and relative workspace paths", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = createTempDir("kibi-ignore-empty-");
    roots.push(root);
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, ".gitignore"), "\n# only comments\n");
    writeFileSync(path.join(root, "src", "ok.ts"), "export {}\n");
    const policy = createRepoIgnorePolicy(root);
    expect(policy.isIgnored("src/ok.ts")).toBe(false);
    expect(policy.explain(root).ignored).toBe(false);
    expect(policy.getFastGlobIgnoreGlobs().some((glob) => glob.includes("node_modules"))).toBe(
      true,
    );
  });
});
