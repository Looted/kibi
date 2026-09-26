import { expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { StringDecoder } from "node:string_decoder";
import { isolatedMcpSandboxEnv } from "./helpers/isolated-env.js";

type JsonObject = Readonly<Record<string, unknown>>;

const repoRoot = path.resolve(import.meta.dir, "../../..");
const cliPath = path.join(repoRoot, "packages/cli/dist/cli.js");
const mcpPath = path.join(repoRoot, "packages/mcp/bin/kibi-mcp");
const repetitions = 10;

function parseObject(raw: string): JsonObject {
  const value: unknown = JSON.parse(raw);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected a JSON object");
  }
  return Object.fromEntries(Object.entries(value));
}

function runCli(
  runtime: "bun" | "node",
  operation: "query" | "search",
  input: JsonObject,
  workspaceRoot: string,
): JsonObject {
  const result = spawnSync(runtime, [cliPath, operation, "--input", "-"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    input: JSON.stringify(input),
    env: isolatedMcpSandboxEnv(),
  });
  if (result.status !== 0) {
    throw new Error(
      result.stderr || `CLI ${operation} exited ${result.status}`,
    );
  }
  return parseObject(result.stdout);
}

function prepareDiscoveryWorkspace(): string {
  const workspaceRoot = mkdtempSync(
    path.join(tmpdir(), "kibi-attached-discovery-"),
  );
  const gitInit = spawnSync("git", ["init", "-b", "main"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: isolatedMcpSandboxEnv(),
  });
  if (gitInit.status !== 0) {
    throw new Error(gitInit.stderr || `git init exited ${gitInit.status}`);
  }
  const init = spawnSync(process.execPath, [cliPath, "init", "--no-hooks"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: isolatedMcpSandboxEnv(),
  });
  if (init.status !== 0) {
    throw new Error(init.stderr || `CLI init exited ${init.status}`);
  }
  const requirementsDir = path.join(workspaceRoot, ".kb/requirements");
  mkdirSync(requirementsDir, { recursive: true });
  writeFileSync(
    path.join(requirementsDir, "REQ-mcp-search-discovery.md"),
    `---
id: REQ-mcp-search-discovery
title: MCP search discovery fixture
status: open
priority: should
tags: [mcp, discovery]
---

Provide stable query and search identities for attached-KB frame tests.
`,
  );
  writeFileSync(
    path.join(requirementsDir, "REQ-skillopt-fixture.md"),
    `---
id: REQ-skillopt-fixture
title: Skillopt discovery fixture
status: open
priority: should
tags: [skillopt, discovery]
---

Provide a stable skillopt search result for attached-KB frame tests.
`,
  );
  const sync = spawnSync(process.execPath, [cliPath, "sync"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: isolatedMcpSandboxEnv(),
  });
  if (sync.status !== 0) {
    throw new Error(sync.stderr || `CLI sync exited ${sync.status}`);
  }
  return workspaceRoot;
}

function stopWorkspaceEngine(workspaceRoot: string): void {
  spawnSync(process.execPath, [cliPath, "engine", "stop"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: isolatedMcpSandboxEnv(),
  });
}

function readMessage(
  child: ReturnType<typeof spawn>,
  requestId: number,
  send: () => void,
  timeoutMs = 120_000,
): Promise<JsonObject> {
  const stdout = child.stdout;
  if (!stdout) return Promise.reject(new Error("MCP stdout is unavailable"));
  return new Promise((resolve, reject) => {
    let buffer = "";
    let stderr = "";
    const decoder = new StringDecoder("utf8");
    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          `Timed out waiting for MCP response ${requestId}; exit=${child.exitCode}, signal=${child.signalCode}\n${stderr}`,
        ),
      );
    }, timeoutMs);
    const onData = (chunk: Buffer) => {
      buffer += decoder.write(chunk);
      if (buffer.length > 16 * 1024 * 1024) {
        onError(new Error("MCP fixture frame exceeded its input bound"));
        return;
      }
      for (;;) {
        const newline = buffer.indexOf("\n");
        if (newline < 0) return;
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        if (!line.trim()) continue;
        try {
          const message = parseObject(line);
          if (message.id !== requestId) continue;
          cleanup();
          resolve(message);
          return;
        } catch (error) {
          onError(error instanceof Error ? error : new Error(String(error)));
          return;
        }
      }
    };
    const onStderr = (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString()}`.slice(-64 * 1024);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onClose = (code: number | null, signal: NodeJS.Signals | null) => {
      onError(
        new Error(
          `MCP closed before response ${requestId}; exit=${code}, signal=${signal}\n${stderr}`,
        ),
      );
    };
    const cleanup = () => {
      clearTimeout(timeout);
      stdout.off("data", onData);
      child.stderr?.off("data", onStderr);
      child.stdin?.off("error", onError);
      child.off("error", onError);
      child.off("close", onClose);
    };
    stdout.on("data", onData);
    child.stderr?.on("data", onStderr);
    child.stdin?.once("error", onError);
    child.once("error", onError);
    child.once("close", onClose);
    // Register response readers before a fast peer can answer the write.
    try {
      send();
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

async function request(
  child: ReturnType<typeof spawn>,
  id: number,
  method: string,
  params: JsonObject,
): Promise<JsonObject> {
  const stdin = child.stdin;
  if (!stdin) throw new Error("MCP stdin is unavailable");
  return readMessage(child, id, () => {
    stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });
}

function structuredContent(response: JsonObject): JsonObject {
  const result = response.result;
  if (result === null || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("MCP response has no result object");
  }
  const structured = Object.fromEntries(
    Object.entries(result),
  ).structuredContent;
  if (
    structured === null ||
    typeof structured !== "object" ||
    Array.isArray(structured)
  ) {
    throw new Error("MCP response has no structured content");
  }
  return Object.fromEntries(Object.entries(structured));
}

function discoveryIdentity(payload: JsonObject): JsonObject {
  const collection = Array.isArray(payload.entities)
    ? payload.entities
    : Array.isArray(payload.results)
      ? payload.results
      : [];
  const ids = collection.flatMap((value) => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return [];
    }
    const record = Object.fromEntries(Object.entries(value));
    const entity = record.entity;
    const source =
      entity !== null && typeof entity === "object" && !Array.isArray(entity)
        ? Object.fromEntries(Object.entries(entity))
        : record;
    return typeof source.id === "string" ? [source.id] : [];
  });
  return { count: payload.count, ids };
}

async function stop(child: ReturnType<typeof spawn>): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  await new Promise<void>((resolve) => child.once("exit", () => resolve()));
}

test("discovery fixture reads a split UTF-8 response after a notification", async () => {
  const child = spawn(
    "node",
    [
      "-e",
      `process.stdin.once('data', () => {
        const bytes = Buffer.from(JSON.stringify({jsonrpc:'2.0',id:7,result:{text:'ready🙂'}})+'\\n');
        const split = bytes.indexOf(Buffer.from('🙂')) + 2;
        process.stdout.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/message'})+'\\n');
        process.stdout.write(bytes.subarray(0,split));
        setTimeout(() => process.stdout.write(bytes.subarray(split)), 20);
      });`,
    ],
    { stdio: ["pipe", "pipe", "pipe"] },
  );
  try {
    expect((await request(child, 7, "initialize", {})).result).toEqual({
      text: "ready🙂",
    });
  } finally {
    await stop(child);
  }
}, 10_000);

test("discovery fixture rejects a closed peer with its bounded stderr", async () => {
  const child = spawn(
    "node",
    [
      "-e",
      "process.stdin.once('data', () => { process.stderr.write('startup failed'); process.exit(1); });",
    ],
    { stdio: ["pipe", "pipe", "pipe"] },
  );
  try {
    await expect(request(child, 7, "initialize", {})).rejects.toThrow(
      "MCP closed before response 7; exit=1, signal=null\nstartup failed",
    );
  } finally {
    await stop(child);
  }
}, 10_000);

// executable_for TEST-test-journaled-engine-harness
test("Node CLI and MCP consume complete attached-KB discovery frames repeatedly", async () => {
  const workspaceRoot = prepareDiscoveryWorkspace();
  try {
    // Given a stable attached branch KB in an isolated fixture workspace.
    const expectedQuery = runCli(
      "bun",
      "query",
      { limit: 0, offset: 0 },
      workspaceRoot,
    );
    const expectedExact = runCli(
      "bun",
      "query",
      {
        id: "REQ-mcp-search-discovery",
        limit: 20,
        offset: 0,
      },
      workspaceRoot,
    );
    const expectedSearch = runCli(
      "bun",
      "search",
      {
        query: "skillopt",
        limit: 20,
        offset: 0,
      },
      workspaceRoot,
    );

    for (let iteration = 0; iteration < repetitions; iteration += 1) {
      // When short-lived Node CLI and MCP processes query the same attached KB.
      const cliQuery = runCli(
        "node",
        "query",
        { limit: 0, offset: 0 },
        workspaceRoot,
      );
      const cliExact = runCli(
        "node",
        "query",
        {
          id: "REQ-mcp-search-discovery",
          limit: 20,
          offset: 0,
        },
        workspaceRoot,
      );
      const cliSearch = runCli(
        "node",
        "search",
        {
          query: "skillopt",
          limit: 20,
          offset: 0,
        },
        workspaceRoot,
      );
      const child = spawn("node", [mcpPath], {
        cwd: workspaceRoot,
        env: isolatedMcpSandboxEnv({
          KIBI_BRANCH: "main",
          KIBI_WORKSPACE: workspaceRoot,
        }),
        stdio: ["pipe", "pipe", "pipe"],
      });
      try {
        await request(child, 1, "initialize", {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "attached-kb-regression", version: "1.0.0" },
        });
        const mcpQuery = structuredContent(
          await request(child, 2, "tools/call", {
            name: "kb_query",
            arguments: { limit: 0, offset: 0 },
          }),
        );
        const mcpExact = structuredContent(
          await request(child, 3, "tools/call", {
            name: "kb_query",
            arguments: {
              id: "REQ-mcp-search-discovery",
              limit: 20,
              offset: 0,
            },
          }),
        );
        const mcpSearch = structuredContent(
          await request(child, 4, "tools/call", {
            name: "kb_search",
            arguments: { query: "skillopt", limit: 20, offset: 0 },
          }),
        );

        // Then every complete frame has stable counts, identities, and ranking.
        expect(discoveryIdentity(cliQuery)).toEqual(
          discoveryIdentity(expectedQuery),
        );
        expect(discoveryIdentity(cliExact)).toEqual(
          discoveryIdentity(expectedExact),
        );
        expect(discoveryIdentity(cliSearch)).toEqual(
          discoveryIdentity(expectedSearch),
        );
        expect(discoveryIdentity(mcpQuery)).toEqual(
          discoveryIdentity(expectedQuery),
        );
        expect(discoveryIdentity(mcpExact)).toEqual(
          discoveryIdentity(expectedExact),
        );
        expect(discoveryIdentity(mcpSearch)).toEqual(
          discoveryIdentity(expectedSearch),
        );
      } finally {
        await stop(child);
      }
    }
  } finally {
    stopWorkspaceEngine(workspaceRoot);
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
}, 300_000);
