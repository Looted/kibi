// implements REQ-cursor-kibi-plugin-v1
import { afterEach, describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  hasConsumerNodeModulesLink,
  hasDeclaredProjectDependency,
  isLaunchEntrypoint,
  isProjectScopedPackage,
  launchKibiMcp,
  packageJsonForResolvedFile,
  parseWorkspaceFolderPaths,
  resolveProjectLocalMcp,
  resolveWorkspaceRoot,
  runLaunchEntrypoint,
  runLaunchIfEntrypoint,
  signalExitCode,
} from "../bin/launch-kibi-mcp.mjs";

const fixtureRoots: string[] = [];

function createRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-launch-cov-"));
  fixtureRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
  process.exitCode = 0;
});

describe("launch-kibi-mcp remaining branches", () => {
  test("parseWorkspaceFolderPaths accepts JSON arrays and malformed JSON", () => {
    expect(parseWorkspaceFolderPaths("")).toEqual([]);
    expect(parseWorkspaceFolderPaths("   ")).toEqual([]);
    expect(parseWorkspaceFolderPaths('["/one","/two"]')).toEqual([
      "/one",
      "/two",
    ]);
    expect(parseWorkspaceFolderPaths("[1,2]")).toEqual([]);
    expect(parseWorkspaceFolderPaths("[not-json")).toEqual(["[not-json"]);
  });

  test("resolveProjectLocalMcp covers bin shapes and missing files", () => {
    const root = createRoot();
    mkdirSync(path.join(root, ".git"), { recursive: true });
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ name: "consumer", dependencies: { "kibi-mcp": "*" } }),
    );

    expect(() => resolveProjectLocalMcp(root)).toThrow("No project-local");

    const pkg = path.join(root, "node_modules", "kibi-mcp");
    mkdirSync(pkg, { recursive: true });
    writeFileSync(path.join(pkg, "package.json"), "{not json");
    expect(() => resolveProjectLocalMcp(root)).toThrow("No project-local");

    writeFileSync(
      path.join(pkg, "package.json"),
      JSON.stringify({ name: "kibi-mcp", version: "1.0.0" }),
    );
    expect(() => resolveProjectLocalMcp(root)).toThrow("does not declare");

    writeFileSync(
      path.join(pkg, "package.json"),
      JSON.stringify({
        name: "kibi-mcp",
        version: "1.0.0",
        bin: { "kibi-mcp": "bin/missing.mjs" },
      }),
    );
    expect(() => resolveProjectLocalMcp(root)).toThrow("missing executable");

    mkdirSync(path.join(pkg, "bin"), { recursive: true });
    writeFileSync(path.join(pkg, "bin", "kibi-mcp.mjs"), "export {}\n");
    writeFileSync(
      path.join(pkg, "package.json"),
      JSON.stringify({
        name: "kibi-mcp",
        version: "1.0.0",
        bin: "bin/kibi-mcp.mjs",
      }),
    );
    const resolved = resolveProjectLocalMcp(root);
    expect(resolved.binPath).toContain("kibi-mcp.mjs");
  });

  test("resolveWorkspaceRoot uses CURSOR_WORKSPACE and json folder lists", () => {
    const root = createRoot();
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "consumer",
        optionalDependencies: { "kibi-mcp": "*" },
      }),
    );
    const pkg = path.join(root, "node_modules", "kibi-mcp");
    mkdirSync(path.join(pkg, "bin"), { recursive: true });
    writeFileSync(
      path.join(pkg, "package.json"),
      JSON.stringify({
        name: "kibi-mcp",
        version: "1.0.0",
        bin: { "kibi-mcp": "bin/kibi-mcp.mjs" },
      }),
    );
    writeFileSync(path.join(pkg, "bin", "kibi-mcp.mjs"), "export {}\n");

    expect(
      resolveWorkspaceRoot("${workspaceFolder}", {
        cwd: path.join(root, "plugin"),
        env: { CURSOR_WORKSPACE: root },
      }),
    ).toBe(path.resolve(root));

    expect(
      resolveWorkspaceRoot(undefined, {
        cwd: path.join(root, "plugin"),
        env: { WORKSPACE_FOLDER_PATHS: JSON.stringify([root]) },
      }),
    ).toBe(path.resolve(root));
  });

  test("launchKibiMcp returns 1 when the workspace cannot be resolved", async () => {
    const empty = createRoot();
    const previousCwd = process.cwd();
    process.chdir(empty);
    try {
      const code = await launchKibiMcp(["/no-such-kibi-workspace"], {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
      });
      expect(code).toBe(1);
    } finally {
      process.chdir(previousCwd);
    }
  });

  test("launchKibiMcp starts the project-local bin and returns its exit code", async () => {
    const root = createRoot();
    mkdirSync(path.join(root, ".git"), { recursive: true });
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ name: "consumer", dependencies: { "kibi-mcp": "*" } }),
    );
    const pkg = path.join(root, "node_modules", "kibi-mcp");
    mkdirSync(path.join(pkg, "bin"), { recursive: true });
    writeFileSync(
      path.join(pkg, "package.json"),
      JSON.stringify({
        name: "kibi-mcp",
        version: "1.0.0",
        type: "module",
        bin: { "kibi-mcp": "bin/kibi-mcp.mjs" },
      }),
    );
    writeFileSync(
      path.join(pkg, "bin", "kibi-mcp.mjs"),
      "process.exit(11);\n",
    );
    const code = await launchKibiMcp([root], {
      ...process.env,
      WORKSPACE_FOLDER_PATHS: undefined,
      KIBI_WORKSPACE: undefined,
      CURSOR_WORKSPACE: undefined,
    });
    expect(code).toBe(11);
  });

  test("resolveWorkspaceRoot accepts KIBI_WORKSPACE, comma lists, and cwd project markers", () => {
    const root = createRoot();
    mkdirSync(path.join(root, ".git"), { recursive: true });
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "consumer",
        peerDependencies: { "kibi-mcp": "*" },
      }),
    );
    const pkg = path.join(root, "node_modules", "kibi-mcp");
    mkdirSync(path.join(pkg, "bin"), { recursive: true });
    writeFileSync(
      path.join(pkg, "package.json"),
      JSON.stringify({
        name: "kibi-mcp",
        version: "1.0.0",
        bin: { "kibi-mcp": "bin/kibi-mcp.mjs" },
      }),
    );
    writeFileSync(path.join(pkg, "bin", "kibi-mcp.mjs"), "export {}\n");

    expect(
      resolveWorkspaceRoot("${workspaceFolder}", {
        cwd: path.join(root, "plugin"),
        env: { KIBI_WORKSPACE: root },
      }),
    ).toBe(path.resolve(root));

    expect(
      resolveWorkspaceRoot(undefined, {
        cwd: path.join(root, "plugin"),
        env: { WORKSPACE_FOLDER_PATHS: `${root},/definitely-missing` },
      }),
    ).toBe(path.resolve(root));

    expect(
      resolveWorkspaceRoot(undefined, {
        cwd: root,
        env: {},
      }),
    ).toBe(path.resolve(root));

    const other = createRoot();
    mkdirSync(path.join(other, ".git"), { recursive: true });
    writeFileSync(
      path.join(other, "package.json"),
      JSON.stringify({ name: "other", dependencies: { "kibi-mcp": "*" } }),
    );
    const otherPkg = path.join(other, "node_modules", "kibi-mcp");
    mkdirSync(path.join(otherPkg, "bin"), { recursive: true });
    writeFileSync(
      path.join(otherPkg, "package.json"),
      JSON.stringify({
        name: "kibi-mcp",
        version: "1.0.0",
        bin: { "kibi-mcp": "bin/kibi-mcp.mjs" },
      }),
    );
    writeFileSync(path.join(otherPkg, "bin", "kibi-mcp.mjs"), "export {}\n");
    expect(() =>
      resolveWorkspaceRoot(undefined, {
        cwd: path.join(root, "plugin"),
        env: { WORKSPACE_FOLDER_PATHS: JSON.stringify([root, other]) },
      }),
    ).toThrow("multiple workspaces");
  });

  test("malformed consumer package.json still fails closed without a local MCP", () => {
    const root = createRoot();
    mkdirSync(path.join(root, ".git"), { recursive: true });
    writeFileSync(path.join(root, "package.json"), "{not-json");
    expect(() =>
      resolveWorkspaceRoot(undefined, {
        cwd: root,
        env: {},
      }),
    ).toThrow(/Unable to determine a consumer workspace/);
  });

  test("launchKibiMcp maps child signal exits", async () => {
    const root = createRoot();
    mkdirSync(path.join(root, ".git"), { recursive: true });
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ name: "consumer", dependencies: { "kibi-mcp": "*" } }),
    );
    const pkg = path.join(root, "node_modules", "kibi-mcp");
    mkdirSync(path.join(pkg, "bin"), { recursive: true });
    writeFileSync(
      path.join(pkg, "package.json"),
      JSON.stringify({
        name: "kibi-mcp",
        version: "1.0.0",
        type: "module",
        bin: { "kibi-mcp": "bin/kibi-mcp.mjs" },
      }),
    );
    writeFileSync(
      path.join(pkg, "bin", "kibi-mcp.mjs"),
      "process.kill(process.pid, 'SIGTERM');\n",
    );
    const code = await launchKibiMcp([root], {
      ...process.env,
      WORKSPACE_FOLDER_PATHS: undefined,
      KIBI_WORKSPACE: undefined,
      CURSOR_WORKSPACE: undefined,
    });
    expect(code).toBe(143);
  });

  test("packageJsonForResolvedFile walks files, skips malformed parents, and returns null", () => {
    const root = createRoot();
    mkdirSync(path.join(root, "nested"), { recursive: true });
    writeFileSync(path.join(root, "nested", "package.json"), "{not-json");
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ name: "kibi-mcp", version: "1.0.0" }),
    );
    const nestedFile = path.join(root, "nested", "index.js");
    writeFileSync(nestedFile, "export {}\n");
    expect(packageJsonForResolvedFile(nestedFile)?.packageRoot).toBe(
      path.resolve(root),
    );
    const lonely = createRoot();
    writeFileSync(
      path.join(lonely, "package.json"),
      JSON.stringify({ name: "other" }),
    );
    expect(packageJsonForResolvedFile(path.join(lonely, "index.js"))).toBeNull();
  });

  test("project-scope helpers reject broken links and honor PnP", () => {
    const workspace = createRoot();
    const outside = createRoot();
    mkdirSync(path.join(workspace, "node_modules"), { recursive: true });
    symlinkSync(
      path.join(outside, "missing-target"),
      path.join(workspace, "node_modules", "kibi-mcp"),
    );
    expect(
      hasConsumerNodeModulesLink(workspace, outside),
    ).toBe(false);

    writeFileSync(
      path.join(workspace, "package.json"),
      JSON.stringify({ name: "consumer", dependencies: { "kibi-mcp": "*" } }),
    );
    expect(hasDeclaredProjectDependency(workspace)).toBe(true);
    writeFileSync(path.join(workspace, "package.json"), "{not-json");
    expect(hasDeclaredProjectDependency(workspace)).toBe(false);

    const previousPnp = Object.getOwnPropertyDescriptor(process.versions, "pnp");
    Object.defineProperty(process.versions, "pnp", {
      configurable: true,
      value: "1",
    });
    try {
      expect(isProjectScopedPackage(workspace, outside)).toBe(true);
    } finally {
      if (previousPnp) {
        Object.defineProperty(process.versions, "pnp", previousPnp);
      } else {
        delete (process.versions as { pnp?: string }).pnp;
      }
    }
  });

  test("resolveProjectLocalMcp rejects an ambient parent-node_modules package", () => {
    const parent = createRoot();
    const workspace = path.join(parent, "workspace");
    mkdirSync(workspace, { recursive: true });
    mkdirSync(path.join(workspace, ".git"), { recursive: true });
    writeFileSync(
      path.join(workspace, "package.json"),
      JSON.stringify({ name: "consumer" }),
    );
    const pkg = path.join(parent, "node_modules", "kibi-mcp");
    mkdirSync(path.join(pkg, "bin"), { recursive: true });
    writeFileSync(
      path.join(pkg, "package.json"),
      JSON.stringify({
        name: "kibi-mcp",
        version: "1.0.0",
        bin: { "kibi-mcp": "bin/kibi-mcp.mjs" },
      }),
    );
    writeFileSync(path.join(pkg, "bin", "kibi-mcp.mjs"), "export {}\n");
    expect(() => resolveProjectLocalMcp(workspace)).toThrow("outside the consumer");
  });

  test("usable workspace lists skip directories that cannot resolve MCP", () => {
    const valid = createRoot();
    mkdirSync(path.join(valid, ".git"), { recursive: true });
    writeFileSync(
      path.join(valid, "package.json"),
      JSON.stringify({ name: "consumer", dependencies: { "kibi-mcp": "*" } }),
    );
    const pkg = path.join(valid, "node_modules", "kibi-mcp");
    mkdirSync(path.join(pkg, "bin"), { recursive: true });
    writeFileSync(
      path.join(pkg, "package.json"),
      JSON.stringify({
        name: "kibi-mcp",
        version: "1.0.0",
        bin: { "kibi-mcp": "bin/kibi-mcp.mjs" },
      }),
    );
    writeFileSync(path.join(pkg, "bin", "kibi-mcp.mjs"), "export {}\n");
    const empty = createRoot();
    expect(
      resolveWorkspaceRoot(undefined, {
        cwd: path.join(valid, "plugin"),
        env: { WORKSPACE_FOLDER_PATHS: JSON.stringify([empty, valid]) },
      }),
    ).toBe(path.resolve(valid));
  });

  test("launchKibiMcp reports a child start error when the bin is a directory", async () => {
    const root = createRoot();
    mkdirSync(path.join(root, ".git"), { recursive: true });
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ name: "consumer", dependencies: { "kibi-mcp": "*" } }),
    );
    const pkg = path.join(root, "node_modules", "kibi-mcp");
    mkdirSync(path.join(pkg, "bin", "kibi-mcp.mjs"), { recursive: true });
    writeFileSync(
      path.join(pkg, "package.json"),
      JSON.stringify({
        name: "kibi-mcp",
        version: "1.0.0",
        bin: { "kibi-mcp": "bin/kibi-mcp.mjs" },
      }),
    );
    const code = await launchKibiMcp([root], {
      ...process.env,
      WORKSPACE_FOLDER_PATHS: undefined,
      KIBI_WORKSPACE: undefined,
      CURSOR_WORKSPACE: undefined,
    });
    expect(code).toBe(1);
  });

  function writeProjectLocal(root: string): void {
    mkdirSync(path.join(root, ".git"), { recursive: true });
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ name: "consumer", dependencies: { "kibi-mcp": "*" } }),
    );
    const pkg = path.join(root, "node_modules", "kibi-mcp");
    mkdirSync(path.join(pkg, "bin"), { recursive: true });
    writeFileSync(
      path.join(pkg, "package.json"),
      JSON.stringify({
        name: "kibi-mcp",
        version: "1.0.0",
        type: "module",
        bin: { "kibi-mcp": "bin/kibi-mcp.mjs" },
      }),
    );
    writeFileSync(path.join(pkg, "bin", "kibi-mcp.mjs"), "export {}\n");
  }

  test("forwards host signals, start errors, and null close codes", async () => {
    const root = createRoot();
    writeProjectLocal(root);

    const signaled = new EventEmitter() as EventEmitter & {
      killed: boolean;
      kill: (signal: string) => void;
    };
    signaled.killed = false;
    signaled.kill = (signal: string) => {
      signaled.killed = true;
      signaled.emit("close", null, signal);
    };
    const signaledExit = launchKibiMcp(
      [root],
      {
        ...process.env,
        WORKSPACE_FOLDER_PATHS: undefined,
        KIBI_WORKSPACE: undefined,
        CURSOR_WORKSPACE: undefined,
      },
      () => signaled,
    );
    process.emit("SIGTERM");
    expect(await signaledExit).toBe(143);

    const errored = new EventEmitter() as EventEmitter & {
      killed: boolean;
      kill: () => void;
    };
    errored.killed = false;
    errored.kill = () => {};
    const errorExit = launchKibiMcp(
      [root],
      {
        ...process.env,
        WORKSPACE_FOLDER_PATHS: undefined,
        KIBI_WORKSPACE: undefined,
        CURSOR_WORKSPACE: undefined,
      },
      () => {
        queueMicrotask(() => errored.emit("error", new Error("boom")));
        return errored;
      },
    );
    expect(await errorExit).toBe(1);

    const closed = new EventEmitter() as EventEmitter & {
      killed: boolean;
      kill: () => void;
    };
    closed.killed = false;
    closed.kill = () => {};
    const nullClose = launchKibiMcp(
      [root],
      {
        ...process.env,
        WORKSPACE_FOLDER_PATHS: undefined,
        KIBI_WORKSPACE: undefined,
        CURSOR_WORKSPACE: undefined,
      },
      () => {
        queueMicrotask(() => closed.emit("close", null, null));
        return closed;
      },
    );
    expect(await nullClose).toBe(1);

    const previousPlatform = Object.getOwnPropertyDescriptor(process, "platform");
    Object.defineProperty(process, "platform", {
      configurable: true,
      value: "win32",
    });
    try {
      const winChild = new EventEmitter() as EventEmitter & {
        killed: boolean;
        kill: () => void;
      };
      winChild.killed = false;
      winChild.kill = () => {};
      const winExit = launchKibiMcp(
        [root],
        {
          ...process.env,
          WORKSPACE_FOLDER_PATHS: undefined,
          KIBI_WORKSPACE: undefined,
          CURSOR_WORKSPACE: undefined,
        },
        () => {
          queueMicrotask(() => winChild.emit("close", 0, null));
          return winChild;
        },
      );
      expect(await winExit).toBe(0);
    } finally {
      if (previousPlatform) {
        Object.defineProperty(process, "platform", previousPlatform);
      }
    }
  });

  test("launch helpers classify entrypoints, signals, and non-Error resolve failures", async () => {
    expect(signalExitCode("SIGINT")).toBe(130);
    expect(signalExitCode("NOPE")).toBe(1);
    const launchUrl = new URL("../bin/launch-kibi-mcp.mjs", import.meta.url);
    expect(isLaunchEntrypoint(fileURLToPath(launchUrl), launchUrl.href)).toBe(
      true,
    );
    expect(isLaunchEntrypoint(undefined, import.meta.url)).toBe(false);

    const empty = createRoot();
    const previousCwd = process.cwd();
    const previousExit = process.exitCode;
    process.chdir(empty);
    try {
      expect(await runLaunchEntrypoint(["/no-such-kibi-workspace"])).toBe(1);
    } finally {
      process.chdir(previousCwd);
      process.exitCode = previousExit;
    }

    expect(packageJsonForResolvedFile("/")).toBeNull();
    let started = 0;
    await runLaunchIfEntrypoint(false, async () => {
      started += 1;
    });
    expect(started).toBe(0);
    await runLaunchIfEntrypoint(true, async () => {
      started += 1;
    });
    expect(started).toBe(1);
  });
});
