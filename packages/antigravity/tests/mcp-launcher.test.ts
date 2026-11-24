import { afterEach, describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const launcher = require("../bin/mcp-launcher.cjs") as {
  MISSING_KIBI_MCP_INSTRUCTIONS: string;
  UNCONFIGURED_WORKSPACE_TOOL_MESSAGE: string;
  resolveKibiWorkspace: (
    startDir: string,
    env?: NodeJS.ProcessEnv,
  ) => { root: string; optedIn: boolean };
  silentServerResponse: (
    message: Record<string, unknown>,
    options?: { instructions?: string; toolMessage?: string },
  ) => Record<string, unknown> | null;
  runLauncher: (options?: Record<string, unknown>) => Promise<number>;
};

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

function sendJsonRpc(
  messages: Record<string, unknown>[],
  options: Record<string, unknown>,
): Promise<{ code: number; responses: Record<string, unknown>[] }> {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const chunks: Buffer[] = [];
  stdout.on("data", (chunk: Buffer) => chunks.push(chunk));

  const run = launcher.runLauncher({ ...options, stdin, stdout });
  for (const msg of messages) {
    stdin.write(`${JSON.stringify(msg)}\n`);
  }
  stdin.end();

  return run.then((code) => ({
    code,
    responses: Buffer.concat(chunks)
      .toString("utf8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>),
  }));
}

describe("kibi-antigravity mcp-launcher", () => {
  test("resolves workspace opt-in up to .git boundary", () => {
    const repo = makeTempDir("kibi-agy-mcp-repo-");
    const sub = path.join(repo, "packages", "app");
    fs.mkdirSync(path.join(repo, ".git"), { recursive: true });
    fs.mkdirSync(sub, { recursive: true });

    expect(launcher.resolveKibiWorkspace(sub, {})).toEqual({
      root: repo,
      optedIn: false,
    });

    fs.mkdirSync(path.join(repo, ".kb"), { recursive: true });
    fs.writeFileSync(path.join(repo, ".kb", "manifest.json"), "{}\n");
    expect(launcher.resolveKibiWorkspace(sub, {})).toEqual({
      root: repo,
      optedIn: true,
    });
  });

  test("serves a silent zero-tool MCP server in unconfigured workspaces", async () => {
    const nonKibi = makeTempDir("kibi-agy-mcp-nonkibi-");
    fs.mkdirSync(path.join(nonKibi, ".git"), { recursive: true });

    const { code, responses } = await sendJsonRpc(
      [
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: { protocolVersion: "2025-06-18" },
        },
        { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
        {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "kb_status" },
        },
      ],
      { cwd: nonKibi, env: { PATH: "" } },
    );

    expect(code).toBe(0);
    expect(responses).toHaveLength(3);
    expect(
      (responses[0].result as { serverInfo: { name: string } }).serverInfo.name,
    ).toBe("kibi-antigravity-launcher");
    expect((responses[1].result as { tools: unknown[] }).tools).toEqual([]);
    const callText = (
      responses[2].result as { content: Array<{ text: string }> }
    ).content[0]?.text;
    expect(callText).toBe(launcher.UNCONFIGURED_WORKSPACE_TOOL_MESSAGE);
  });

  test("serves helpful missing-package instructions when .kb exists but kibi-mcp is absent", async () => {
    const repo = makeTempDir("kibi-agy-mcp-missing-");
    fs.mkdirSync(path.join(repo, ".git"), { recursive: true });
    fs.mkdirSync(path.join(repo, ".kb"), { recursive: true });
    fs.writeFileSync(path.join(repo, ".kb", "manifest.json"), "{}\n");

    const { code, responses } = await sendJsonRpc(
      [{ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }],
      { cwd: repo, env: { PATH: "" } },
    );

    expect(code).toBe(0);
    expect(
      (responses[0].result as { instructions?: string }).instructions,
    ).toBe(launcher.MISSING_KIBI_MCP_INSTRUCTIONS);
  });

  test("proxies stdio when project-local kibi-mcp is available and probe succeeds", async () => {
    const repo = makeTempDir("kibi-agy-mcp-local-");
    fs.mkdirSync(path.join(repo, ".git"), { recursive: true });
    fs.mkdirSync(path.join(repo, ".kb"), { recursive: true });
    fs.writeFileSync(path.join(repo, ".kb", "manifest.json"), "{}\n");
    fs.writeFileSync(
      path.join(repo, "package.json"),
      JSON.stringify({ name: "demo" }),
    );

    const mcpDir = path.join(repo, "node_modules", "kibi-mcp");
    fs.mkdirSync(path.join(mcpDir, "bin"), { recursive: true });
    fs.writeFileSync(
      path.join(mcpDir, "package.json"),
      JSON.stringify({
        name: "kibi-mcp",
        main: "index.js",
        bin: { "kibi-mcp": "bin/kibi-mcp.js" },
      }),
    );
    fs.writeFileSync(path.join(mcpDir, "index.js"), "module.exports = {};\n");
    fs.writeFileSync(path.join(mcpDir, "bin", "kibi-mcp.js"), "// fake bin\n");

    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const chunks: Buffer[] = [];
    stdout.on("data", (chunk: Buffer) => chunks.push(chunk));

    let spawnedEnv: NodeJS.ProcessEnv | undefined;
    const spawnImpl = (
      _cmd: string,
      args: string[],
      opts: { env?: NodeJS.ProcessEnv },
    ) => {
      const child = new EventEmitter() as EventEmitter & {
        stdin: PassThrough;
        stdout: PassThrough;
        stderr: PassThrough;
        killed: boolean;
        kill: () => void;
      };
      child.stdin = new PassThrough();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.killed = false;
      child.kill = () => {
        child.killed = true;
      };
      if (args.includes("--print-resolution")) {
        queueMicrotask(() => child.emit("close", 0));
      } else {
        spawnedEnv = opts.env;
        child.stdin.on("finish", () => {
          child.stdout.write('{"jsonrpc":"2.0","id":1,"result":{"ok":true}}\n');
          child.emit("close", 0, null);
        });
        queueMicrotask(() => {
          stdin.write('{"jsonrpc":"2.0","id":1,"method":"ping"}\n');
          stdin.end();
        });
      }
      return child;
    };

    const code = await launcher.runLauncher({
      cwd: repo,
      env: { PATH: "" },
      spawnImpl,
      stdin,
      stdout,
    });
    const responses = Buffer.concat(chunks)
      .toString("utf8")
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>);

    expect(code).toBe(0);
    expect(responses).toEqual([
      { jsonrpc: "2.0", id: 1, result: { ok: true } },
    ]);
    expect(spawnedEnv?.KIBI_MCP_HOST).toBe("antigravity");
    expect(spawnedEnv?.KIBI_MCP_ATTACH_ROOT).toBe(repo);
  });

  test("global Marketplace install discovers opened Kibi workspace via MCP roots/list and proxies tools", async () => {
    const pluginDir = makeTempDir("kibi-agy-global-plugin-");
    const repo = makeTempDir("kibi-agy-opened-repo-");
    fs.mkdirSync(path.join(repo, ".git"), { recursive: true });
    fs.mkdirSync(path.join(repo, ".kb"), { recursive: true });
    fs.writeFileSync(path.join(repo, ".kb", "manifest.json"), "{}\n");
    fs.writeFileSync(
      path.join(repo, "package.json"),
      JSON.stringify({ name: "demo" }),
    );
    const mcpDir = path.join(repo, "node_modules", "kibi-mcp");
    fs.mkdirSync(path.join(mcpDir, "bin"), { recursive: true });
    fs.writeFileSync(
      path.join(mcpDir, "package.json"),
      JSON.stringify({
        name: "kibi-mcp",
        main: "index.js",
        bin: { "kibi-mcp": "bin/kibi-mcp.js" },
      }),
    );
    fs.writeFileSync(path.join(mcpDir, "index.js"), "module.exports = {};\n");
    fs.writeFileSync(path.join(mcpDir, "bin", "kibi-mcp.js"), "// fake bin\n");

    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const received: Record<string, unknown>[] = [];
    let spawnedRoot: string | undefined;

    const spawnImpl = (
      _cmd: string,
      args: string[],
      opts: { cwd?: string },
    ) => {
      const child = new EventEmitter() as EventEmitter & {
        stdin: PassThrough;
        stdout: PassThrough;
        stderr: PassThrough;
        killed: boolean;
        kill: () => void;
      };
      child.stdin = new PassThrough();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.killed = false;
      child.kill = () => {
        child.killed = true;
      };
      if (args.includes("--print-resolution")) {
        queueMicrotask(() => child.emit("close", 0));
      } else {
        spawnedRoot = opts.cwd;
        let childBuf = "";
        child.stdin.on("data", (chunk: Buffer) => {
          childBuf += chunk.toString("utf8");
          for (;;) {
            const idx = childBuf.indexOf("\n");
            if (idx < 0) break;
            const line = childBuf.slice(0, idx);
            childBuf = childBuf.slice(idx + 1);
            if (!line.trim()) continue;
            const msg = JSON.parse(line) as { id?: unknown; method?: string };
            if (msg.method === "initialize") {
              child.stdout.write(
                `${JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "kibi-mcp", version: "3.29.0" } } })}\n`,
              );
            } else if (msg.method === "tools/list") {
              child.stdout.write(
                `${JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { tools: [{ name: "kb_status" }] } })}\n`,
              );
              stdin.end();
            }
          }
        });
        child.stdin.on("finish", () => child.emit("close", 0, null));
      }
      return child;
    };

    let outBuf = "";
    stdout.on("data", (chunk: Buffer) => {
      outBuf += chunk.toString("utf8");
      for (;;) {
        const idx = outBuf.indexOf("\n");
        if (idx < 0) break;
        const line = outBuf.slice(0, idx);
        outBuf = outBuf.slice(idx + 1);
        if (!line.trim()) continue;
        const msg = JSON.parse(line) as { id?: unknown; method?: string };
        received.push(msg);
        if (msg.method === "roots/list") {
          stdin.write(
            `${JSON.stringify({
              jsonrpc: "2.0",
              id: msg.id,
              result: { roots: [{ uri: pathToFileURL(repo).href }] },
            })}\n`,
          );
        }
      }
    });

    const runPromise = launcher.runLauncher({
      cwd: pluginDir,
      env: { PATH: "" },
      spawnImpl,
      stdin,
      stdout,
    });

    stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: { roots: { listChanged: true } },
        },
      })}\n`,
    );
    stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
    );
    stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })}\n`,
    );

    const code = await runPromise;
    expect(code).toBe(0);
    expect(spawnedRoot).toBe(repo);
    const toolsReply = received.find((msg) => msg.id === 2) as
      | { result: { tools: Array<{ name: string }> } }
      | undefined;
    expect(toolsReply?.result.tools).toEqual([{ name: "kb_status" }]);
  });

  test("global Marketplace install stays silent when MCP roots/list returns only non-Kibi repos", async () => {
    const pluginDir = makeTempDir("kibi-agy-global-plugin-");
    const nonKibi = makeTempDir("kibi-agy-plain-repo-");
    fs.mkdirSync(path.join(nonKibi, ".git"), { recursive: true });

    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const received: Record<string, unknown>[] = [];

    let outBuf = "";
    stdout.on("data", (chunk: Buffer) => {
      outBuf += chunk.toString("utf8");
      for (;;) {
        const idx = outBuf.indexOf("\n");
        if (idx < 0) break;
        const line = outBuf.slice(0, idx);
        outBuf = outBuf.slice(idx + 1);
        if (!line.trim()) continue;
        const msg = JSON.parse(line) as { id?: unknown; method?: string };
        received.push(msg);
        if (msg.method === "roots/list") {
          stdin.write(
            `${JSON.stringify({
              jsonrpc: "2.0",
              id: msg.id,
              result: { roots: [{ uri: pathToFileURL(nonKibi).href }] },
            })}\n`,
          );
        } else if (msg.id === 2) {
          stdin.end();
        }
      }
    });

    const runPromise = launcher.runLauncher({
      cwd: pluginDir,
      env: { PATH: "" },
      stdin,
      stdout,
    });

    stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: { roots: {} },
        },
      })}\n`,
    );
    stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
    );
    stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })}\n`,
    );

    const code = await runPromise;
    expect(code).toBe(0);
    const toolsReply = received.find((msg) => msg.id === 2) as
      | { result: { tools: unknown[] } }
      | undefined;
    expect(toolsReply?.result.tools).toEqual([]);
  });
});
