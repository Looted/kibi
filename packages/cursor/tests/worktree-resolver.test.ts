/// <reference types="bun-types" />
// executable_for TEST-cursor-worktree-kibi-continuity
import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const resolverPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../scripts/worktree-resolver.sh",
);
const tempRoots: string[] = [];

type RepositoryFixture = {
  readonly primaryRoot: string;
  readonly worktreeRoot: string;
  readonly binRoot: string;
};

type ResolverResult = {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
};

function runGit(cwd: string, args: readonly string[]): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function writePackageVersions(root: string, version: string): void {
  for (const packageName of ["core", "cli", "mcp"] as const) {
    const packageRoot = path.join(root, "packages", packageName);
    fs.mkdirSync(packageRoot, { recursive: true });
    fs.writeFileSync(
      path.join(packageRoot, "package.json"),
      `${JSON.stringify({ name: `kibi-${packageName}`, version }, null, 2)}\n`,
    );
  }
}

function createFixture(prefix = "kibi-cursor-resolver-"): RepositoryFixture {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempRoots.push(fixtureRoot);
  const primaryRoot = path.join(fixtureRoot, "primary checkout");
  const worktreeRoot = path.join(fixtureRoot, "linked worktree");
  const binRoot = path.join(fixtureRoot, "test commands");
  fs.mkdirSync(primaryRoot, { recursive: true });
  fs.mkdirSync(binRoot, { recursive: true });
  runGit(primaryRoot, ["init"]);
  runGit(primaryRoot, ["config", "user.email", "resolver@example.test"]);
  runGit(primaryRoot, ["config", "user.name", "Resolver Test"]);
  writePackageVersions(primaryRoot, "1.2.3");
  runGit(primaryRoot, ["add", "packages"]);
  runGit(primaryRoot, ["commit", "-m", "fixture"]);
  runGit(primaryRoot, ["worktree", "add", "-b", "linked", worktreeRoot]);
  writeFakeCommand(
    binRoot,
    "bun",
    [
      'printf "runtime=%s\\n" "$PWD"',
      'printf "workspace=%s\\n" "$KIBI_WORKSPACE"',
      'printf "launcher=%s\\n" "$2"',
      'printf "arguments=%s\\n" "$*"',
    ].join("\n"),
  );
  writeFakeCommand(binRoot, "swipl", "exit 0");
  return { primaryRoot, worktreeRoot, binRoot };
}

function writeFakeCommand(root: string, name: string, body: string): void {
  const target = path.join(root, name);
  fs.writeFileSync(target, `#!/bin/sh\n${body}\n`);
  fs.chmodSync(target, 0o755);
}

function createRuntime(root: string): void {
  const mcpRoot = path.join(root, "packages", "mcp");
  fs.mkdirSync(path.join(mcpRoot, "bin"), { recursive: true });
  fs.mkdirSync(path.join(mcpRoot, "dist"), { recursive: true });
  fs.writeFileSync(
    path.join(mcpRoot, "bin", "kibi-mcp"),
    "#!/usr/bin/env node\n",
  );
}

function runResolver(fixture: RepositoryFixture, cwd: string): ResolverResult {
  const result = spawnSync("sh", [resolverPath], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${fixture.binRoot}${path.delimiter}${process.env.PATH ?? ""}`,
    },
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function expectLaunch(
  result: ResolverResult,
  runtimeRoot: string,
  workspaceRoot: string,
): void {
  expect(result.status).toBe(0);
  expect(result.stdout).toContain(`runtime=${runtimeRoot}\n`);
  expect(result.stdout).toContain(`workspace=${workspaceRoot}\n`);
  expect(result.stdout).toContain(
    `launcher=${path.join(runtimeRoot, "packages", "mcp", "bin", "kibi-mcp")}\n`,
  );
  expect(result.stdout).toContain("arguments=run ");
  expect(result.stdout).toContain(" --diagnostic-mode\n");
  expect(result.stderr).toBe("");
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("Cursor worktree MCP resolver", () => {
  test("uses a valid build from the current worktree", () => {
    const fixture = createFixture();
    createRuntime(fixture.primaryRoot);
    createRuntime(fixture.worktreeRoot);

    const result = runResolver(fixture, fixture.worktreeRoot);

    expectLaunch(result, fixture.worktreeRoot, fixture.worktreeRoot);
  });

  test("uses the primary checkout build when the local build is invalid", () => {
    const fixture = createFixture();
    createRuntime(fixture.primaryRoot);
    fs.mkdirSync(path.join(fixture.worktreeRoot, "packages", "mcp", "bin"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(fixture.worktreeRoot, "packages", "mcp", "bin", "kibi-mcp"),
      "#!/usr/bin/env node\n",
    );

    const result = runResolver(fixture, fixture.worktreeRoot);

    expectLaunch(result, fixture.primaryRoot, fixture.worktreeRoot);
  });

  test("does not use a build from an unrelated checkout", () => {
    const fixture = createFixture();
    createRuntime(fixture.primaryRoot);
    const unrelatedRoot = path.join(
      path.dirname(fixture.primaryRoot),
      "unrelated",
    );
    fs.mkdirSync(unrelatedRoot);
    runGit(unrelatedRoot, ["init"]);
    runGit(unrelatedRoot, ["config", "user.email", "resolver@example.test"]);
    runGit(unrelatedRoot, ["config", "user.name", "Resolver Test"]);
    writePackageVersions(unrelatedRoot, "1.2.3");
    runGit(unrelatedRoot, ["add", "packages"]);
    runGit(unrelatedRoot, ["commit", "-m", "fixture"]);

    const result = runResolver(fixture, unrelatedRoot);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("local rejected: missing MCP bin");
    expect(result.stderr).toContain(
      "primary rejected: same checkout as workspace",
    );
    expect(result.stdout).toBe("");
  });

  test("rejects a primary build whose package versions differ", () => {
    const fixture = createFixture();
    createRuntime(fixture.primaryRoot);
    writePackageVersions(fixture.worktreeRoot, "9.9.9");

    const result = runResolver(fixture, fixture.worktreeRoot);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "primary rejected: package version mismatch for core (workspace 9.9.9, runtime 1.2.3)",
    );
  });

  test("reports missing build artifacts in deterministic order", () => {
    const fixture = createFixture();

    const result = runResolver(fixture, fixture.worktreeRoot);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toBe(
      [
        `kibi-mcp resolver: local rejected: missing MCP bin at ${path.join(fixture.worktreeRoot, "packages", "mcp", "bin", "kibi-mcp")}`,
        `kibi-mcp resolver: primary rejected: missing MCP bin at ${path.join(fixture.primaryRoot, "packages", "mcp", "bin", "kibi-mcp")}`,
        "kibi-mcp resolver: no trusted built MCP runtime is available",
        "",
      ].join("\n"),
    );
  });

  test("fails when neither local nor primary candidate is complete", () => {
    const fixture = createFixture();
    createRuntime(fixture.worktreeRoot);
    fs.rmSync(path.join(fixture.worktreeRoot, "packages", "mcp", "dist"), {
      recursive: true,
    });
    createRuntime(fixture.primaryRoot);
    fs.rmSync(
      path.join(fixture.primaryRoot, "packages", "mcp", "bin", "kibi-mcp"),
    );

    const result = runResolver(fixture, fixture.worktreeRoot);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("local rejected: missing MCP dist");
    expect(result.stderr).toContain("primary rejected: missing MCP bin");
    expect(result.stderr).toContain(
      "no trusted built MCP runtime is available",
    );
  });

  test("preserves workspace and runtime roots containing spaces", () => {
    const fixture = createFixture("kibi cursor resolver spaces ");
    createRuntime(fixture.primaryRoot);

    const result = runResolver(fixture, fixture.worktreeRoot);

    expectLaunch(result, fixture.primaryRoot, fixture.worktreeRoot);
  });
});
