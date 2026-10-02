// implements REQ-mcp-launchers-follow-session-workspace
import { afterEach, describe, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  SESSION_PROXY_LAUNCHERS,
  embedSessionProxy,
  sessionProxyBlock,
} from "../sync-session-proxy";

const repoRoot = path.resolve(import.meta.dir, "..", "..");
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/** A stand-in kibi-mcp that answers with the workspace it was started for. */
const FAKE_SERVER = `#!/usr/bin/env node
import readline from "node:readline";
if (process.argv.includes("--print-resolution")) process.exit(0);
const send = (m) => process.stdout.write(JSON.stringify(m) + "\\n");
readline.createInterface({ input: process.stdin }).on("line", (line) => {
  const m = JSON.parse(line);
  if (m.id === undefined || m.id === null) return;
  if (m.method === "initialize") {
    send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: m.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "fake-kibi-mcp", version: "1" } } });
  } else if (m.method === "tools/call") {
    send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: process.env.KIBI_WORKSPACE + "|" + (process.env.KIBI_MCP_HOST ?? "") }] } });
  } else {
    send({ jsonrpc: "2.0", id: m.id, result: {} });
  }
});
`;

/** A Kibi consumer checkout with a project-local kibi-mcp every host can find. */
function kibiWorkspace(prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(root);
  fs.mkdirSync(path.join(root, ".git"));
  fs.mkdirSync(path.join(root, ".kb"));
  fs.writeFileSync(
    path.join(root, ".kb", "manifest.json"),
    '{"manifestVersion":1}\n',
  );
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "consumer",
      private: true,
      dependencies: { "kibi-mcp": "*" },
    }),
  );
  const pkg = path.join(root, "node_modules", "kibi-mcp");
  fs.mkdirSync(path.join(pkg, "bin"), { recursive: true });
  fs.writeFileSync(
    path.join(pkg, "package.json"),
    JSON.stringify({
      name: "kibi-mcp",
      version: "1.0.0",
      type: "module",
      main: "index.js",
      bin: { "kibi-mcp": "bin/kibi-mcp.mjs" },
    }),
  );
  fs.writeFileSync(path.join(pkg, "index.js"), "export {};\n");
  const bin = path.join(pkg, "bin", "kibi-mcp.mjs");
  fs.writeFileSync(bin, FAKE_SERVER, { mode: 0o755 });
  // npx --no-install (Codex) resolves the workspace's .bin shim.
  fs.mkdirSync(path.join(root, "node_modules", ".bin"));
  fs.symlinkSync(bin, path.join(root, "node_modules", ".bin", "kibi-mcp"));
  return root;
}

type Host = {
  name: string;
  hostTag: string;
  launch: (main: string) => { args: string[]; env: Record<string, string> };
};

const HOSTS: Host[] = [
  {
    name: "claude",
    hostTag: "claude-code",
    launch: (main) => ({
      args: [path.join(repoRoot, "packages/claude/bin/mcp-launcher.cjs")],
      env: { CLAUDE_PROJECT_DIR: main },
    }),
  },
  {
    name: "zcode",
    hostTag: "zcode",
    launch: () => ({
      args: [path.join(repoRoot, "packages/zcode/bin/mcp-launcher.cjs")],
      env: {},
    }),
  },
  {
    name: "codex",
    hostTag: "codex",
    launch: () => ({
      args: [path.join(repoRoot, "packages/codex/bin/mcp-launcher.cjs")],
      env: {},
    }),
  },
  {
    name: "cursor",
    hostTag: "cursor",
    launch: (main) => ({
      args: [
        path.join(repoRoot, "packages/cursor/bin/launch-kibi-mcp.mjs"),
        main,
      ],
      env: {},
    }),
  },
];

type Message = Record<string, unknown> & { id?: unknown; method?: string };

function session(host: Host, main: string, roots: string[], pin?: string) {
  const launch = host.launch(main);
  const env: NodeJS.ProcessEnv = { ...process.env, ...launch.env };
  for (const key of [
    "KIBI_WORKSPACE",
    "KIBI_PROJECT_ROOT",
    "KIBI_ROOT",
    "WORKSPACE_FOLDER_PATHS",
    "CURSOR_WORKSPACE",
    "KIBI_DIAGNOSTIC_MODE",
    "KIBI_CLI_DIAGNOSTIC_MODE",
  ]) {
    delete env[key];
  }
  if (pin) env.KIBI_WORKSPACE = pin;
  // Codex and ZCode resolve the workspace from their working directory.
  const child: ChildProcess = spawn(process.execPath, launch.args, {
    cwd: main,
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const received: Message[] = [];
  let buffer = "";
  const send = (message: Record<string, unknown>) =>
    child.stdin?.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
  child.stdout?.on("data", (chunk) => {
    buffer += chunk;
    let index = buffer.indexOf("\n");
    while (index >= 0) {
      const message = JSON.parse(buffer.slice(0, index)) as Message;
      buffer = buffer.slice(index + 1);
      received.push(message);
      if (message.method === "roots/list") {
        send({
          id: message.id,
          result: {
            roots: roots.map((dir) => ({ uri: pathToFileURL(dir).href })),
          },
        });
      }
      index = buffer.indexOf("\n");
    }
  });
  const response = async (id: number): Promise<Message> => {
    const deadline = Date.now() + 30000;
    for (;;) {
      const found = received.find((m) => m.id === id && !m.method);
      if (found) return found;
      if (Date.now() > deadline)
        throw new Error(`${host.name}: no response for id ${id}`);
      await new Promise((wake) => setTimeout(wake, 50));
    }
  };
  const callTool = async (): Promise<string> => {
    send({
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: { roots: { listChanged: true } },
        clientInfo: { name: "test-client", version: "1" },
      },
    });
    await response(1);
    send({ method: "notifications/initialized" });
    send({
      id: 2,
      method: "tools/call",
      params: { name: "kb_status", arguments: {} },
    });
    const message = await response(2);
    const result = message.result as { content: Array<{ text: string }> };
    return result.content[0]?.text ?? "";
  };
  const close = () =>
    new Promise<void>((resolve) => {
      child.once("close", () => resolve());
      child.stdin?.end();
    });
  return { callTool, close, received };
}

describe("every host MCP launcher follows the session workspace", () => {
  for (const host of HOSTS) {
    test(`${host.name} answers from the worktree the session's roots name`, async () => {
      const main = kibiWorkspace(`kibi-${host.name}-main-`);
      const worktree = kibiWorkspace(`kibi-${host.name}-worktree-`);
      const client = session(host, main, [worktree]);
      try {
        expect(await client.callTool()).toBe(`${worktree}|${host.hostTag}`);
        expect(
          client.received.some(
            (m) => m.method === "notifications/tools/list_changed",
          ),
        ).toBe(true);
      } finally {
        await client.close();
      }
    });

    test(`${host.name} keeps a pinned KIBI_WORKSPACE`, async () => {
      const main = kibiWorkspace(`kibi-${host.name}-main-`);
      const worktree = kibiWorkspace(`kibi-${host.name}-worktree-`);
      const client = session(host, main, [worktree], main);
      try {
        expect(await client.callTool()).toBe(`${main}|${host.hostTag}`);
        expect(client.received.some((m) => m.method === "roots/list")).toBe(
          false,
        );
      } finally {
        await client.close();
      }
    });
  }
});

describe("kibi-session-proxy copies", () => {
  test("every launcher embeds the canonical block unchanged", () => {
    const block = sessionProxyBlock();
    for (const relative of SESSION_PROXY_LAUNCHERS) {
      const launcher = fs.readFileSync(path.join(repoRoot, relative), "utf8");
      expect(embedSessionProxy(launcher, block), relative).toBe(launcher);
    }
  });

  test("the Codex MCP config inlines the current launcher", () => {
    const config = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "packages/codex/.mcp.json"), "utf8"),
    ) as { mcpServers: { kibi: { args: string[] } } };
    const launcher = fs.readFileSync(
      path.join(repoRoot, "packages/codex/bin/mcp-launcher.cjs"),
      "utf8",
    );
    expect(config.mcpServers.kibi.args[1]?.startsWith(launcher)).toBe(true);
  });
});
