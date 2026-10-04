import { expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { isolatedMcpSandboxEnv } from "./helpers/isolated-env.js";

// A bare-SHA checkout served over MCP stdio: KB reads answer from the
// checkout's read-only snapshot and say so; writes are refused.

type JsonObject = Record<string, unknown>;

const repoRoot = path.resolve(import.meta.dir, "../../..");
const cliPath = path.join(repoRoot, "packages/cli/dist/cli.js");
const mcpPath = path.join(repoRoot, "packages/mcp/bin/kibi-mcp");

function run(command: string, args: readonly string[], cwd: string): string {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: isolatedMcpSandboxEnv(),
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

const git = (cwd: string, ...args: string[]): string =>
  run(
    "git",
    [
      "-c",
      "user.email=test@test.com",
      "-c",
      "user.name=Kibi Test",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "core.hooksPath=/dev/null",
      "-c",
      "advice.detachedHead=false",
      ...args,
    ],
    cwd,
  );

function writeRequirement(root: string, id: string, title: string): void {
  const dir = path.join(root, ".kb", "requirements");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, `${id}.md`),
    `---\nid: ${id}\ntitle: ${title}\nstatus: open\npriority: should\ntags: [auth]\n---\n\n${title}.\n`,
  );
}

function startServer(workspaceRoot: string) {
  const child = spawn("node", [mcpPath], {
    cwd: workspaceRoot,
    env: isolatedMcpSandboxEnv({ KIBI_WORKSPACE: workspaceRoot }),
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

function detachedNotice(result: JsonObject): JsonObject | undefined {
  const envelope = result.structuredContent as
    | { diagnostics?: JsonObject[] }
    | undefined;
  return envelope?.diagnostics?.find(
    (diagnostic) => diagnostic.code === "detached_head_read_only",
  );
}

test("MCP reads a bare-SHA checkout from its read-only snapshot and refuses writes", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-mcp-detached-"));
  const server = { current: null as ReturnType<typeof startServer> | null };
  try {
    git(root, "init", "-q", "-b", "main");
    run(process.execPath, [cliPath, "init", "--no-hooks"], root);
    writeRequirement(root, "REQ-demo-login", "Users log in with a password");
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "init");
    git(root, "checkout", "-q", "--detach");
    writeRequirement(root, "REQ-demo-logout", "Users log out");
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "detached only");
    const head = git(root, "rev-parse", "HEAD");

    server.current = startServer(root);
    await server.current.request("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "detached-head-regression", version: "1.0.0" },
    });

    const query = await server.current.callTool("kb_query", {
      type: "req",
      limit: 20,
      offset: 0,
    });
    const envelope = query.structuredContent as {
      status: string;
      data: { entities: Array<{ id: string }> };
    };
    expect(envelope.status).toBe("success");
    expect(envelope.data.entities.map((entity) => entity.id).sort()).toEqual([
      "REQ-demo-login",
      "REQ-demo-logout",
    ]);
    expect(detachedNotice(query)).toMatchObject({
      severity: "warning",
      detail: {
        head,
        branchesAtHead: [],
        kbBranch: "kibi-internal/detached-head-snapshot",
        writes: "refused",
      },
    });

    const status = await server.current.callTool("kb_status", {});
    expect(
      (status.structuredContent as { data: JsonObject }).data,
    ).toMatchObject({
      branch: "kibi-internal/detached-head-snapshot",
      syncState: "fresh",
    });
    expect(detachedNotice(status)).toBeDefined();

    const upsert = await server.current.callTool("kb_upsert", {
      type: "req",
      id: "REQ-demo-refused",
      properties: { title: "Refused", status: "open" },
    });
    expect(upsert.isError).toBe(true);
    const text = JSON.stringify(upsert.content);
    expect(text).toContain("kb_upsert writes the branch KB");
    expect(text).toContain("git switch -c <branch>");
  } finally {
    await server.current?.stop();
    spawnSync(process.execPath, [cliPath, "engine", "stop"], {
      cwd: root,
      encoding: "utf8",
      env: isolatedMcpSandboxEnv(),
    });
    rmSync(root, { recursive: true, force: true });
  }
}, 300_000);
