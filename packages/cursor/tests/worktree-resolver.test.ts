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
      'printf "workspace=%s\\n" "$KIBI_MCP_ATTACH_ROOT"',
      'printf "launcher=%s\\n" "$2"',
      'printf "arguments=%s\\n" "$*"',
      'printf "host=%s\\n" "$KIBI_MCP_HOST"',
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

type ResolverEnv = {
  readonly withoutSwipl?: boolean;
  readonly kibiSwipl?: string;
};

/** A PATH holding only the tools the resolver needs, never swipl. */
function toolsWithoutSwipl(fixture: RepositoryFixture): string {
  const tools = path.join(path.dirname(fixture.binRoot), "tools");
  fs.mkdirSync(tools, { recursive: true });
  for (const tool of ["git", "sed", "dirname"]) {
    const found = spawnSync("sh", ["-c", `command -v ${tool}`], {
      encoding: "utf8",
    }).stdout.trim();
    if (found && !fs.existsSync(path.join(tools, tool))) {
      fs.symlinkSync(found, path.join(tools, tool));
    }
  }
  fs.rmSync(path.join(fixture.binRoot, "swipl"), { force: true });
  return `${fixture.binRoot}${path.delimiter}${tools}`;
}

function runResolver(
  fixture: RepositoryFixture,
  cwd: string,
  options: ResolverEnv = {},
): ResolverResult {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: options.withoutSwipl
      ? toolsWithoutSwipl(fixture)
      : `${fixture.binRoot}${path.delimiter}${process.env.PATH ?? ""}`,
  };
  Reflect.deleteProperty(env, "KIBI_SWIPL");
  if (options.kibiSwipl !== undefined) env.KIBI_SWIPL = options.kibiSwipl;
  const result = spawnSync("/bin/sh", [resolverPath], {
    cwd,
    encoding: "utf8",
    env,
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
  // Usage telemetry is opt-in: the resolver identifies the host but never
  // turns logging on for the operator.
  expect(result.stdout).not.toContain("--diagnostic-mode");
  expect(result.stdout).toContain("host=cursor\n");
  expect(result.stderr).toBe("");
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("Cursor worktree MCP resolver SWI-Prolog availability", () => {
  function writeBundled(root: string): void {
    const bin = path.join(
      root,
      "node_modules",
      "kibi-swipl-linux-x64-gnu",
      "bin",
    );
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(path.join(bin, "swipl"), "#!/bin/sh\nexit 0\n");
    fs.chmodSync(path.join(bin, "swipl"), 0o755);
  }

  test("rejects a candidate with no swipl on PATH and no bundled or configured runtime", () => {
    const fixture = createFixture();
    createRuntime(fixture.worktreeRoot);
    createRuntime(fixture.primaryRoot);

    const result = runResolver(fixture, fixture.worktreeRoot, {
      withoutSwipl: true,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "local rejected: SWI-Prolog executable swipl is unavailable (no KIBI_SWIPL, bundled kibi-swipl package, or swipl on PATH)",
    );
  });

  test("accepts a candidate whose installed packages include a bundled swipl", () => {
    const fixture = createFixture();
    createRuntime(fixture.worktreeRoot);
    writeBundled(fixture.worktreeRoot);

    const result = runResolver(fixture, fixture.worktreeRoot, {
      withoutSwipl: true,
    });

    expectLaunch(result, fixture.worktreeRoot, fixture.worktreeRoot);
  });

  test("accepts the primary checkout's bundled swipl when the worktree has none", () => {
    const fixture = createFixture();
    createRuntime(fixture.primaryRoot);
    writeBundled(fixture.primaryRoot);

    const result = runResolver(fixture, fixture.worktreeRoot, {
      withoutSwipl: true,
    });

    expectLaunch(result, fixture.primaryRoot, fixture.worktreeRoot);
  });

  test("accepts an executable KIBI_SWIPL and rejects a missing one", () => {
    const fixture = createFixture();
    createRuntime(fixture.worktreeRoot);
    const configured = path.join(fixture.binRoot, "custom-swipl");
    fs.writeFileSync(configured, "#!/bin/sh\nexit 0\n");
    fs.chmodSync(configured, 0o755);

    expectLaunch(
      runResolver(fixture, fixture.worktreeRoot, {
        withoutSwipl: true,
        kibiSwipl: configured,
      }),
      fixture.worktreeRoot,
      fixture.worktreeRoot,
    );
    const missing = runResolver(fixture, fixture.worktreeRoot, {
      withoutSwipl: true,
      kibiSwipl: path.join(fixture.binRoot, "absent"),
    });
    expect(missing.status).not.toBe(0);
    expect(missing.stderr).toContain(
      "SWI-Prolog executable swipl is unavailable",
    );
  });

  test("KIBI_SWIPL=system ignores a bundled swipl and needs swipl on PATH", () => {
    const fixture = createFixture();
    createRuntime(fixture.worktreeRoot);
    writeBundled(fixture.worktreeRoot);

    const result = runResolver(fixture, fixture.worktreeRoot, {
      withoutSwipl: true,
      kibiSwipl: "system",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "SWI-Prolog executable swipl is unavailable",
    );
  });
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
    expect(result.stderr).not.toContain("building local MCP dist");
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

  test("builds local MCP dist when no trusted runtime exists", () => {
    const fixture = createFixture();
    fs.mkdirSync(path.join(fixture.worktreeRoot, "packages", "mcp", "bin"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(fixture.worktreeRoot, "packages", "mcp", "bin", "kibi-mcp"),
      "#!/usr/bin/env node\n",
    );
    writeFakeCommand(
      fixture.binRoot,
      "bun",
      [
        'if printf "%s" "$*" | grep -q "build:mcp"; then',
        "  mkdir -p packages/mcp/dist",
        "  exit 0",
        "fi",
        'if printf "%s" "$*" | grep -q "build:"; then',
        "  exit 0",
        "fi",
        'printf "runtime=%s\\n" "$PWD"',
        'printf "workspace=%s\\n" "$KIBI_MCP_ATTACH_ROOT"',
        'printf "launcher=%s\\n" "$2"',
        'printf "arguments=%s\\n" "$*"',
        'printf "host=%s\\n" "$KIBI_MCP_HOST"',
      ].join("\n"),
    );

    const result = runResolver(fixture, fixture.worktreeRoot);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`runtime=${fixture.worktreeRoot}\n`);
    expect(result.stdout).toContain(`workspace=${fixture.worktreeRoot}\n`);
    expect(result.stdout).toContain(
      `launcher=${path.join(fixture.worktreeRoot, "packages", "mcp", "bin", "kibi-mcp")}\n`,
    );
    expect(result.stdout).toContain("arguments=run ");
    expect(result.stdout).not.toContain("--diagnostic-mode");
    expect(result.stdout).toContain("host=cursor\n");
    expect(result.stderr).toContain("building local MCP dist");
    expect(
      fs
        .statSync(path.join(fixture.worktreeRoot, "packages", "mcp", "dist"))
        .isDirectory(),
    ).toBe(true);
  });
});
