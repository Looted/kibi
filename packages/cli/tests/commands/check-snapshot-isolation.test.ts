// executable_for TEST-source-analysis-v2-contract
import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const kibiCli = resolve(import.meta.dir, "../../src/cli.ts");
const roots: string[] = [];

function git(root: string, ...args: string[]): void {
  execFileSync("git", args, { cwd: root, stdio: "pipe" });
}

function write(root: string, relativePath: string, content: string): void {
  const target = join(root, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function kibi(root: string, ...args: string[]) {
  const result = spawnSync("bun", [kibiCli, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, KB_PATH: ".kb/branches/main" },
  });
  return {
    exitCode: result.status,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
}

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-check-snapshot-"));
  roots.push(root);
  git(root, "init", "-b", "main");
  git(root, "config", "user.name", "Snapshot Test");
  git(root, "config", "user.email", "snapshot@example.test");
  expect(kibi(root, "init").exitCode).toBe(0);
  write(
    root,
    ".kb/requirements/REQ-snapshot.md",
    "---\nid: REQ-snapshot\ntitle: Snapshot ownership\nstatus: open\n---\n\nThe test helper has an owner.\n",
  );
  write(
    root,
    "src/owned.test.ts",
    "// implements REQ-snapshot\nexport function owned() { return 1; }\n",
  );
  git(root, "add", ".kb/requirements/REQ-snapshot.md", "src/owned.test.ts");
  git(root, "commit", "-m", "baseline", "--no-verify");
  write(
    root,
    "src/owned.test.ts",
    "// implements REQ-snapshot\nexport function owned() { return 2; }\n",
  );
  git(root, "add", "src/owned.test.ts");
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("public staged check uses one captured code and knowledge tree", () => {
  test("invalid working knowledge cannot break a valid index", () => {
    const root = fixture();
    const baseline = kibi(root, "check", "--staged", "--format", "json");
    expect(baseline.exitCode).toBe(0);

    write(
      root,
      ".kb/requirements/REQ-snapshot.md",
      "invalid working markdown\n",
    );
    const withBadWorktree = kibi(root, "check", "--staged", "--format", "json");
    expect(withBadWorktree.exitCode).toBe(0);
    expect(withBadWorktree.output).not.toContain("invalid working markdown");
  }, 30_000);

  test("valid working knowledge cannot repair a missing index endpoint", () => {
    const root = fixture();
    git(root, "rm", "--cached", ".kb/requirements/REQ-snapshot.md");
    const missingIndexRequirement = kibi(
      root,
      "check",
      "--staged",
      "--format",
      "json",
    );
    expect(missingIndexRequirement).toMatchObject({ exitCode: 1 });
    expect(missingIndexRequirement.output).toContain(
      "absent from the captured knowledge snapshot",
    );

    git(root, "add", ".kb/requirements/REQ-snapshot.md");
    const repairedIndex = kibi(root, "check", "--staged", "--format", "json");
    expect(repairedIndex.exitCode).toBe(0);
  }, 30_000);

  test("a staged typed relationship cannot borrow an endpoint from the worktree", () => {
    const root = fixture();
    git(root, "restore", "--staged", "src/owned.test.ts");
    git(root, "rm", "--cached", ".kb/requirements/REQ-snapshot.md");
    write(
      root,
      ".kb/symbols.yaml",
      "symbols:\n  - id: SYM-snapshot\n    title: owned\n    sourceFile: src/owned.test.ts\n    status: active\n    relationships:\n      - type: implements\n        target: REQ-snapshot\n",
    );
    git(root, "add", ".kb/symbols.yaml");

    const missingEndpoint = kibi(root, "check", "--staged", "--format", "json");
    expect(missingEndpoint.exitCode).toBe(1);
    expect(missingEndpoint.output).toContain(
      "Snapshot relationship has a missing endpoint: SYM-snapshot -> REQ-snapshot",
    );
  }, 30_000);

  test("manifest-only granularity uses captured source when the worktree differs", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-check-source-snapshot-"));
    roots.push(root);
    git(root, "init", "-b", "main");
    git(root, "config", "user.name", "Snapshot Test");
    git(root, "config", "user.email", "snapshot@example.test");
    expect(kibi(root, "init").exitCode).toBe(0);
    write(
      root,
      ".kb/requirements/REQ-snapshot.md",
      "---\nid: REQ-snapshot\ntitle: Snapshot ownership\nstatus: open\n---\n\nThe helper has an owner.\n",
    );
    write(root, "src/owned.ts", "export function owned() { return 1; }\n");
    git(root, "add", ".kb/requirements/REQ-snapshot.md", "src/owned.ts");
    git(root, "commit", "-m", "baseline", "--no-verify");
    write(
      root,
      ".kb/symbols.yaml",
      "symbols:\n  - id: SYM-coarse\n    title: owned.ts\n    sourceFile: src/owned.ts\n    links:\n      - REQ-snapshot\n    status: active\n",
    );
    git(root, "add", ".kb/symbols.yaml");

    const baseline = kibi(root, "check", "--staged", "--format", "json");
    expect(baseline.exitCode).toBe(1);
    expect(baseline.output).toContain("symbol_granularity_violation");

    write(root, "src/owned.ts", "export interface Idle { value: string }\n");
    const withChangedWorktree = kibi(
      root,
      "check",
      "--staged",
      "--format",
      "json",
    );
    expect(withChangedWorktree.exitCode).toBe(1);
    expect(withChangedWorktree.output).toContain(
      "symbol_granularity_violation",
    );
  }, 30_000);

  test("an unborn repository checks the staged tree against an empty base", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-check-unborn-"));
    roots.push(root);
    git(root, "init", "-b", "main");
    git(root, "config", "user.name", "Snapshot Test");
    git(root, "config", "user.email", "snapshot@example.test");
    expect(kibi(root, "init").exitCode).toBe(0);
    write(
      root,
      ".kb/requirements/REQ-snapshot.md",
      "---\nid: REQ-snapshot\ntitle: Snapshot ownership\nstatus: open\n---\n\nThe test helper has an owner.\n",
    );
    write(
      root,
      "src/owned.test.ts",
      "// implements REQ-snapshot\nexport function owned() { return 1; }\n",
    );
    git(root, "add", ".kb/requirements/REQ-snapshot.md", "src/owned.test.ts");

    const result = kibi(root, "check", "--staged", "--format", "json");
    expect(result).toMatchObject({ exitCode: 0 });
    expect(result.output).toContain("src/owned.test.ts");
  }, 30_000);
});
