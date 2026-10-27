import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { checkGeneratedManifests } from "../../src/commands/check-generated.js";
import { installGitHooks } from "../../src/commands/init-helpers.js";
import { refreshManifestCoordinates } from "../../src/commands/sync/manifest.js";

const cli = fileURLToPath(new URL("../../bin/kibi", import.meta.url));
const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function git(cwd: string, args: string[], env?: NodeJS.ProcessEnv) {
  const result = spawnSync("git", args, {
    cwd,
    env: env ?? process.env,
    encoding: "utf8",
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

function write(cwd: string, file: string, content: string) {
  const target = path.join(cwd, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

async function fixture() {
  const cwd = mkdtempSync(path.join(tmpdir(), "kibi-generated-hook-"));
  dirs.push(cwd);
  expect(git(cwd, ["init", "-b", "main"]).status).toBe(0);
  expect(git(cwd, ["config", "user.email", "test@example.com"]).status).toBe(0);
  expect(git(cwd, ["config", "user.name", "Kibi Test"]).status).toBe(0);
  write(cwd, "src/sample.ts", "export function sample() { return 1; }\n");
  write(cwd, "notes.txt", "base note\n");
  write(cwd, ".gitignore", ".kb/symbol-coordinates.yaml\n");
  write(
    cwd,
    ".kb/symbols.yaml",
    "symbols:\n  - id: SYMBOL-sample\n    title: sample\n    sourceFile: src/sample.ts\n",
  );
  await refreshManifestCoordinates(path.join(cwd, ".kb/symbols.yaml"), cwd, {
    refreshSymbolCoordinates: true,
  });
  expect(
    git(cwd, [
      "add",
      "src/sample.ts",
      "notes.txt",
      ".gitignore",
      ".kb/symbols.yaml",
    ]).status,
  ).toBe(0);
  expect(
    git(cwd, ["-c", "core.hooksPath=/dev/null", "commit", "-m", "base"]).status,
  ).toBe(0);

  const binDir = path.join(cwd, "test-bin");
  mkdirSync(binDir);
  const wrapper = path.join(binDir, "kibi");
  writeFileSync(
    wrapper,
    `#!/bin/sh\nif [ "$1" = "check" ]; then exit 0; fi\nexec "${cli}" "$@"\n`,
  );
  chmodSync(wrapper, 0o755);
  installGitHooks(path.join(cwd, ".git", "hooks"));
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${binDir}:${process.env.PATH ?? ""}`,
  };
  env.KIBI_BRANCH = undefined;
  env.KIBI_WORKSPACE = undefined;
  return { cwd, env, binDir };
}

async function refresh(cwd: string) {
  await refreshManifestCoordinates(path.join(cwd, ".kb/symbols.yaml"), cwd, {
    refreshSymbolCoordinates: true,
  });
}

describe("installed pre-commit generated-manifest gate", () => {
  test("allows the first commit of an empty symbols manifest", () => {
    const cwd = mkdtempSync(path.join(tmpdir(), "kibi-empty-generated-hook-"));
    dirs.push(cwd);
    expect(git(cwd, ["init", "-b", "main"]).status).toBe(0);
    expect(git(cwd, ["config", "user.email", "test@example.com"]).status).toBe(
      0,
    );
    expect(git(cwd, ["config", "user.name", "Kibi Test"]).status).toBe(0);
    write(cwd, ".kb/symbols.yaml", "symbols: []\n");
    const binDir = path.join(cwd, "test-bin");
    mkdirSync(binDir);
    const wrapper = path.join(binDir, "kibi");
    writeFileSync(
      wrapper,
      `#!/bin/sh\nif [ "$1" = "check" ]; then exit 0; fi\nexec "${cli}" "$@"\n`,
    );
    chmodSync(wrapper, 0o755);
    installGitHooks(path.join(cwd, ".git", "hooks"));
    expect(git(cwd, ["add", ".kb/symbols.yaml"]).status).toBe(0);
    const commit = git(cwd, ["commit", "-m", "first"], {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ""}`,
    });
    expect(commit.status).toBe(0);
    expect(commit.output).toContain("nothing to check");
  });

  test("allows a commit that only moves a declaration, with no coordinates staged", async () => {
    const { cwd, env } = await fixture();
    write(
      cwd,
      "src/sample.ts",
      "// moved\nexport function sample() { return 1; }\n",
    );
    await refresh(cwd);
    expect(git(cwd, ["add", "src/sample.ts", ".kb/symbols.yaml"]).status).toBe(
      0,
    );
    const previousCwd = process.cwd();
    try {
      process.chdir(cwd);
      expect(await checkGeneratedManifests()).toEqual({ exitCode: 0 });
    } finally {
      process.chdir(previousCwd);
    }
    const commit = git(cwd, ["commit", "-m", "moved"], env);
    expect(commit.output).toContain("staged symbols manifest unchanged");
    expect(commit.status).toBe(0);
    expect(
      git(cwd, ["ls-files", "--", ".kb/symbol-coordinates.yaml"]).output.trim(),
    ).toBe("");
  });

  test("allows a commit with a current staged symbols manifest", async () => {
    const { cwd, env } = await fixture();
    write(
      cwd,
      ".kb/symbols.yaml",
      "symbols:\n  - id: SYMBOL-sample\n    title: sample\n    sourceFile: src/sample.ts\n    status: active\n",
    );
    await refresh(cwd);
    expect(git(cwd, ["add", ".kb/symbols.yaml"]).status).toBe(0);
    const commit = git(cwd, ["commit", "-m", "current"], env);
    expect(commit.output).toContain("staged generated manifests are current");
    expect(commit.status).toBe(0);
  });

  test("blocks a staged coordinate file and names the untracking command", async () => {
    const { cwd, env } = await fixture();
    expect(
      git(cwd, ["add", "--force", ".kb/symbol-coordinates.yaml"]).status,
    ).toBe(0);
    const commit = git(cwd, ["commit", "-m", "tracked coordinates"], env);
    expect(commit.status).not.toBe(0);
    expect(commit.output).toContain(
      ".kb/symbol-coordinates.yaml is staged, but symbol coordinates are derived locally and never committed",
    );
    expect(commit.output).toContain(
      "git rm --cached .kb/symbol-coordinates.yaml",
    );
  });

  test("blocks a staged symbols manifest that refresh would normalize", async () => {
    const { cwd, env } = await fixture();
    const manifest = path.join(cwd, ".kb/symbols.yaml");
    writeFileSync(
      manifest,
      `${readFileSync(manifest, "utf8")}# stale comment\n`,
    );
    expect(git(cwd, ["add", ".kb/symbols.yaml"]).status).toBe(0);
    const commit = git(cwd, ["commit", "-m", "manifest drift"], env);
    expect(commit.status).not.toBe(0);
    expect(commit.output).toContain(
      "generated manifest drift in staged snapshot: .kb/symbols.yaml",
    );
  });

  test("checks the staged manifest bytes when the file is only partly staged", async () => {
    const { cwd, env } = await fixture();
    write(
      cwd,
      ".kb/symbols.yaml",
      "symbols:\n  - id: SYMBOL-sample\n    title: sample\n    sourceFile: src/sample.ts\n    status: active\n",
    );
    await refresh(cwd);
    expect(git(cwd, ["add", ".kb/symbols.yaml"]).status).toBe(0);
    const manifest = path.join(cwd, ".kb/symbols.yaml");
    writeFileSync(manifest, `${readFileSync(manifest, "utf8")}# unstaged\n`);
    const commit = git(cwd, ["commit", "-m", "partial"], env);
    expect(commit.status).toBe(0);
    expect(commit.output).toContain("staged generated manifests are current");
    expect(readFileSync(manifest, "utf8")).toContain("# unstaged");
  });

  test("ignores unrelated unstaged changes", async () => {
    const { cwd, env } = await fixture();
    write(cwd, "notes.txt", "unstaged note\n");
    const commit = git(
      cwd,
      ["commit", "--allow-empty", "-m", "unrelated"],
      env,
    );
    expect(commit.status).toBe(0);
    expect(commit.output).toContain("staged symbols manifest unchanged");
    expect(git(cwd, ["status", "--short", "--", "notes.txt"]).output).toContain(
      " M notes.txt",
    );
  });

  test("blocks when the index changes during analysis", async () => {
    const { cwd, env, binDir } = await fixture();
    const systemGit = Bun.which("git");
    if (!systemGit) throw new Error("Git executable required for hook fixture");
    write(
      cwd,
      "src/sample.ts",
      "// moved\nexport function sample() { return 1; }\n",
    );
    expect(git(cwd, ["add", "src/sample.ts"]).status).toBe(0);
    const counter = path.join(cwd, "index-check-count");
    const wrapper = path.join(binDir, "git");
    writeFileSync(
      wrapper,
      `#!/bin/sh\nif [ "$1" = "write-tree" ]; then\n  n=0\n  if [ -f "${counter}" ]; then n=$(cat "${counter}"); fi\n  n=$((n + 1))\n  printf '%s' "$n" > "${counter}"\n  if [ "$n" -eq 2 ]; then\n    printf 'changed\\n' > index-change.txt\n    "$KIBI_TEST_REAL_GIT" add index-change.txt\n  fi\nfi\nexec "$KIBI_TEST_REAL_GIT" "$@"\n`,
    );
    chmodSync(wrapper, 0o755);
    const hook = spawnSync("sh", [".git/hooks/pre-commit"], {
      cwd,
      env: { ...env, KIBI_TEST_REAL_GIT: systemGit },
      encoding: "utf8",
    });
    expect(hook.status).not.toBe(0);
    expect(`${hook.stdout}${hook.stderr}`).toContain(
      "Git index changed during generated-manifest analysis",
    );
    expect(git(cwd, ["diff", "--cached", "--name-only"]).output).toContain(
      "index-change.txt",
    );
  });
});
