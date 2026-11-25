import { expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isolatedMcpSandboxEnv } from "./helpers/isolated-env.js";

// An MCP server in a directory outside any Git repository: tools work on
// the no-Git store, the no_git_repository advisory comes with the session's
// first result and with every status and check, not with every result, and
// a feature that reads Git is refused with GIT_REQUIRED.

type JsonObject = Record<string, unknown>;

const repoRoot = path.resolve(import.meta.dir, "../../..");
const cliPath = path.join(repoRoot, "packages/cli/dist/cli.js");
const mcpPath = path.join(repoRoot, "packages/mcp/bin/kibi-mcp");

function sandboxEnv(root: string, extra: NodeJS.ProcessEnv = {}) {
  // Nothing above the temporary directory may count as its repository.
  return isolatedMcpSandboxEnv({
    GIT_CEILING_DIRECTORIES: path.dirname(root),
    KIBI_TELEMETRY: "0",
    ...extra,
  });
}

function startServer(workspaceRoot: string) {
  const child = spawn("node", [mcpPath], {
    cwd: workspaceRoot,
    env: sandboxEnv(workspaceRoot, { KIBI_WORKSPACE: workspaceRoot }),
    stdio: ["pipe", "pipe", "pipe"],
  });
  const waiters = new Map<number, (message: JsonObject) => void>();
  let buffer = "";
  child.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
    for (;;) {
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      const message = JSON.parse(line) as JsonObject;
      if (typeof message.id === "number") waiters.get(message.id)?.(message);
    }
  });
  let nextId = 0;
  const request = (method: string, params: JsonObject): Promise<JsonObject> =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(
        () => reject(new Error(`MCP request ${method} timed out`)),
        120_000,
      );
      waiters.set(id, (message) => {
        clearTimeout(timer);
        waiters.delete(id);
        resolve(message);
      });
      child.stdin.write(
        `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`,
      );
    });
  const callTool = async (
    name: string,
    args: JsonObject,
  ): Promise<JsonObject> => {
    const response = await request("tools/call", { name, arguments: args });
    return (response.result ?? {}) as JsonObject;
  };
  const stop = async (): Promise<void> => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    child.kill("SIGTERM");
    await new Promise<void>((resolve) => child.once("exit", () => resolve()));
  };
  return { request, callTool, stop };
}

function envelope(result: JsonObject): {
  status?: string;
  diagnostics?: JsonObject[];
  error?: { code?: string; retryable?: boolean; message?: string };
} {
  return (result.structuredContent ?? {}) as never;
}

function advised(result: JsonObject): boolean {
  return (envelope(result).diagnostics ?? []).some(
    (diagnostic) => diagnostic.code === "no_git_repository",
  );
}

test("MCP outside Git works on one store and advises Git on the first result, status and check only", async () => {
  const root = realpathSync(
    mkdtempSync(path.join(tmpdir(), "kibi-mcp-no-git-")),
  );
  const server = { current: null as ReturnType<typeof startServer> | null };
  try {
    const init = spawnSync(process.execPath, [cliPath, "init"], {
      cwd: root,
      encoding: "utf8",
      env: sandboxEnv(root),
    });
    expect(init.status, init.stderr).toBe(0);

    server.current = startServer(root);
    await server.current.request("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "no-git-regression", version: "1.0.0" },
    });

    const first = await server.current.callTool("kb_search", {
      query: "export",
    });
    expect(envelope(first).status).toBe("success");
    expect(advised(first)).toBe(true);

    const upsert = await server.current.callTool("kb_upsert", {
      type: "req",
      id: "REQ-demo-export",
      properties: {
        title: "Reports export as CSV",
        status: "open",
        priority: "must",
        text_ref: "Reports export as CSV",
      },
    });
    expect(
      envelope(upsert).status,
      JSON.stringify(envelope(upsert).error),
    ).toBe("success");
    expect(advised(upsert)).toBe(false);

    const search = await server.current.callTool("kb_search", {
      query: "export CSV",
    });
    expect(JSON.stringify(search.structuredContent)).toContain(
      "REQ-demo-export",
    );
    expect(advised(search)).toBe(false);

    const status = await server.current.callTool("kb_status", {});
    expect(envelope(status).status).toBe("success");
    expect(advised(status)).toBe(true);
    const check = await server.current.callTool("kb_check", {});
    expect(advised(check)).toBe(true);

    const review = await server.current.callTool("kb_prepare_impact_review", {
      scope: { kind: "staged" },
    });
    expect(envelope(review).error).toMatchObject({
      code: "GIT_REQUIRED",
      retryable: false,
    });
  } finally {
    await server.current?.stop();
    rmSync(root, { recursive: true, force: true });
  }
}, 300_000);
