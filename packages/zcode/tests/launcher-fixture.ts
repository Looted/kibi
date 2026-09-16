// implements REQ-zcode-kibi-plugin-v1
// Shared workspace/fixture helpers for launcher tests. These build a real
// opt-in workspace with an installable fake `kibi-mcp` package so launcher
// tests exercise genuine process launches instead of mocked spawns.
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const FIXTURE_SERVER_NAME = "kibi-mcp-fixture";

export const FIXTURE_ENTRY_SCRIPT = `\
const fs = require("node:fs");
const sentinel = process.env.KIBI_FIXTURE_SENTINEL;
if (process.argv.includes("--print-resolution")) {
  process.stdout.write(JSON.stringify({ ok: true }) + "\\n");
  process.exit(process.env.KIBI_FIXTURE_PRINT_EXIT
    ? Number(process.env.KIBI_FIXTURE_PRINT_EXIT)
    : 0);
}
if (sentinel) fs.writeFileSync(sentinel, "launched");
if (process.env.KIBI_FIXTURE_MCP_EXIT) {
  process.stdout.write("fixture asked to fail\\n");
  process.exit(Number(process.env.KIBI_FIXTURE_MCP_EXIT));
}
let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  for (;;) {
    const newline = buffer.indexOf("\\n");
    if (newline < 0) break;
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    if (!line.trim()) continue;
    let message;
    try { message = JSON.parse(line); } catch { continue; }
    if (message.id === undefined || message.id === null) continue;
    let result;
    if (message.method === "initialize") {
      result = {
        protocolVersion: "2025-06-18",
        capabilities: {},
        serverInfo: { name: "${FIXTURE_SERVER_NAME}", version: "1.0.0" },
      };
    } else if (message.method === "ping") {
      result = {};
    } else if (message.method === "tools/list") {
      result = { tools: [{ name: "kb_search" }] };
    } else {
      process.stdout.write(JSON.stringify({
        jsonrpc: "2.0", id: message.id,
        error: { code: -32601, message: "method not found" },
      }) + "\\n");
      continue;
    }
    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0", id: message.id, result,
    }) + "\\n");
  }
});
process.stdin.on("end", () => process.exit(0));
`;

export type FixtureWorkspace = {
  /** The mkdtemp base directory — safe to rm -rf. */
  base: string;
  workspaceRoot: string;
  entryPath: string | undefined;
  packageRoot: string | undefined;
  sentinelPath: string;
};

/**
 * Create an opted-in workspace with a fake project-local `kibi-mcp` package.
 * `withSpaces` puts spaces in the workspace path and the fixture entry file
 * name, which is exactly where shell-based launch strategies break.
 */
export function createFixtureWorkspace(options: {
  prefix: string;
  installPackage?: boolean;
  withSpaces?: boolean;
  gitBoundary?: boolean;
}): FixtureWorkspace {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), options.prefix));
  const workspaceRoot = options.withSpaces
    ? path.join(base, "kibi ws space")
    : base;
  fs.mkdirSync(workspaceRoot, { recursive: true });

  fs.mkdirSync(path.join(workspaceRoot, ".kb"), { recursive: true });
  fs.writeFileSync(path.join(workspaceRoot, ".kb", "manifest.json"), "{}");
  if (options.gitBoundary) {
    fs.writeFileSync(path.join(workspaceRoot, ".git"), "gitdir: elsewhere\n");
  }
  // Consumer projects always have a package.json; the launcher's Node-based
  // resolution anchors on it.
  fs.writeFileSync(
    path.join(workspaceRoot, "package.json"),
    `${JSON.stringify({ name: "fixture-workspace", version: "1.0.0", private: true }, null, 2)}\n`,
  );

  const sentinelPath = path.join(base, "fixture-sentinel.txt");
  let entryPath: string | undefined;
  let packageRoot: string | undefined;

  if (options.installPackage !== false) {
    packageRoot = path.join(workspaceRoot, "node_modules", "kibi-mcp");
    const binDir = path.join(packageRoot, "bin");
    fs.mkdirSync(binDir, { recursive: true });
    const entryName = options.withSpaces ? "kibi mcp.js" : "kibi-mcp.js";
    entryPath = path.join(binDir, entryName);
    fs.writeFileSync(entryPath, FIXTURE_ENTRY_SCRIPT);
    fs.writeFileSync(
      path.join(packageRoot, "package.json"),
      `${JSON.stringify(
        {
          name: "kibi-mcp",
          version: "1.0.0",
          bin: path.join("bin", entryName),
        },
        null,
        2,
      )}\n`,
    );
  }

  return {
    base,
    workspaceRoot,
    entryPath,
    packageRoot,
    sentinelPath,
  };
}

/** PATH-less env: nothing on PATH is resolvable, isolating resolution tests. */
export function hermeticEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return { PATH: "", Path: "", ...extra };
}

/** Stable temp-root key matching the launcher's workspace hashing. */
export function workspaceKey(workspaceRoot: string): string {
  return createHash("sha256").update(path.resolve(workspaceRoot)).digest("hex");
}

export function cleanupRoots(roots: string[]): void {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
}
