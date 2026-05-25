import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
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

describe("MCP startup resolution diagnostics", () => {
  test("reads running package info from an entrypoint URL", () => {
    const running = readRunningPackageInfo(
      pathToFileURL(path.resolve(import.meta.dir, "../../src/server.ts")).href,
    );

    expect(running.version).toBe("0.14.0");
    expect(running.packageRoot).toBe(path.resolve(import.meta.dir, "../.."));
    expect(running.entrypoint).toBe(
      path.resolve(import.meta.dir, "../../src/server.ts"),
    );
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
    expect(resolution.running?.version).toBe("0.14.0");
    expect(resolution.running?.entrypoint).toBeString();
    expect(resolution).toHaveProperty("projectLocal");
    expect(resolution).toHaveProperty("stale");
  });
});
