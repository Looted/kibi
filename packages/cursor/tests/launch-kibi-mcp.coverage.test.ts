import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  launchKibiMcp,
  parseWorkspaceFolderPaths,
  resolveProjectLocalMcp,
  resolveWorkspaceRoot,
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
});
