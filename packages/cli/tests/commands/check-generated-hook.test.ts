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
import { installGitHooks } from "../../src/commands/init-helpers.js";
import { refreshManifestCoordinates } from "../../src/commands/sync/manifest.js";

const cli = fileURLToPath(new URL("../../bin/kibi", import.meta.url));
const systemGit = "/usr/bin/git";
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
      ".kb/symbols.yaml",
      ".kb/symbol-coordinates.yaml",
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
  installGitHooks(path.join(cwd, ".git"));
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
    installGitHooks(path.join(cwd, ".git"));
    expect(git(cwd, ["add", ".kb/symbols.yaml"]).status).toBe(0);
    const commit = git(cwd, ["commit", "-m", "first"], {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH ?? ""}`,
    });
    expect(commit.status).toBe(0);
    expect(commit.output).toContain("no coordinates to refresh");
  });

  test("allows a commit with current generated manifests", async () => {
    const { cwd, env } = await fixture();
    write(
      cwd,
      "src/sample.ts",
      "// moved\nexport function sample() { return 1; }\n",
    );
    await refresh(cwd);
    expect(
      git(cwd, [
        "add",
        "src/sample.ts",
        ".kb/symbols.yaml",
        ".kb/symbol-coordinates.yaml",
      ]).status,
    ).toBe(0);
    const commit = git(cwd, ["commit", "-m", "current"], env);
    expect(commit.output).toContain("staged generated manifests are current");
    expect(commit.status).toBe(0);
  });

  test("blocks drift and reports the generated paths and repair command", async () => {
    const { cwd, env } = await fixture();
    write(
      cwd,
      "src/sample.ts",
      "// moved\nexport function sample() { return 1; }\n",
    );
    expect(git(cwd, ["add", "src/sample.ts"]).status).toBe(0);
    const commit = git(cwd, ["commit", "-m", "drift"], env);
    expect(commit.status).not.toBe(0);
    expect(commit.output).toContain(".kb/symbol-coordinates.yaml");
    expect(commit.output).toContain("kibi sync --refresh-symbol-coordinates");
    expect(commit.output).toContain("git add -p");
    expect(git(cwd, ["diff", "--cached", "--name-only"]).output.trim()).toBe(
      "src/sample.ts",
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

  test("uses staged source bytes when a file is only partly staged", async () => {
    const { cwd, env } = await fixture();
    write(
      cwd,
      "src/sample.ts",
      "// staged\nexport function sample() { return 1; }\n",
    );
    await refresh(cwd);
    expect(
      git(cwd, [
        "add",
        "src/sample.ts",
        ".kb/symbols.yaml",
        ".kb/symbol-coordinates.yaml",
      ]).status,
    ).toBe(0);
    write(
      cwd,
      "src/sample.ts",
      "// unstaged\n// staged\nexport function sample() { return 1; }\n",
    );
    const manifest = path.join(cwd, ".kb/symbols.yaml");
    writeFileSync(manifest, `${readFileSync(manifest, "utf8")}# unstaged\n`);
    const commit = git(cwd, ["commit", "-m", "partial"], env);
    expect(commit.status).toBe(0);
    expect(commit.output).toContain("staged generated manifests are current");
    expect(readFileSync(path.join(cwd, "src/sample.ts"), "utf8")).toContain(
      "// unstaged",
    );
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
    expect(commit.output).toContain("no staged symbol sources");
    expect(git(cwd, ["status", "--short", "--", "notes.txt"]).output).toContain(
      " M notes.txt",
    );
  });

  test("blocks when the index changes during analysis", async () => {
    const { cwd, env, binDir } = await fixture();
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
      `#!/bin/sh\nif [ "$1" = "write-tree" ]; then\n  n=0\n  if [ -f "${counter}" ]; then n=$(cat "${counter}"); fi\n  n=$((n + 1))\n  printf '%s' "$n" > "${counter}"\n  if [ "$n" -eq 2 ]; then\n    printf 'changed\\n' > index-change.txt\n    "${systemGit}" add index-change.txt\n  fi\nfi\nexec "${systemGit}" "$@"\n`,
    );
    chmodSync(wrapper, 0o755);
    const hook = spawnSync("sh", [".git/hooks/pre-commit"], {
      cwd,
      env,
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
