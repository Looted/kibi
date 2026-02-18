import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { bench, run } from "mitata";

const BENCH_DIR = path.join("/tmp", ".kibi-bench-tmp");
const MCP_BIN = "/home/looted/projects/kibi/packages/mcp/bin/kibi-mcp.ts";

function generateTestFile(id: number): string {
  return `---
id: req-mcp-${id}
title: MCP Benchmark Requirement ${id}
status: approved
priority: high
tags: [mcp, benchmark]
---

# MCP Benchmark Requirement ${id}

Testing MCP tool call latency.
`;
}

function setupMcpWorkspace(tmpDir: string, entityCount: number): void {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
  mkdirSync(tmpDir, { recursive: true });

  execSync("git init", { cwd: tmpDir, stdio: "pipe" });
  execSync('git config user.email "bench@test.com"', {
    cwd: tmpDir,
    stdio: "pipe",
  });
  execSync('git config user.name "Bench Test"', { cwd: tmpDir, stdio: "pipe" });

  const reqDir = path.join(tmpDir, "requirements");
  mkdirSync(reqDir, { recursive: true });

  for (let i = 0; i < entityCount; i++) {
    const filePath = path.join(reqDir, `req-${i}.md`);
    writeFileSync(filePath, generateTestFile(i));
  }

  execSync("git add .", { cwd: tmpDir, stdio: "pipe" });
  execSync('git commit -m "Initial commit"', { cwd: tmpDir, stdio: "pipe" });

  try {
    const branch = execSync("git branch --show-current", {
      cwd: tmpDir,
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
    if (branch === "master") {
      execSync("git branch -m master main", { cwd: tmpDir, stdio: "pipe" });
    }
  } catch {
    // ignore
  }

  const cliBin = "/home/looted/projects/kibi/packages/cli/src/cli.ts";
  execSync(`bun ${cliBin} init`, { cwd: tmpDir, stdio: "pipe" });
  execSync(`bun ${cliBin} sync`, { cwd: tmpDir, stdio: "pipe" });
}

function measureMcpToolCall(
  tmpDir: string,
  toolName: string,
  params: string,
): void {
  const request = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: toolName,
      arguments: JSON.parse(params),
    },
  });

  const kbPath = path.join(tmpDir, ".kb");
  const env = { ...process.env, KB_PATH: kbPath };

  execSync(`echo '${request}' | bun ${MCP_BIN}`, {
    cwd: tmpDir,
    stdio: "pipe",
    env,
  });
}

function cleanup(tmpDir: string): void {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

bench("MCP kb_query tool call", async () => {
  const tmpDir = path.join(BENCH_DIR, "mcp-query");
  setupMcpWorkspace(tmpDir, 100);
  measureMcpToolCall(tmpDir, "kb_query", '{"type": "req"}');
  cleanup(tmpDir);
});

bench("MCP kb_query by ID", async () => {
  const tmpDir = path.join(BENCH_DIR, "mcp-query-id");
  setupMcpWorkspace(tmpDir, 100);
  measureMcpToolCall(tmpDir, "kb_query", '{"type": "req", "id": "req-mcp-50"}');
  cleanup(tmpDir);
});

bench("MCP kb_check tool call", async () => {
  const tmpDir = path.join(BENCH_DIR, "mcp-check");
  setupMcpWorkspace(tmpDir, 100);
  measureMcpToolCall(tmpDir, "kb_check", "{}");
  cleanup(tmpDir);
});

console.log("🏃 Running MCP tool call latency benchmarks...\n");
console.log(
  "Note: v0 baseline measurements (targets are for future optimization)\n",
);

await run();

if (existsSync(BENCH_DIR)) {
  rmSync(BENCH_DIR, { recursive: true, force: true });
}
