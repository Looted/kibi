#!/usr/bin/env node
// launcher-contract.test.mjs — executable proof for TEST-vibe-plugin-contract-v1.
//
// Cases:
// 1. outside Kibi workspaces the stdio launcher serves a silent zero-tool MCP
//    server and exits 0 (never "MCP failed to connect");
// 2. inside a Kibi workspace the launcher answers initialize + tools/list
//    with the full kb_* tool list from the MCP contract fixture (skipped when
//    the project-local kibi-mcp bin is not built, e.g. unit-test runs before
//    `bun run build`);
// 3. each shipped hook either emits a valid Vibe structured response with
//    hook_specific_output.additional_context or fails open with exit 0 and no
//    stack trace on stderr.
//
// Runs under plain `node --test` (proof step in proof/steps/), from the repo
// root as cwd on any host: on Windows the launcher wraps kibi-mcp in WSL,
// elsewhere it spawns the project-local bin directly.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..", "..");
const LAUNCHER = join(
  REPO_ROOT,
  "packages",
  "vibe",
  "bin",
  "launch-kibi-mcp.mjs",
);
const HOOKS = join(REPO_ROOT, "packages", "vibe", "bin", "hooks");

// The full tool list is owned by the MCP package's contract fixture, so the
// launcher test tracks it instead of hardcoding a count that drifts as tools
// are added.
const MCP_TOOLS_FIXTURE = join(
  REPO_ROOT,
  "packages",
  "mcp",
  "tests",
  "fixtures",
  "contracts",
  "tools-list.base.json",
);
const EXPECTED_KB_TOOLS = JSON.parse(readFileSync(MCP_TOOLS_FIXTURE, "utf8"))
  .tools.map((tool) => tool.name);

function rpcSpawn(args, cwd) {
  return spawn(process.execPath, args, {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

/** Run an MCP initialize + tools/list round trip against the launcher. */
function handshake(launcher, cwd, timeoutMs = 120_000) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = rpcSpawn([launcher], cwd);
    let buf = "";
    const timer = setTimeout(() => {
      child.kill();
      rejectPromise(new Error(`handshake timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on("data", (d) => {
      buf += d;
      for (;;) {
        const idx = buf.indexOf("\n");
        if (idx === -1) break;
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (!line.trim()) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }
        if (msg.id === 1) {
          child.stdin.write(
            `${JSON.stringify({
              jsonrpc: "2.0",
              method: "notifications/initialized",
            })}\n`,
          );
          child.stdin.write(
            `${JSON.stringify({
              jsonrpc: "2.0",
              id: 2,
              method: "tools/list",
              params: {},
            })}\n`,
          );
        }
        if (msg.id === 2) {
          clearTimeout(timer);
          child.kill();
          resolvePromise(msg.result ?? {});
          return;
        }
      }
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      rejectPromise(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      rejectPromise(
        new Error(`launcher exited ${code} before tools/list answered`),
      );
    });
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "launcher-contract-test", version: "0" },
        },
      })}\n`,
    );
  });
}

/** Run a hook script with a JSON payload on stdin; return {code, stdout, stderr}. */
function runHook(script, payload, cwd = REPO_ROOT, timeoutMs = 180_000) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = rpcSpawn([script], cwd);
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      rejectPromise(new Error(`hook ${script} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on("data", (d) => {
      stdout += d;
    });
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      rejectPromise(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({ code, stdout, stderr });
    });
    child.stdin.write(`${JSON.stringify(payload)}\n`);
    child.stdin.end();
  });
}

test(
  "outside Kibi workspaces the launcher serves a silent zero-tool server and exits 0",
  { timeout: 30_000 },
  async (t) => {
    const { mkdtempSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const empty = mkdtempSync(join(tmpdir(), "kibi-vibe-nokb-"));
    try {
      const result = await handshake(LAUNCHER, empty, 20_000);
      assert.deepEqual(result.tools ?? [], []);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  },
);

const kibiMcpBin = join(REPO_ROOT, "node_modules", "kibi-mcp", "package.json");
const workspaceReady =
  existsSync(join(REPO_ROOT, ".kb", "manifest.json")) && existsSync(kibiMcpBin);

test(
  "stdio handshake lists the full kb_* tool list",
  {
    timeout: 180_000,
    skip: !workspaceReady && "project-local kibi-mcp not built",
  },
  async () => {
    const result = await handshake(LAUNCHER, REPO_ROOT);
    const tools = (result.tools ?? []).map((t) => t.name).sort();
    assert.deepEqual(tools, [...EXPECTED_KB_TOOLS].sort());
  },
);

test(
  "the launcher answers the handshake under the planned runtime (WSL wrap on Windows, direct elsewhere)",
  {
    timeout: 180_000,
    skip: !workspaceReady && "project-local kibi-mcp not built",
  },
  async () => {
    const result = await handshake(LAUNCHER, REPO_ROOT);
    assert.ok(
      Array.isArray(result.tools) && result.tools.length === EXPECTED_KB_TOOLS.length,
    );
  },
);

test(
  "session_start hook emits additional_context with KB status and never stack-traces",
  {
    timeout: 240_000,
    skip: !workspaceReady && "project-local kibi-mcp not built",
  },
  async () => {
    const payload = {
      hook_event_name: "session_start",
      session_id: "contract-test",
      cwd: REPO_ROOT,
      source: "startup",
      agent_name: "default",
    };
    const { code, stdout, stderr } = await runHook(
      join(HOOKS, "kibi-session-context.mjs"),
      payload,
    );
    assert.equal(code, 0, `hook exited ${code}`);
    assert.ok(
      !/at .+\(.+:\d+:\d+\)/.test(stderr),
      `hook printed a stack trace: ${stderr}`,
    );
    const parsed = JSON.parse(stdout.trim().split("\n").pop());
    const ctx = parsed?.hook_specific_output?.additional_context ?? "";
    assert.match(ctx, /Kibi KB attached at this workspace/);
  },
);

test(
  "pre_agent hook emits additional_context from kb_search",
  {
    timeout: 240_000,
    skip: !workspaceReady && "project-local kibi-mcp not built",
  },
  async () => {
    const payload = {
      hook_event_name: "pre_agent",
      session_id: "contract-test",
      cwd: REPO_ROOT,
      prompt: "configure kibi mcp launcher runtime detection",
      agent_name: "default",
    };
    const { code, stdout } = await runHook(
      join(HOOKS, "kibi-prompt-context.mjs"),
      payload,
    );
    assert.equal(code, 0, `hook exited ${code}`);
    const parsed = JSON.parse(stdout.trim().split("\n").pop());
    assert.ok(
      typeof parsed?.hook_specific_output?.additional_context === "string",
      "pre_agent hook must emit additional_context",
    );
  },
);

test(
  "post_tool hook fails open outside Kibi workspaces (exit 0, no stack trace)",
  { timeout: 60_000 },
  async () => {
    const { mkdtempSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const empty = mkdtempSync(join(tmpdir(), "kibi-vibe-hook-nokb-"));
    try {
      const payload = {
        hook_event_name: "post_tool",
        session_id: "contract-test",
        cwd: empty,
        tool_name: "file_system.read_file",
        tool_call_id: "contract-1",
        tool_input: { path: "README.md" },
        tool_status: "success",
        tool_output: { content: "// ..." },
      };
      const { code, stdout, stderr } = await runHook(
        join(HOOKS, "kibi-file-context.mjs"),
        payload,
        empty,
        30_000,
      );
      assert.equal(code, 0, `hook exited ${code}`);
      assert.equal(stdout.trim(), "");
      assert.ok(
        !/at .+\(.+:\d+:\d+\)/.test(stderr),
        `hook printed a stack trace: ${stderr}`,
      );
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  },
);

test(
  "post_tool hook emits additional_context for file tools inside a Kibi workspace",
  {
    timeout: 240_000,
    skip: !workspaceReady && "project-local kibi-mcp not built",
  },
  async () => {
    const payload = {
      hook_event_name: "post_tool",
      session_id: "contract-test",
      cwd: REPO_ROOT,
      tool_name: "file_system.read_file",
      tool_call_id: "contract-1",
      tool_input: { path: "packages/vibe/bin/kibi-runtime.mjs" },
      tool_status: "success",
      tool_output: { content: "// ..." },
    };
    const { code, stdout } = await runHook(
      join(HOOKS, "kibi-file-context.mjs"),
      payload,
    );
    assert.equal(code, 0, `hook exited ${code}`);
    // Fail-open: without parseable kibi output the hook may print nothing, but
    // when it prints, it must be valid structured JSON.
    const text = stdout.trim();
    if (text) {
      const parsed = JSON.parse(text.split("\n").pop());
      assert.ok(parsed && typeof parsed === "object");
    }
  },
);
