import { expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

type JsonObject = Readonly<Record<string, unknown>>;

const repoRoot = path.resolve(import.meta.dir, "../../..");
const cliPath = path.join(repoRoot, "packages/cli/dist/cli.js");
const mcpPath = path.join(repoRoot, "packages/mcp/bin/kibi-mcp");
const repetitions = 10;

function attachedBranchOrNull(): string | null {
  const result = spawnSync("git", ["branch", "--show-current"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const branch = result.stdout.trim();
  if (result.status !== 0 || branch.length === 0) {
    return null;
  }
  return branch;
}

function syncedBranchKbSnapshot(): string | null {
  const branch = attachedBranchOrNull();
  if (branch === null) return null;
  const snapshot = path.join(repoRoot, ".kb", "branches", branch, "kb.rdf");
  if (!existsSync(snapshot)) return null;
  return branch;
}

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
): JsonObject {
  const result = spawnSync(runtime, [cliPath, operation, "--input", "-"], {
    cwd: repoRoot,
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

// This parity test needs a real attached branch KB snapshot
// (`.kb/branches/<branch>/kb.rdf`). That snapshot is gitignored and not present
// on a fresh CI checkout; without it the MCP fails closed (intentional
// data-safety guard), so the CLI/MCP frame comparison is only meaningful
// against a real attached KB. Resolve the branch once and conditionally skip.
const attachedBranch = syncedBranchKbSnapshot();

test("Node CLI and MCP consume complete attached-KB discovery frames repeatedly", async () => {
  if (attachedBranch === null) {
    return;
  }

  // Given a stable one-shot view of the real attached branch KB.
  const expectedQuery = runCli("bun", "query", { limit: 0, offset: 0 });
  const expectedExact = runCli("bun", "query", {
    id: "REQ-mcp-search-discovery",
    limit: 20,
    offset: 0,
  });
  const expectedSearch = runCli("bun", "search", {
    query: "skillopt",
    limit: 20,
    offset: 0,
  });

  for (let iteration = 0; iteration < repetitions; iteration += 1) {
    // When short-lived Node CLI and MCP processes query the same attached KB.
    const cliQuery = runCli("node", "query", { limit: 0, offset: 0 });
    const cliExact = runCli("node", "query", {
      id: "REQ-mcp-search-discovery",
      limit: 20,
      offset: 0,
    });
    const cliSearch = runCli("node", "search", {
      query: "skillopt",
      limit: 20,
      offset: 0,
    });
    const child = spawn("node", [mcpPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        KIBI_BRANCH: attachedBranch,
        KIBI_WORKSPACE: repoRoot,
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

      // Then every complete frame has the one-shot count and stable identities/ranking.
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
}, 300_000);
