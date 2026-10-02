// implements REQ-claude-mcp-follows-session-workspace
import { afterEach, describe, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { cleanupTempDirs, tempDir, write } from "./fixture";

afterEach(cleanupTempDirs);

const launcher = path.resolve(import.meta.dir, "../bin/mcp-launcher.cjs");

/** A stand-in kibi-mcp that answers with the workspace it was started for. */
const FAKE_SERVER = `
const readline = require("node:readline");
if (process.argv.includes("--print-resolution")) process.exit(0);
const send = (m) => process.stdout.write(JSON.stringify(m) + "\\n");
readline.createInterface({ input: process.stdin }).on("line", (line) => {
  const m = JSON.parse(line);
  if (m.id === undefined || m.id === null) return;
  if (m.method === "initialize") {
    send({ jsonrpc: "2.0", id: m.id, result: { protocolVersion: m.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "fake-kibi-mcp", version: "1" } } });
  } else if (m.method === "tools/list") {
    send({ jsonrpc: "2.0", id: m.id, result: { tools: [{ name: "kb_status", inputSchema: { type: "object" } }] } });
  } else if (m.method === "tools/call") {
    const answer = () => send({ jsonrpc: "2.0", id: m.id, result: { content: [{ type: "text", text: process.env.KIBI_WORKSPACE }] } });
    if (m.params && m.params.name === "slow") setTimeout(answer, 1500);
    else answer();
  } else {
    send({ jsonrpc: "2.0", id: m.id, result: {} });
  }
});
`;

/** A git checkout that owns a Kibi manifest and a project-local kibi-mcp. */
function kibiWorkspace(prefix: string): string {
  const root = tempDir(prefix);
  fs.mkdirSync(path.join(root, ".git"));
  write(root, ".kb/manifest.json", '{"manifestVersion":1}\n');
  write(root, "package.json", '{"name":"consumer","private":true}\n');
  const pkg = path.join(root, "node_modules", "kibi-mcp");
  write(
    pkg,
    "package.json",
    JSON.stringify({
      name: "kibi-mcp",
      main: "index.js",
      bin: { "kibi-mcp": "bin/kibi-mcp.cjs" },
    }),
  );
  write(pkg, "index.js", "module.exports = {};\n");
  write(pkg, "bin/kibi-mcp.cjs", FAKE_SERVER);
  return root;
}

type Message = Record<string, unknown> & {
  id?: unknown;
  method?: string;
  result?: Record<string, unknown>;
};

/** Scripted MCP client that answers the launcher's roots/list requests. */
function client(options: {
  projectDir: string;
  env?: Record<string, string>;
  roots?: () => string[] | "ignore";
  rootsCapability?: boolean;
}) {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CLAUDE_PROJECT_DIR: options.projectDir,
    ...options.env,
  };
  for (const key of ["KIBI_WORKSPACE", "KIBI_PROJECT_ROOT", "KIBI_ROOT"]) {
    if (!options.env?.[key]) delete env[key];
  }
  const child: ChildProcess = spawn(process.execPath, [launcher], {
    cwd: options.projectDir,
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const received: Message[] = [];
  const waiters: Array<() => void> = [];
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
        const roots = options.roots?.() ?? [options.projectDir];
        if (roots !== "ignore") {
          send({
            id: message.id,
            result: {
              roots: roots.map((dir) => ({ uri: pathToFileURL(dir).href })),
            },
          });
        }
      }
      for (const wake of waiters.splice(0)) wake();
      index = buffer.indexOf("\n");
    }
  });
  const response = async (id: number, timeoutMs = 15000): Promise<Message> => {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const found = received.find(
        (message) => message.id === id && !message.method,
      );
      if (found) return found;
      if (Date.now() > deadline) throw new Error(`no response for id ${id}`);
      await new Promise<void>((wake) => {
        waiters.push(wake);
        setTimeout(wake, 200);
      });
    }
  };
  const start = async () => {
    send({
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities:
          options.rootsCapability === false
            ? {}
            : { roots: { listChanged: true } },
        clientInfo: { name: "test-client", version: "1" },
      },
    });
    await response(1);
    send({ method: "notifications/initialized" });
  };
  const callTool = async (id: number): Promise<string> => {
    send({
      id,
      method: "tools/call",
      params: { name: "kb_status", arguments: {} },
    });
    const message = await response(id);
    const content = message.result?.content as Array<{ text: string }>;
    return content[0]?.text ?? "";
  };
  const close = () =>
    new Promise<void>((resolve) => {
      child.once("close", () => resolve());
      child.stdin?.end();
    });
  return { start, callTool, send, response, received, close };
}

describe("kibi-claude MCP launcher follows the session workspace", () => {
  test("moves to the worktree the session's roots name", async () => {
    const main = kibiWorkspace("kibi-claude-main-");
    const worktree = kibiWorkspace("kibi-claude-worktree-");
    const session = client({ projectDir: main, roots: () => [worktree] });
    try {
      await session.start();
      expect(await session.callTool(2)).toBe(worktree);
      expect(
        session.received.some(
          (message) => message.method === "notifications/tools/list_changed",
        ),
      ).toBe(true);
      // Later calls stay on the worktree without another switch.
      expect(await session.callTool(3)).toBe(worktree);
    } finally {
      await session.close();
    }
  });

  test("follows the session back and keeps call order across a switch", async () => {
    const main = kibiWorkspace("kibi-claude-main-");
    const worktree = kibiWorkspace("kibi-claude-worktree-");
    let roots = [worktree];
    const session = client({ projectDir: main, roots: () => roots });
    try {
      await session.start();
      expect(await session.callTool(2)).toBe(worktree);
      roots = [main];
      session.send({
        id: 3,
        method: "tools/call",
        params: { name: "kb_status", arguments: {} },
      });
      session.send({
        id: 4,
        method: "tools/call",
        params: { name: "kb_status", arguments: {} },
      });
      const third = await session.response(3);
      const fourth = await session.response(4);
      expect((third.result?.content as Array<{ text: string }>)[0]?.text).toBe(
        main,
      );
      expect((fourth.result?.content as Array<{ text: string }>)[0]?.text).toBe(
        main,
      );
      expect(session.received.indexOf(third)).toBeLessThan(
        session.received.indexOf(fourth),
      );
    } finally {
      await session.close();
    }
  });

  test("a call still running on the old server is answered after a switch", async () => {
    const main = kibiWorkspace("kibi-claude-main-");
    const worktree = kibiWorkspace("kibi-claude-worktree-");
    let roots = [main];
    const session = client({ projectDir: main, roots: () => roots });
    try {
      await session.start();
      session.send({
        id: 2,
        method: "tools/call",
        params: { name: "slow", arguments: {} },
      });
      // Let the slow call reach the main server before the session moves.
      await new Promise((wake) => setTimeout(wake, 300));
      roots = [worktree];
      expect(await session.callTool(3)).toBe(worktree);
      const slow = await session.response(2);
      expect((slow.result?.content as Array<{ text: string }>)[0]?.text).toBe(
        main,
      );
    } finally {
      await session.close();
    }
  });

  test("stays put when the roots are not a Kibi workspace", async () => {
    const main = kibiWorkspace("kibi-claude-main-");
    const plain = tempDir("kibi-claude-plain-");
    fs.mkdirSync(path.join(plain, ".git"));
    const session = client({ projectDir: main, roots: () => [plain] });
    try {
      await session.start();
      expect(await session.callTool(2)).toBe(main);
    } finally {
      await session.close();
    }
  });

  test("never asks for roots when the client does not support them", async () => {
    const main = kibiWorkspace("kibi-claude-main-");
    const session = client({ projectDir: main, rootsCapability: false });
    try {
      await session.start();
      expect(await session.callTool(2)).toBe(main);
      expect(
        session.received.some((message) => message.method === "roots/list"),
      ).toBe(false);
    } finally {
      await session.close();
    }
  });

  test("an explicit KIBI_WORKSPACE pins the workspace", async () => {
    const main = kibiWorkspace("kibi-claude-main-");
    const worktree = kibiWorkspace("kibi-claude-worktree-");
    const session = client({
      projectDir: main,
      env: { KIBI_WORKSPACE: main },
      roots: () => [worktree],
    });
    try {
      await session.start();
      expect(await session.callTool(2)).toBe(main);
      expect(
        session.received.some((message) => message.method === "roots/list"),
      ).toBe(false);
    } finally {
      await session.close();
    }
  });

  test("keeps answering when the client never answers roots/list", async () => {
    const main = kibiWorkspace("kibi-claude-main-");
    const session = client({ projectDir: main, roots: () => "ignore" });
    try {
      await session.start();
      expect(await session.callTool(2)).toBe(main);
    } finally {
      await session.close();
    }
  });
});
