import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { createInterface } from "node:readline";
import { bench, run } from "mitata";

const BENCH_DIR = path.join("/tmp", ".kibi-bench-tmp");
const MCP_BIN = "/home/looted/projects/kibi/packages/mcp/bin/kibi-mcp";

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
    if (branch === "master" || branch === "main") {
      execSync(`git branch -m ${branch} develop`, {
        cwd: tmpDir,
        stdio: "pipe",
      });
    }
  } catch {
    // ignore
  }

  const cliBin = "/home/looted/projects/kibi/packages/cli/src/cli.ts";
  execSync(`bun ${cliBin} init`, { cwd: tmpDir, stdio: "pipe" });
  execSync(`bun ${cliBin} sync`, { cwd: tmpDir, stdio: "pipe" });
}

async function measureMcpToolCall(
  tmpDir: string,
  toolName: string,
  params: string,
): Promise<void> {
  const kbPath = path.join(tmpDir, ".kb");
  const env = { ...process.env, KB_PATH: kbPath };

  return new Promise((resolve, reject) => {
    const child = spawn("bun", [MCP_BIN], {
      cwd: tmpDir,
      env,
      stdio: ["pipe", "pipe", "inherit"],
    });

    const rl = createInterface({ input: child.stdout });
    let responseCount = 0;
    const requiredResponses = 2; // initialize response + tool call response

    rl.on("line", (line) => {
      if (line.includes('"jsonrpc"')) {
        responseCount++;
        if (responseCount >= requiredResponses) {
          child.kill("SIGINT");
        }
      }
    });

    child.on("error", reject);
    child.on("exit", () => {
      resolve();
    });

    // MCP initialization sequence
    const initRequest = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "benchmark", version: "1.0.0" },
      },
    });

    const initNotification = JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/initialized",
    });

    const toolRequest = JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: toolName,
        arguments: JSON.parse(params),
      },
    });

    // Send initialization, then notification, then tool call
    child.stdin.write(`${initRequest}\n`);
    child.stdin.write(`${initNotification}\n`);
    child.stdin.write(`${toolRequest}\n`);
  });
}

function cleanup(tmpDir: string): void {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

const tmpDirQuery = path.join(BENCH_DIR, "mcp-query");
const tmpDirQueryId = path.join(BENCH_DIR, "mcp-query-id");
const tmpDirCheck = path.join(BENCH_DIR, "mcp-check");

console.log("🏗️ Setting up benchmark workspaces...");
setupMcpWorkspace(tmpDirQuery, 100);
setupMcpWorkspace(tmpDirQueryId, 100);
setupMcpWorkspace(tmpDirCheck, 100);

bench("MCP kb_query tool call", async () => {
  await measureMcpToolCall(tmpDirQuery, "kb_query", '{"type": "req"}');
});

bench("MCP kb_query by ID", async () => {
  await measureMcpToolCall(
    tmpDirQueryId,
    "kb_query",
    '{"type": "req", "id": "req-mcp-50"}',
  );
});

bench("MCP kb_check tool call", async () => {
  await measureMcpToolCall(tmpDirCheck, "kb_check", "{}");
});

console.log("🏃 Running MCP tool call latency benchmarks...\n");
console.log(
  "Note: v0 baseline measurements (targets are for future optimization)\n",
);

await run();

cleanup(tmpDirQuery);
cleanup(tmpDirQueryId);
cleanup(tmpDirCheck);

if (existsSync(BENCH_DIR)) {
  rmSync(BENCH_DIR, { recursive: true, force: true });
}
