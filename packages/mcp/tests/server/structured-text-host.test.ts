// implements REQ-mcp-structured-text-per-host
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isolatedMcpSandboxEnv } from "../helpers/isolated-env.js";

/**
 * End to end over stdio against a real sandbox KB: the built kibi-mcp server
 * sends a discovery result once to a host that shows structuredContent
 * (Claude Code, named by the launcher's KIBI_MCP_HOST or by the client's
 * initialize name), keeps the data JSON in front of the summary for every
 * other host unless KIBI_MCP_STRUCTURED_TEXT says otherwise, and returns ten
 * ranked rows when kb_search is given no limit.
 */

type JsonObject = Record<string, unknown>;

const repoRoot = path.resolve(import.meta.dir, "../../../..");
const cliPath = path.join(repoRoot, "packages/cli/dist/cli.js");
const mcpPath = path.join(repoRoot, "packages/mcp/bin/kibi-mcp");
const ROW_COUNT = 12;

let workspaceRoot = "";

function runCli(args: readonly string[]): void {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: isolatedMcpSandboxEnv(),
  });
  if (result.status !== 0)
    throw new Error(result.stderr || `kibi ${args[0]} exited ${result.status}`);
}

beforeAll(() => {
  workspaceRoot = mkdtempSync(path.join(tmpdir(), "kibi-structured-text-"));
  const gitInit = spawnSync("git", ["init", "-b", "main"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: isolatedMcpSandboxEnv(),
  });
  if (gitInit.status !== 0)
    throw new Error(gitInit.stderr || `git init exited ${gitInit.status}`);
  runCli(["init", "--no-hooks"]);
  const requirementsDir = path.join(workspaceRoot, ".kb/requirements");
  mkdirSync(requirementsDir, { recursive: true });
  for (let index = 1; index <= ROW_COUNT; index += 1) {
    writeFileSync(
      path.join(requirementsDir, `REQ-ranked-row-${index}.md`),
      `---
id: REQ-ranked-row-${index}
title: Ranked row ${index} of the search fixture
status: open
priority: should
tags: [search, fixture]
---

Ranked row ${index}: one of ${ROW_COUNT} requirements that match the same search.
`,
    );
  }
  // sync imports tracked sources, so stage the fixture before syncing.
  const add = spawnSync("git", ["add", ".kb"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: isolatedMcpSandboxEnv(),
  });
  if (add.status !== 0)
    throw new Error(add.stderr || `git add exited ${add.status}`);
  runCli(["sync"]);
});

afterAll(() => {
  if (workspaceRoot === "") return;
  spawnSync(process.execPath, [cliPath, "engine", "stop"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: isolatedMcpSandboxEnv(),
  });
  rmSync(workspaceRoot, { recursive: true, force: true });
});

function readMessage(
  proc: ChildProcess,
  timeoutMs = 60_000,
): Promise<JsonObject> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("timed out waiting for an MCP message"));
    }, timeoutMs);
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString();
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      const line = buffer.slice(0, newline).trim();
      cleanup();
      resolve(JSON.parse(line) as JsonObject);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      proc.stdout?.off("data", onData);
    };
    proc.stdout?.on("data", onData);
  });
}

async function request(
  proc: ChildProcess,
  id: number,
  method: string,
  params: JsonObject,
): Promise<JsonObject> {
  proc.stdin?.write(
    `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`,
  );
  return await readMessage(proc);
}

type ToolResult = { text: string; data: JsonObject };

/** Start the server as a given host, call one tool, stop the server. */
async function callAs(
  options: { host?: string; clientName: string; structuredText?: string },
  tool: string,
  args: JsonObject,
): Promise<ToolResult> {
  const env = isolatedMcpSandboxEnv({
    KIBI_BRANCH: "main",
    KIBI_WORKSPACE: workspaceRoot,
  });
  Reflect.deleteProperty(env, "KIBI_MCP_HOST");
  Reflect.deleteProperty(env, "KIBI_MCP_STRUCTURED_TEXT");
  if (options.host !== undefined) env.KIBI_MCP_HOST = options.host;
  if (options.structuredText !== undefined)
    env.KIBI_MCP_STRUCTURED_TEXT = options.structuredText;
  const proc = spawn("node", [mcpPath], {
    cwd: workspaceRoot,
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  try {
    const initialized = await request(proc, 1, "initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: options.clientName, version: "1.0.0" },
    });
    expect(initialized.result).toBeDefined();
    const response = await request(proc, 2, "tools/call", {
      name: tool,
      arguments: args,
    });
    const result = response.result as JsonObject | undefined;
    if (result === undefined)
      throw new Error(`tools/call failed: ${JSON.stringify(response)}`);
    const content = result.content as { type: string; text?: string }[];
    const structured = result.structuredContent as JsonObject | undefined;
    if (structured === undefined)
      throw new Error(`no structuredContent: ${JSON.stringify(result)}`);
    return {
      text: content[0]?.text ?? "",
      data: structured.data as JsonObject,
    };
  } finally {
    proc.kill();
  }
}

const QUERY_ARGS = { type: "req", limit: 20, offset: 0 };

describe("discovery results reach each host once", () => {
  test("the Claude Code launcher's host name drops the JSON copy from the text", async () => {
    const { text, data } = await callAs(
      { host: "claude-code", clientName: "test" },
      "kb_query",
      QUERY_ARGS,
    );
    expect(data.count).toBe(ROW_COUNT);
    expect(text.startsWith("Found")).toBe(true);
    expect(text).not.toContain('"entities"');
  }, 120_000);

  test("a client that calls itself claude-code on initialize is treated the same", async () => {
    const { text, data } = await callAs(
      { clientName: "claude-code" },
      "kb_query",
      QUERY_ARGS,
    );
    expect(data.count).toBe(ROW_COUNT);
    expect(text.startsWith("Found")).toBe(true);
    expect(text).not.toContain('"entities"');
  }, 120_000);

  test("any other host keeps the data JSON ahead of the summary", async () => {
    const { text, data } = await callAs(
      { host: "codex", clientName: "test" },
      "kb_query",
      QUERY_ARGS,
    );
    expect(data.count).toBe(ROW_COUNT);
    expect(text.startsWith("{")).toBe(true);
    expect(text).toContain(`"count":${ROW_COUNT}`);
    expect(text).toContain("Found");
  }, 120_000);

  test("KIBI_MCP_STRUCTURED_TEXT overrides the host-based choice both ways", async () => {
    const omitted = await callAs(
      { host: "codex", clientName: "test", structuredText: "omit" },
      "kb_query",
      QUERY_ARGS,
    );
    expect(omitted.text.startsWith("Found")).toBe(true);
    expect(omitted.text).not.toContain('"entities"');
    const embedded = await callAs(
      {
        host: "claude-code",
        clientName: "claude-code",
        structuredText: "embed",
      },
      "kb_query",
      QUERY_ARGS,
    );
    expect(embedded.text.startsWith("{")).toBe(true);
    expect(embedded.text).toContain(`"count":${ROW_COUNT}`);
  }, 120_000);

  test("kb_search without a limit returns ten ranked rows and says more remain", async () => {
    const { data } = await callAs(
      { host: "claude-code", clientName: "claude-code" },
      "kb_search",
      { query: "ranked row of the search fixture", answer: false },
    );
    expect(data.count).toBe(ROW_COUNT);
    expect((data.results as unknown[]).length).toBe(10);
    expect(data.truncated).toBe(true);
  }, 120_000);
});
