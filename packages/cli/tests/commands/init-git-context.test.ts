import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  execSync as nodeExecSync,
  isolatedCliSandboxEnv,
} from "../helpers/isolated-env.js";

// executable_for TEST-git-hook-effective-install
function git(cwd: string, args: string): string {
  return nodeExecSync(`git ${args}`, {
    cwd,
    encoding: "utf8",
    env: isolatedCliSandboxEnv(),
  });
}

describe("kibi init repository-context fixes", () => {
  let tmpRoot: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeEach(() => {
    tmpRoot = mkdtempSync(path.join(os.tmpdir(), "kibi-test-init-ctx-"));
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  function makeRepo(name: string): string {
    const repo = path.join(tmpRoot, name);
    nodeExecSync(`git init -q -b main ${JSON.stringify(repo)}`, {
      env: isolatedCliSandboxEnv(),
    });
    git(repo, "config user.email test@test.com");
    git(repo, "config user.name Test User");
    return repo;
  }

  function commitReadme(repo: string): void {
    writeFileSync(path.join(repo, "README.md"), "# t\n");
    git(repo, "add README.md");
    git(repo, "commit -qm init");
  }

  function kibi(args: string, cwd: string): string {
    return nodeExecSync(`bun ${JSON.stringify(kibiBin)} ${args} 2>&1`, {
      cwd,
      encoding: "utf8",
      env: isolatedCliSandboxEnv(),
    });
  }

  test("init succeeds inside a linked worktree and installs into the common hooks dir", () => {
    const primary = makeRepo("primary");
    commitReadme(primary);
    // Create the worktree before installing hooks: the shared post-checkout
    // hook needs a resolvable kibi binary, which the runtime/bootstrap PR
    // addresses; this test covers path resolution only.
    const linked = path.join(tmpRoot, "linked");
    git(primary, `worktree add -q -b feature ${JSON.stringify(linked)}`);
    kibi("init", primary);
    kibi("init", linked);

    expect(existsSync(path.join(linked, ".git/hooks/pre-commit"))).toBe(false);
    expect(existsSync(path.join(primary, ".git/hooks/pre-commit"))).toBe(true);
    expect(
      readFileSync(path.join(primary, ".git/hooks/pre-commit"), "utf8"),
    ).toContain("BEGIN kibi-managed");
    // The worktree gets its own workspace state, not the primary's.
    expect(existsSync(path.join(linked, ".kb/manifest.json"))).toBe(true);
  }, 180000);

  test("init from a subdirectory creates .kb at the repository root only", () => {
    const repo = makeRepo("repo");
    const sub = path.join(repo, "sub", "deep");
    mkdirSync(sub, { recursive: true });
    commitReadme(repo);

    const output = kibi("init", sub);
    expect(output).toContain("Kibi initialized");
    expect(existsSync(path.join(repo, ".kb/manifest.json"))).toBe(true);
    expect(existsSync(path.join(sub, ".kb"))).toBe(false);
    expect(existsSync(path.join(repo, ".git/hooks/pre-commit"))).toBe(true);
  }, 180000);

  test("init reports skipped foreign hooks instead of unconditional success", () => {
    const repo = makeRepo("foreign");
    const hooksDir = path.join(repo, ".git/hooks");
    mkdirSync(hooksDir, { recursive: true });
    const foreignPath = path.join(hooksDir, "pre-commit");
    writeFileSync(foreignPath, "#!/bin/sh\necho 'user hook'\n");

    const output = kibi("init", repo);
    expect(output).toContain(
      "pre-commit: existing non-Kibi hook left untouched",
    );
    // The aggregate success line must not claim pre-commit was installed.
    const successLine = output
      .split("\n")
      .find((line) => line.includes("✓ Installed/updated Kibi git hooks"));
    if (successLine) {
      expect(successLine).not.toContain("pre-commit");
    }
    expect(readFileSync(foreignPath, "utf8")).toBe(
      "#!/bin/sh\necho 'user hook'\n",
    );
    expect(output).not.toContain(
      "✓ Installed git hooks (pre-commit, post-checkout, post-merge, post-rewrite)",
    );
  }, 180000);

  test("init reports the configured core.hooksPath and installs into the effective dir", () => {
    const repo = makeRepo("hooked");
    git(repo, "config core.hooksPath .githooks");

    const output = kibi("init", repo);
    expect(output).toContain("core.hooksPath is configured");
    expect(existsSync(path.join(repo, ".githooks/pre-commit"))).toBe(true);
    expect(existsSync(path.join(repo, ".git/hooks/pre-commit"))).toBe(false);
  }, 180000);

  test("init refuses to install into a hooks path outside the repository", () => {
    const repo = makeRepo("external");
    const externalHooks = path.join(tmpRoot, "external-hooks");
    git(repo, `config core.hooksPath ${JSON.stringify(externalHooks)}`);

    const output = kibi("init", repo);
    expect(output).toContain(
      "refusing to install hooks into unrelated directories",
    );
    expect(existsSync(path.join(externalHooks, "pre-commit"))).toBe(false);
  }, 180000);
});
