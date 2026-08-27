import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "bun:test";

import {
  parseWorkspaceFolderPaths,
  resolveProjectLocalMcp,
  resolveWorkspaceRoot,
} from "../bin/launch-kibi-mcp.mjs";

const launcherPath = path.resolve(
  import.meta.dir,
  "../bin/launch-kibi-mcp.mjs",
);
const fixtureRoots: string[] = [];

function createFixture(options: { consumerName?: string } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-cursor-launcher-"));
  fixtureRoots.push(root);
  const pluginRoot = path.join(root, "plugin install");
  const consumerRoot = path.join(
    root,
    options.consumerName ?? "consumer project",
  );
  mkdirSync(pluginRoot, { recursive: true });
  mkdirSync(path.join(consumerRoot, ".git"), { recursive: true });
  mkdirSync(path.join(consumerRoot, ".kb"), { recursive: true });

  writeFileSync(
    path.join(consumerRoot, "package.json"),
    JSON.stringify({
      name: "consumer-project",
      private: true,
      type: "module",
      dependencies: { "kibi-mcp": "^0.24.0" },
    }),
  );

  installFakeMcp(consumerRoot, "consumer");
  return { root, pluginRoot, consumerRoot };
}

function installFakeMcp(
  workspaceRoot: string,
  label: string,
  options: { exports?: boolean; packageRoot?: string } = {},
) {
  const packageRoot =
    options.packageRoot ?? path.join(workspaceRoot, "node_modules", "kibi-mcp");
  const binRoot = path.join(packageRoot, "bin");
  mkdirSync(binRoot, { recursive: true });
  writeFileSync(
    path.join(packageRoot, "package.json"),
    JSON.stringify({
      name: "kibi-mcp",
      version: "99.0.0",
      type: "module",
      ...(options.exports ? { exports: { ".": "./bin/kibi-mcp.mjs" } } : {}),
      bin: { "kibi-mcp": "bin/kibi-mcp.mjs" },
    }),
  );
  writeFileSync(
    path.join(binRoot, "kibi-mcp.mjs"),
    `import { writeFileSync } from "node:fs";
const args = process.argv.slice(2);
if (args.includes("--signal-test")) {
  if (process.env.KIBI_LAUNCH_TEST_READY) writeFileSync(process.env.KIBI_LAUNCH_TEST_READY, "STARTED");
  process.on("SIGTERM", () => {
    if (process.env.KIBI_LAUNCH_TEST_OUTPUT) writeFileSync(process.env.KIBI_LAUNCH_TEST_OUTPUT, "SIGTERM");
    process.exit(143);
  });
  setInterval(() => {}, 1000);
} else if (args.includes("--exit-7")) {
  process.exit(7);
} else {
  const result = JSON.stringify({ label: ${JSON.stringify(label)}, cwd: process.cwd(), workspace: process.env.KIBI_WORKSPACE });
  if (process.env.KIBI_LAUNCH_TEST_OUTPUT) writeFileSync(process.env.KIBI_LAUNCH_TEST_OUTPUT, result);
  process.stdout.write(result);
}
`,
  );
}

function cleanEnv(overrides: NodeJS.ProcessEnv = {}) {
  const env = { ...process.env };
  env.WORKSPACE_FOLDER_PATHS = undefined;
  env.KIBI_WORKSPACE = undefined;
  env.CURSOR_WORKSPACE = undefined;
  Object.assign(env, overrides);
  return env;
}

function runLauncher(
  fixture: { pluginRoot: string; consumerRoot: string },
  args: string[],
  env = cleanEnv(),
) {
  return spawnSync(process.execPath, [launcherPath, ...args], {
    cwd: fixture.pluginRoot,
    env,
    encoding: "utf8",
  });
}

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("Cursor consumer workspace MCP launcher", () => {
  test("resolves the consumer package from an explicit path with spaces", () => {
    const fixture = createFixture();
    installFakeMcp(fixture.pluginRoot, "plugin");

    const result = runLauncher(
      fixture,
      [fixture.consumerRoot],
      cleanEnv({ KIBI_WORKSPACE: fixture.pluginRoot }),
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      label: "consumer",
      cwd: fixture.consumerRoot,
      workspace: fixture.consumerRoot,
    });
  });

  test("uses environment fallback when Cursor leaves ${workspaceFolder} unresolved", () => {
    const fixture = createFixture();
    const result = runLauncher(
      fixture,
      ["${workspaceFolder}"],
      cleanEnv({ KIBI_WORKSPACE: fixture.consumerRoot }),
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).workspace).toBe(fixture.consumerRoot);
  });

  test("resolves an exports-restricted package through the consumer root", () => {
    const fixture = createFixture();
    rmSync(path.join(fixture.consumerRoot, "node_modules", "kibi-mcp"), {
      recursive: true,
      force: true,
    });
    installFakeMcp(fixture.consumerRoot, "consumer", { exports: true });

    const resolved = resolveProjectLocalMcp(fixture.consumerRoot);
    expect(resolved.binPath).toBe(
      path.join(
        fixture.consumerRoot,
        "node_modules",
        "kibi-mcp",
        "bin",
        "kibi-mcp.mjs",
      ),
    );
  });

  test("resolves a pnpm-style symlinked package from the consumer root", () => {
    const fixture = createFixture();
    rmSync(path.join(fixture.consumerRoot, "node_modules"), {
      recursive: true,
      force: true,
    });
    const pnpmPackageRoot = path.join(
      fixture.consumerRoot,
      "node_modules",
      ".pnpm",
      "kibi-mcp@99.0.0",
      "node_modules",
      "kibi-mcp",
    );
    installFakeMcp(fixture.consumerRoot, "pnpm-consumer", {
      packageRoot: pnpmPackageRoot,
    });
    const visibleNodeModules = path.join(
      fixture.consumerRoot,
      "node_modules",
      "kibi-mcp",
    );
    symlinkSync(
      path.relative(path.dirname(visibleNodeModules), pnpmPackageRoot),
      visibleNodeModules,
    );

    const result = runLauncher(fixture, [fixture.consumerRoot]);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).label).toBe("pnpm-consumer");
  });

  test("rejects multiple usable workspace roots", () => {
    const fixture = createFixture();
    const second = path.join(fixture.root, "second consumer");
    mkdirSync(path.join(second, ".git"), { recursive: true });
    writeFileSync(
      path.join(second, "package.json"),
      JSON.stringify({
        name: "second-consumer",
        dependencies: { "kibi-mcp": "*" },
      }),
    );
    installFakeMcp(second, "second");

    expect(() =>
      resolveWorkspaceRoot(undefined, {
        cwd: fixture.pluginRoot,
        env: cleanEnv({
          WORKSPACE_FOLDER_PATHS: `${fixture.consumerRoot}:${second}`,
        }),
      }),
    ).toThrow("multiple workspaces");
  });

  test("does not use a plugin-local or ambient/global kibi-mcp", () => {
    const fixture = createFixture();
    rmSync(path.join(fixture.consumerRoot, "node_modules"), {
      recursive: true,
      force: true,
    });
    installFakeMcp(fixture.pluginRoot, "plugin");
    const globalBin = path.join(fixture.root, "global bin");
    mkdirSync(globalBin, { recursive: true });
    writeFileSync(path.join(globalBin, "kibi-mcp"), "#!/bin/sh\nexit 0\n");

    const result = runLauncher(
      fixture,
      [fixture.consumerRoot],
      cleanEnv({ PATH: `${globalBin}:${process.env.PATH ?? ""}` }),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(
      /No project-local kibi-mcp|outside the consumer workspace/,
    );
  });

  test("rejects an ambient NODE_PATH package outside the consumer scope", () => {
    const fixture = createFixture();
    rmSync(path.join(fixture.consumerRoot, "node_modules"), {
      recursive: true,
      force: true,
    });
    const ambientRoot = path.join(fixture.root, "ambient");
    installFakeMcp(ambientRoot, "ambient");

    const result = runLauncher(
      fixture,
      [fixture.consumerRoot],
      cleanEnv({ NODE_PATH: path.join(ambientRoot, "node_modules") }),
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("outside the consumer workspace");
    expect(result.stderr).toContain("ambient NODE_PATH packages");
  });

  test("falls back to cwd only for a demonstrably project-local package", () => {
    const fixture = createFixture();
    const result = spawnSync(process.execPath, [launcherPath], {
      cwd: fixture.consumerRoot,
      env: cleanEnv(),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).cwd).toBe(fixture.consumerRoot);
  });

  test("returns the child failure code", () => {
    const fixture = createFixture();
    const result = runLauncher(fixture, [fixture.consumerRoot, "--exit-7"]);

    expect(result.status).toBe(7);
  });

  test("forwards SIGTERM to the child and returns its termination code", async () => {
    const fixture = createFixture();
    const marker = path.join(fixture.root, "signal marker");
    const ready = path.join(fixture.root, "signal ready");
    const child = spawn(
      process.execPath,
      [launcherPath, fixture.consumerRoot, "--signal-test"],
      {
        cwd: fixture.pluginRoot,
        env: cleanEnv({
          KIBI_LAUNCH_TEST_OUTPUT: marker,
          KIBI_LAUNCH_TEST_READY: ready,
        }),
        stdio: ["ignore", "ignore", "pipe"],
      },
    );
    const stderr: string[] = [];
    child.stderr?.on("data", (chunk) => stderr.push(String(chunk)));

    const deadline = Date.now() + 5_000;
    while (!existsSync(ready) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    expect(existsSync(ready)).toBe(true);
    child.kill("SIGTERM");
    const result = await new Promise<{
      code: number | null;
      signal: NodeJS.Signals | null;
    }>((resolve) =>
      child.once("close", (code, signal) => resolve({ code, signal })),
    );

    expect(result.code).toBe(143);
    expect(result.signal).toBeNull();
    expect(existsSync(marker)).toBe(true);
    expect(stderr.join("")).toBe("");
  });

  test("parses multi-root environment values without treating placeholders as paths", () => {
    expect(parseWorkspaceFolderPaths("${workspaceFolder}")).toEqual([
      "${workspaceFolder}",
    ]);
    expect(parseWorkspaceFolderPaths("/one:/two")).toEqual(["/one", "/two"]);
    expect(parseWorkspaceFolderPaths("/one,/two")).toEqual(["/one", "/two"]);
  });
});
