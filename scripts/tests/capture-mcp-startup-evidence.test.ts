/// <reference types="bun-types" />

/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../capture-mcp-startup-evidence.ts",
);

const tempRoots: string[] = [];

function makeWorkspace(): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-mcp-evidence-"));
  tempRoots.push(root);
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "consumer",
      devDependencies: { "kibi-mcp": "0.14.0" },
    }),
    "utf8",
  );
  return root;
}

function runEvidence(workspace: string): Record<string, unknown> {
  const out = join(workspace, "evidence.json");
  execFileSync(
    "bun",
    ["run", SCRIPT_PATH, "--workspace", workspace, "--out", out],
    {
      cwd: workspace,
      stdio: "pipe",
    },
  );
  return JSON.parse(readFileSync(out, "utf8"));
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

describe("capture-mcp-startup-evidence", () => {
  test("classifies stale paths in opencode config as opencode-config-or-cache", () => {
    const workspace = makeWorkspace();
    writeFileSync(
      join(workspace, "opencode.json"),
      JSON.stringify({
        mcp: {
          kibi: {
            type: "local",
            command: [
              "node",
              "node_modules/.pnpm/kibi-mcp@0.13.0/node_modules/kibi-mcp/dist/server.js",
            ],
          },
        },
      }),
      "utf8",
    );

    const evidence = runEvidence(workspace);

    expect(evidence.workspace).toBe(workspace);
    expect(evidence.boundaryClassification).toBe("opencode-config-or-cache");
    expect(evidence.forbiddenStringMatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "opencode.json",
          forbiddenString: "node_modules/.pnpm/kibi-mcp@0.13.0",
        }),
      ]),
    );
    expect(Object.keys(evidence)).toEqual(
      expect.arrayContaining([
        "workspace",
        "timestamp",
        "packageManager",
        "pnpmWhy",
        "pnpmList",
        "nodeResolveKibiMcp",
        "nodeResolveKibiMcpPackageRoot",
        "binShimPath",
        "binShimRealpath",
        "opencodeConfig",
        "vscodeMcpConfig",
        "forbiddenStringMatches",
        "startupChecks",
        "boundaryClassification",
      ]),
    );
  });

  test("classifies stale node_modules bin shim target as direct-bin-shim", () => {
    const workspace = makeWorkspace();
    const target = join(
      workspace,
      "node_modules/.pnpm/kibi-mcp@0.13.0/node_modules/kibi-mcp/dist/server.js",
    );
    const shim = join(workspace, "node_modules/.bin/kibi-mcp");
    mkdirSync(join(workspace, "node_modules/.bin"), { recursive: true });
    symlinkSync(target, shim);

    const evidence = runEvidence(workspace);

    expect(evidence.boundaryClassification).toBe("direct-bin-shim");
    expect(evidence.binShimPath).toBe(shim);
    expect(String(evidence.binShimRealpath)).toContain("kibi-mcp@0.13.0");
  });

  test("requires --out", () => {
    const workspace = makeWorkspace();

    expect(() =>
      execFileSync("bun", ["run", SCRIPT_PATH, "--workspace", workspace], {
        cwd: workspace,
        stdio: "pipe",
      }),
    ).toThrow();
    expect(existsSync(join(workspace, "evidence.json"))).toBe(false);
  });
});
