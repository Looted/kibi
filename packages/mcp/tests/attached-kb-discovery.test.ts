import { expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

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
  });
  if (gitInit.status !== 0) {
    throw new Error(gitInit.stderr || `git init exited ${gitInit.status}`);
  }
  const init = spawnSync(process.execPath, [cliPath, "init", "--no-hooks"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  });
  if (init.status !== 0) {
    throw new Error(init.stderr || `CLI init exited ${init.status}`);
  }
  const requirementsDir = path.join(
    workspaceRoot,
    ".kb/requirements",
  );
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
  });
}

function readMessage(
  child: ReturnType<typeof spawn>,
  timeoutMs = 120_000,
): Promise<JsonObject> {
  const stdout = child.stdout;
  if (!stdout) return Promise.reject(new Error("MCP stdout is unavailable"));
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for MCP response"));
    }, timeoutMs);
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString();
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      cleanup();
      resolve(parseObject(buffer.slice(0, newline)));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      stdout.off("data", onData);
    };
    stdout.on("data", onData);
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
  stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  return readMessage(child);
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
        env: {
          ...process.env,
          KIBI_BRANCH: "main",
          KIBI_WORKSPACE: workspaceRoot,
        },
        stdio: ["pipe", "pipe", "pipe"],
      });
      try {
        await request(child, 1, "initialize", {
          protocolVersion: "2024-11-05",
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
