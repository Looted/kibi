#!/usr/bin/env bun
/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

type BoundaryClassification =
  | "direct-pnpm-exec"
  | "direct-bin-shim"
  | "opencode-config-or-cache"
  | "lockfile-or-install-state"
  | "no-stale-path-observed"
  | "unknown";

type CommandEvidence = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

type ForbiddenStringMatch = {
  path: string;
  forbiddenString: string;
  line: number;
  preview: string;
};

type Evidence = {
  workspace: string;
  timestamp: string;
  packageManager: string | null;
  pnpmWhy: CommandEvidence;
  pnpmList: CommandEvidence;
  nodeResolveKibiMcp: string | null;
  nodeResolveKibiMcpPackageRoot: string | null;
  binShimPath: string | null;
  binShimRealpath: string | null;
  opencodeConfig: unknown;
  vscodeMcpConfig: unknown;
  forbiddenStringMatches: ForbiddenStringMatch[];
  startupChecks: Record<string, CommandEvidence>;
  boundaryClassification: BoundaryClassification;
};

const FORBIDDEN_STRINGS = [
  "kibi-mcp@0.13.0",
  "node_modules/.pnpm/kibi-mcp@0.13.0",
  "/dist/server/session.js",
  "/dist/server/tools.js",
];

function parseArgs(argv: string[]): { workspace: string; out: string } {
  let workspace = process.cwd();
  let out: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--workspace") {
      const value = argv[index + 1];
      if (!value) throw new Error("--workspace requires a path");
      workspace = value;
      index += 1;
      continue;
    }
    if (arg === "--out") {
      const value = argv[index + 1];
      if (!value) throw new Error("--out requires a path");
      out = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!out) throw new Error("--out <file.json> is required");
  return { workspace: resolve(workspace), out: resolve(out) };
}

function runCommand(
  command: string,
  args: string[],
  cwd: string,
): CommandEvidence {
  try {
    const stdout = execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10000,
    });
    return { exitCode: 0, stdout, stderr: "" };
  } catch (error) {
    const err = error as {
      status?: number;
      signal?: string;
      stdout?: Buffer | string;
      stderr?: Buffer | string;
      message: string;
    };
    return {
      exitCode: typeof err.status === "number" ? err.status : 1,
      stdout: bufferToString(err.stdout),
      stderr: bufferToString(err.stderr) || err.message,
    };
  }
}

function bufferToString(value: Buffer | string | undefined): string {
  if (!value) return "";
  return Buffer.isBuffer(value) ? value.toString("utf8") : value;
}

function readJson(path: string): unknown {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return { parseError: String(error), raw: readFileSync(path, "utf8") };
  }
}

function detectPackageManager(workspace: string): string | null {
  if (existsSync(join(workspace, "pnpm-lock.yaml"))) return "pnpm";
  if (
    existsSync(join(workspace, "bun.lockb")) ||
    existsSync(join(workspace, "bun.lock"))
  )
    return "bun";
  if (existsSync(join(workspace, "package-lock.json"))) return "npm";
  if (existsSync(join(workspace, "yarn.lock"))) return "yarn";
  return null;
}

function resolveFromWorkspace(
  workspace: string,
  specifier: string,
): string | null {
  const packageJson = join(workspace, "package.json");
  try {
    const requireFromWorkspace = createRequire(packageJson);
    return requireFromWorkspace.resolve(specifier);
  } catch {
    return null;
  }
}

function getBinShim(workspace: string): {
  path: string | null;
  realpath: string | null;
} {
  const binShimPath = join(workspace, "node_modules/.bin/kibi-mcp");
  try {
    lstatSync(binShimPath);
  } catch {
    return { path: null, realpath: null };
  }

  let realpath: string | null = null;
  try {
    realpath = realpathSync(binShimPath);
  } catch {
    try {
      const stat = lstatSync(binShimPath);
      realpath = stat.isSymbolicLink()
        ? resolve(dirname(binShimPath), readlinkSync(binShimPath))
        : null;
    } catch {
      realpath = null;
    }
  }

  return { path: binShimPath, realpath };
}

function collectScanFiles(workspace: string): string[] {
  const files = [
    join(workspace, "pnpm-lock.yaml"),
    join(workspace, "package.json"),
    join(workspace, "opencode.json"),
    join(workspace, ".vscode/mcp.json"),
    join(workspace, "node_modules/.bin/kibi-mcp"),
  ];
  collectFilesUnder(join(workspace, ".opencode"), files);
  return files.filter((file) => {
    try {
      lstatSync(file);
      return true;
    } catch {
      return false;
    }
  });
}

function collectFilesUnder(path: string, files: string[]): void {
  if (!existsSync(path)) return;
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) return;
  if (stat.isFile()) {
    files.push(path);
    return;
  }
  if (!stat.isDirectory()) return;
  for (const entry of readdirSync(path)) {
    collectFilesUnder(join(path, entry), files);
  }
}

function scanForbiddenStrings(workspace: string): ForbiddenStringMatch[] {
  const matches: ForbiddenStringMatch[] = [];
  for (const file of collectScanFiles(workspace)) {
    let content: string;
    try {
      const stat = lstatSync(file);
      if (stat.isSymbolicLink()) {
        content = readlinkSync(file);
      } else if (stat.isFile()) {
        content = readFileSync(file, "utf8");
      } else {
        continue;
      }
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    for (const forbiddenString of FORBIDDEN_STRINGS) {
      for (const [index, line] of lines.entries()) {
        if (line.includes(forbiddenString)) {
          matches.push({
            path: relative(workspace, file) || basename(file),
            forbiddenString,
            line: index + 1,
            preview: line.trim().slice(0, 240),
          });
        }
      }
    }
  }
  return matches;
}

function startupChecks(workspace: string): Record<string, CommandEvidence> {
  return {
    "direct-pnpm-exec": runCommand("pnpm", ["bin"], workspace),
    "direct-bin-shim": runCommand(
      process.execPath,
      [
        "-e",
        "const fs=require('fs'); const path=require('path'); const p='node_modules/.bin/kibi-mcp'; try { fs.lstatSync(p); console.log(p); try { console.log(fs.realpathSync(p)); } catch { console.log(path.resolve(path.dirname(p), fs.readlinkSync(p))); } } catch { process.exit(2); }",
      ],
      workspace,
    ),
    "node-resolve-kibi-mcp": runCommand(
      process.execPath,
      [
        "-e",
        "const {createRequire}=require('module'); const r=createRequire(process.cwd() + '/package.json'); for (const s of ['kibi-mcp','kibi-mcp/package.json']) { try { console.log(s + '=' + r.resolve(s)); } catch (e) { console.error(s + '=' + e.message); process.exitCode = 1; } }",
      ],
      workspace,
    ),
  };
}

function classify(
  evidence: Omit<Evidence, "boundaryClassification">,
): BoundaryClassification {
  const stale = (value: string | null | undefined) =>
    Boolean(
      value && FORBIDDEN_STRINGS.some((forbidden) => value.includes(forbidden)),
    );

  if (stale(evidence.startupChecks["direct-pnpm-exec"]?.stdout)) {
    return "direct-pnpm-exec";
  }
  if (
    stale(evidence.binShimRealpath) ||
    stale(evidence.startupChecks["direct-bin-shim"]?.stdout)
  ) {
    return "direct-bin-shim";
  }
  if (
    evidence.forbiddenStringMatches.some(
      (match) =>
        match.path === "opencode.json" || match.path.startsWith(".opencode/"),
    )
  ) {
    return "opencode-config-or-cache";
  }
  if (
    evidence.forbiddenStringMatches.some(
      (match) =>
        match.path === "pnpm-lock.yaml" || match.path === "package.json",
    ) ||
    stale(evidence.nodeResolveKibiMcp) ||
    stale(evidence.nodeResolveKibiMcpPackageRoot)
  ) {
    return "lockfile-or-install-state";
  }
  if (evidence.forbiddenStringMatches.length === 0)
    return "no-stale-path-observed";
  return "unknown";
}

function capture(workspace: string): Evidence {
  const checks = startupChecks(workspace);
  const binShim = getBinShim(workspace);
  const partial = {
    workspace,
    timestamp: new Date().toISOString(),
    packageManager: detectPackageManager(workspace),
    pnpmWhy: runCommand("pnpm", ["why", "kibi-mcp"], workspace),
    pnpmList: runCommand(
      "pnpm",
      ["list", "kibi-mcp", "--depth", "0"],
      workspace,
    ),
    nodeResolveKibiMcp: resolveFromWorkspace(workspace, "kibi-mcp"),
    nodeResolveKibiMcpPackageRoot: resolveFromWorkspace(
      workspace,
      "kibi-mcp/package.json",
    ),
    binShimPath: binShim.path,
    binShimRealpath: binShim.realpath,
    opencodeConfig: readJson(join(workspace, "opencode.json")),
    vscodeMcpConfig: readJson(join(workspace, ".vscode/mcp.json")),
    forbiddenStringMatches: scanForbiddenStrings(workspace),
    startupChecks: checks,
  } satisfies Omit<Evidence, "boundaryClassification">;

  return { ...partial, boundaryClassification: classify(partial) };
}

function main(): void {
  try {
    const { workspace, out } = parseArgs(process.argv.slice(2));
    const evidence = capture(workspace);
    writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

export { capture, classify, parseArgs };
