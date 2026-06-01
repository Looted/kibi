import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  compareMcpResolution,
  formatResolutionJson,
  readRunningPackageInfo,
  resolveProjectLocalMcp,
} from "../../src/startup-resolution";

// Read the actual package version at test time so version bumps don't break tests.
const pkg = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { version: string };
const runningVersion = pkg.version;

function makePackage(root: string, version: string): string {
  const packageRoot = path.join(root, "node_modules", "kibi-mcp");
  const distRoot = path.join(packageRoot, "dist");
  mkdirSync(distRoot, { recursive: true });
  writeFileSync(
    path.join(packageRoot, "package.json"),
    JSON.stringify(
      {
        name: "kibi-mcp",
        version,
        type: "module",
        main: "./dist/server.js",
        exports: { ".": "./dist/server.js" },
      },
      null,
      2,
    ),
  );
  const entrypoint = path.join(distRoot, "server.js");
  writeFileSync(entrypoint, "export async function startServer() {}\n");
  return entrypoint;
}

function makePackageWithName(root: string, name: string, version: string): string {
  const packageRoot = path.join(root, "node_modules", name);
  const distRoot = path.join(packageRoot, "dist");
  mkdirSync(distRoot, { recursive: true });
  writeFileSync(
    path.join(packageRoot, "package.json"),
    JSON.stringify(
      {
        name,
        version,
        type: "module",
        main: "./dist/server.js",
        exports: { ".": "./dist/server.js" },
      },
      null,
      2,
    ),
  );
  const entrypoint = path.join(distRoot, "server.js");
  writeFileSync(entrypoint, "export async function startServer() {}\n");
  return entrypoint;
}

describe("MCP startup resolution diagnostics", () => {
  test("reads running package info from an entrypoint URL", () => {
    const running = readRunningPackageInfo(
      pathToFileURL(path.resolve(import.meta.dir, "../../src/server.ts")).href,
    );

    expect(running.version).toBe(runningVersion);
    expect(running.packageRoot).toBe(path.resolve(import.meta.dir, "../.."));
    expect(running.entrypoint).toBe(
      path.resolve(import.meta.dir, "../../src/server.ts"),
    );
  });

  test("reads running package info from a non-file entrypoint path", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-non-file-"));
    try {
      const entrypoint = makePackage(cwd, "0.14.0");

      expect(readRunningPackageInfo(entrypoint)).toEqual({
        packageRoot: path.join(cwd, "node_modules", "kibi-mcp"),
        version: "0.14.0",
        entrypoint,
      });
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("throws when no package.json exists above the entrypoint", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-no-package-"));
    try {
      const entrypoint = path.join(cwd, "dist", "server.js");
      mkdirSync(path.dirname(entrypoint), { recursive: true });
      writeFileSync(entrypoint, "export async function startServer() {}\n");

      expect(() => readRunningPackageInfo(entrypoint)).toThrow(
        `Unable to find package.json for ${entrypoint}`,
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("throws when the entrypoint package name is not kibi-mcp", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-wrong-name-"));
    try {
      const entrypoint = makePackageWithName(cwd, "not-kibi-mcp", "0.14.0");

      expect(() => readRunningPackageInfo(pathToFileURL(entrypoint).href)).toThrow(
        `Resolved package not-kibi-mcp for ${entrypoint}; expected kibi-mcp`,
      );
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("detects stale running package when project-local package differs", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-resolution-"));
    try {
      const entrypoint = makePackage(cwd, "0.14.0");
      writeFileSync(path.join(cwd, "package.json"), '{"private":true}\n');

      const projectLocal = resolveProjectLocalMcp(cwd);
      expect(projectLocal).toEqual({
        packageRoot: path.join(cwd, "node_modules", "kibi-mcp"),
        version: "0.14.0",
        entrypoint,
      });

      const comparison = compareMcpResolution(
        {
          packageRoot: "/tmp/stale/node_modules/kibi-mcp",
          version: "0.13.0",
          entrypoint: "/tmp/stale/node_modules/kibi-mcp/dist/server.js",
        },
        projectLocal,
      );

      expect(comparison.stale).toBe(true);
      expect(comparison.reason).toContain("version mismatch");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("returns null when no project-local kibi-mcp package is installed", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-no-local-"));
    try {
      writeFileSync(path.join(cwd, "package.json"), '{"private":true}\n');
      expect(resolveProjectLocalMcp(cwd)).toBeNull();
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("returns null when project-local package resolution throws a non-module error", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-bad-local-"));
    try {
      const packageRoot = path.join(cwd, "node_modules", "kibi-mcp");
      mkdirSync(packageRoot, { recursive: true });
      writeFileSync(path.join(cwd, "package.json"), '{"private":true}\n');
      writeFileSync(path.join(packageRoot, "package.json"), "{not json\n");

      expect(resolveProjectLocalMcp(cwd)).toBeNull();
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("falls back to realpathSync when native realpath is unavailable", () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-realpath-"));
    const nativeRealpath = realpathSync.native;
    try {
      const entrypoint = makePackage(cwd, "0.14.0");
      writeFileSync(path.join(cwd, "package.json"), '{"private":true}\n');
      Object.defineProperty(realpathSync, "native", {
        configurable: true,
        value: undefined,
      });

      expect(resolveProjectLocalMcp(cwd)).toEqual({
        packageRoot: path.join(cwd, "node_modules", "kibi-mcp"),
        version: "0.14.0",
        entrypoint,
      });
    } finally {
      Object.defineProperty(realpathSync, "native", {
        configurable: true,
        value: nativeRealpath,
      });
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("compares null project-local resolution as not stale", () => {
    const comparison = compareMcpResolution(
      {
        packageRoot: "/tmp/running/node_modules/kibi-mcp",
        version: "0.14.0",
        entrypoint: "/tmp/running/node_modules/kibi-mcp/dist/server.js",
      },
      null,
    );

    expect(comparison).toEqual({
      stale: false,
      reason: "no project-local kibi-mcp resolved",
      forbiddenVersionObserved: false,
    });
  });

  test("reports stale resolution for version mismatches", () => {
    const comparison = compareMcpResolution(
      {
        packageRoot: "/tmp/running/node_modules/kibi-mcp",
        version: "0.14.0",
        entrypoint: "/tmp/running/node_modules/kibi-mcp/dist/server.js",
      },
      {
        packageRoot: "/tmp/project/node_modules/kibi-mcp",
        version: "0.15.0",
        entrypoint: "/tmp/project/node_modules/kibi-mcp/dist/server.js",
      },
    );

    expect(comparison).toEqual({
      stale: true,
      reason: "version mismatch: running 0.14.0, project-local 0.15.0",
      forbiddenVersionObserved: false,
    });
  });

  test("reports stale resolution for package root mismatches", () => {
    const comparison = compareMcpResolution(
      {
        packageRoot: "/tmp/running/node_modules/kibi-mcp",
        version: "0.14.0",
        entrypoint: "/tmp/running/node_modules/kibi-mcp/dist/server.js",
      },
      {
        packageRoot: "/tmp/project/node_modules/kibi-mcp",
        version: "0.14.0",
        entrypoint: "/tmp/project/node_modules/kibi-mcp/dist/server.js",
      },
    );

    expect(comparison).toEqual({
      stale: true,
      reason:
        "package root mismatch: running /tmp/running/node_modules/kibi-mcp, project-local /tmp/project/node_modules/kibi-mcp",
      forbiddenVersionObserved: false,
    });
  });

  test("reports not stale when running and project-local packages match", () => {
    const packageRoot = "/tmp/project/node_modules/kibi-mcp";
    const entrypoint = "/tmp/project/node_modules/kibi-mcp/dist/server.js";
    const comparison = compareMcpResolution(
      { packageRoot, version: "0.14.0", entrypoint },
      { packageRoot, version: "0.14.0", entrypoint },
    );

    expect(comparison).toEqual({
      stale: false,
      reason: "running kibi-mcp matches project-local kibi-mcp",
      forbiddenVersionObserved: false,
    });
  });

  test("reports forbidden 0.13.0 version strings", () => {
    const comparison = compareMcpResolution(
      {
        packageRoot:
          "/tmp/node_modules/.pnpm/kibi-mcp@0.13.0/node_modules/kibi-mcp",
        version: "0.13.0",
        entrypoint:
          "/tmp/node_modules/.pnpm/kibi-mcp@0.13.0/node_modules/kibi-mcp/dist/server.js",
      },
      {
        packageRoot: "/tmp/project/node_modules/kibi-mcp",
        version: "0.14.0",
        entrypoint: "/tmp/project/node_modules/kibi-mcp/dist/server.js",
      },
    );

    expect(comparison.forbiddenVersionObserved).toBe(true);
  });

  test("formats resolution as stable JSON", () => {
    const json = formatResolutionJson({
      packageName: "kibi-mcp",
      cwd: "/tmp/project",
      running: {
        packageRoot: "/tmp/running/kibi-mcp",
        version: "0.14.0",
        entrypoint: "/tmp/running/kibi-mcp/dist/server.js",
      },
      projectLocal: null,
      stale: false,
      reason: "no project-local kibi-mcp resolved",
      forbiddenVersionObserved: false,
    });

    expect(JSON.parse(json)).toEqual({
      packageName: "kibi-mcp",
      cwd: "/tmp/project",
      running: {
        packageRoot: "/tmp/running/kibi-mcp",
        version: "0.14.0",
        entrypoint: "/tmp/running/kibi-mcp/dist/server.js",
      },
      projectLocal: null,
      stale: false,
      reason: "no project-local kibi-mcp resolved",
      forbiddenVersionObserved: false,
    });
    expect(json.endsWith("\n")).toBe(true);
    expect(json).toBe(`${JSON.stringify(JSON.parse(json), null, 2)}\n`);
  });

  test("--print-resolution produces valid JSON", () => {
    const result = spawnSync(
      "node",
      [
        path.resolve(import.meta.dir, "../../bin/kibi-mcp"),
        "--print-resolution",
      ],
      { cwd: path.resolve(import.meta.dir, "../../.."), encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    const resolution = JSON.parse(result.stdout) as {
      packageName?: string;
      running?: { version?: string; entrypoint?: string };
      projectLocal?: unknown;
      stale?: unknown;
    };
    expect(resolution.packageName).toBe("kibi-mcp");
    expect(resolution.running?.version).toBe(runningVersion);
    expect(resolution.running?.entrypoint).toBeString();
    expect(resolution).toHaveProperty("projectLocal");
    expect(resolution).toHaveProperty("stale");
  });
});
