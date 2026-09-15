#!/usr/bin/env node
/**
 * Kibi ZCode plugin MCP launcher.
 *
 * ZCode expands `${ZCODE_PLUGIN_ROOT}` in plugin MCP declarations, so this
 * launcher is referenced directly from `.zcode-plugin/plugin.json`. Starting
 * the Kibi MCP through the launcher (instead of `npx --no-install kibi-mcp`
 * alone) keeps globally installed plugins quiet outside Kibi workspaces:
 *
 * - unconfigured workspace  -> serves a silent MCP server with zero tools;
 * - configured workspace    -> probes the project-local `kibi-mcp` exactly
 *   like a plain `npx --no-install kibi-mcp` config and proxies stdio;
 * - configured but missing  -> serves the silent server with an instructions
 *   hint instead of failing the MCP handshake.
 *
 * The launcher never initializes or writes to the workspace.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const KIBI_WORKSPACE_ENV_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT",
];
const SERVER_NAME = "kibi-zcode-launcher";
const SERVER_VERSION = "0.1.0";
const PROBE_TIMEOUT_MS = 8000;

const MISSING_KIBI_MCP_INSTRUCTIONS =
  "This workspace is configured for Kibi (.kb/manifest.json found), but no " +
  "kibi-mcp executable is resolvable from the workspace. Install kibi-mcp " +
  "in the project (for example: npm install --save-dev kibi-mcp) or globally, " +
  "then restart the ZCode session. No KB tools are exposed in this session.";

const UNCONFIGURED_WORKSPACE_TOOL_MESSAGE =
  "Kibi is not configured for this workspace, so no KB tools are available. " +
  "Initialize project memory explicitly with `kibi init` or the kibi-bootstrap " +
  "skill if you want Kibi here.";

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nextAncestorDirectory(current) {
  const parent = path.dirname(current);
  return parent === current ? undefined : parent;
}

function hasKibiManifest(directory) {
  return fs.existsSync(path.join(directory, ".kb", "manifest.json"));
}

function hasGitBoundary(directory) {
  return fs.existsSync(path.join(directory, ".git"));
}

/**
 * Mirror of packages/zcode/src/workspace-optin.ts. A workspace is opted in
 * only when its Kibi project root owns `.kb/manifest.json`; the walk stops at
 * the `.git` boundary so unrelated enclosing repositories never leak opt-in.
 */
function resolveKibiWorkspace(startDir, env = process.env) {
  for (const key of KIBI_WORKSPACE_ENV_KEYS) {
    const value = env[key] ? env[key].trim() : "";
    if (value) {
      const root = path.resolve(value);
      return { root, optedIn: hasKibiManifest(root) };
    }
  }

  let current = path.resolve(
    startDir && startDir.trim().length > 0 ? startDir : process.cwd(),
  );
  while (current !== undefined) {
    if (hasKibiManifest(current)) {
      return { root: current, optedIn: true };
    }
    if (hasGitBoundary(current)) {
      return { root: current, optedIn: false };
    }
    current = nextAncestorDirectory(current);
  }

  return { root: path.resolve(startDir || process.cwd()), optedIn: false };
}

/** Build the JSON-RPC result for one request when serving the silent server. */
function silentServerResponse(message, options = {}) {
  if (!isRecord(message) || typeof message.method !== "string") return null;
  const hasId = message.id !== undefined && message.id !== null;
  const { instructions, toolMessage } = options;

  if (!hasId) return null;
  if (message.method === "initialize") {
    const params = isRecord(message.params) ? message.params : {};
    const result = {
      protocolVersion:
        typeof params.protocolVersion === "string"
          ? params.protocolVersion
          : "2025-06-18",
      capabilities: {},
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
    };
    if (instructions) result.instructions = instructions;
    return { jsonrpc: "2.0", id: message.id, result };
  }
  if (message.method === "ping") {
    return { jsonrpc: "2.0", id: message.id, result: {} };
  }
  if (message.method === "tools/list") {
    return { jsonrpc: "2.0", id: message.id, result: { tools: [] } };
  }
  if (
    message.method === "resources/list" ||
    message.method === "prompts/list"
  ) {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: { resources: [], prompts: [] },
    };
  }
  if (message.method === "tools/call") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        content: [
          {
            type: "text",
            text:
              toolMessage ??
              `Kibi tools are unavailable in this workspace. ${MISSING_KIBI_MCP_INSTRUCTIONS}`,
          },
        ],
      },
    };
  }
  return {
    jsonrpc: "2.0",
    id: message.id,
    error: { code: -32601, message: `Method not found: ${message.method}` },
  };
}

function createLineReader(onLine) {
  let buffer = "";
  return (chunk) => {
    buffer += chunk.toString("utf8");
    for (;;) {
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex < 0) break;
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.trim().length > 0) onLine(line);
    }
  };
}

/**
 * Serve a silent MCP session: every handshake completes, the tool catalog is
 * empty, and the process exits 0 when the client closes the stream.
 */
function serveSilent(options = {}) {
  const { stdin = process.stdin, stdout = process.stdout, response } = options;
  const write = (payload) => {
    try {
      stdout.write(`${JSON.stringify(payload)}\n`);
    } catch {
      // The client went away; the session is over either way.
    }
  };
  return new Promise((resolveExit) => {
    const finish = () => resolveExit(0);
    stdin.setEncoding(undefined);
    stdin.on(
      "data",
      createLineReader((line) => {
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          return;
        }
        const answer = response
          ? response(message)
          : silentServerResponse(message, options);
        if (answer) write(answer);
      }),
    );
    stdin.on("end", finish);
    stdin.on("close", finish);
    stdout.on("error", finish);
  });
}

function npxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

/**
 * Probe the project-local kibi-mcp exactly like a plain MCP config:
 * `npx --no-install kibi-mcp` resolves from the workspace (or global install)
 * and refuses to install anything. `--print-resolution` exits quickly, so the
 * handshake budget is not spent waiting for a server that cannot start.
 */
function probeKibiMcp(options = {}) {
  const {
    cwd,
    env = process.env,
    spawnImpl = spawn,
    timeoutMs = PROBE_TIMEOUT_MS,
  } = options;
  return new Promise((resolveProbe) => {
    let settled = false;
    const done = (available) => {
      if (settled) return;
      settled = true;
      resolveProbe(available);
    };
    let child;
    try {
      child = spawnImpl(
        npxCommand(),
        ["--no-install", "kibi-mcp", "--print-resolution"],
        {
          cwd,
          env,
          stdio: "ignore",
        },
      );
    } catch {
      done(false);
      return;
    }
    const timer = setTimeout(() => {
      done(false);
      try {
        child.kill("SIGKILL");
      } catch {
        // Already gone.
      }
    }, timeoutMs);
    child.once("error", () => {
      clearTimeout(timer);
      done(false);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      done(code === 0);
    });
  });
}

/**
 * Proxy the real kibi-mcp: stdio passes through untouched and the launcher
 * mirrors the child's exit state. Host shutdown signals are forwarded so the
 * child terminates even when a launcher detaches it from the process group.
 */
function proxyKibiMcp(options = {}) {
  const {
    workspaceRoot,
    env = process.env,
    spawnImpl = spawn,
    stdin = process.stdin,
    stdout = process.stdout,
    stderr = process.stderr,
  } = options;
  const childEnv = { ...env, KIBI_WORKSPACE: workspaceRoot };
  return new Promise((resolveExit) => {
    let child;
    try {
      child = spawnImpl(npxCommand(), ["--no-install", "kibi-mcp"], {
        cwd: workspaceRoot,
        env: childEnv,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error) {
      stderr.write(
        `[kibi-zcode] Failed to start kibi-mcp: ${error?.message ?? String(error)}\n`,
      );
      resolveExit(1);
      return;
    }

    let exited = false;
    const finish = (code, signal) => {
      if (exited) return;
      exited = true;
      for (const signalName of ["SIGINT", "SIGTERM", "SIGHUP"]) {
        process.removeListener(signalName, forwardSignal);
      }
      resolveExit(
        signal
          ? signalExitCode(signal)
          : code === null || code === undefined
            ? 1
            : code,
      );
    };

    const forwardSignal = (signal) => {
      if (!child.killed) child.kill(signal);
      finish(undefined, signal);
    };
    for (const signalName of ["SIGINT", "SIGTERM", "SIGHUP"]) {
      process.once(signalName, forwardSignal);
    }

    child.once("error", (error) => {
      stderr.write(
        `[kibi-zcode] Failed to start kibi-mcp: ${error?.message ?? String(error)}\n`,
      );
      finish(1);
    });
    child.once("close", (code, signal) => finish(code, signal));

    stdin.on("data", (chunk) => {
      try {
        child.stdin.write(chunk);
      } catch {
        // Child stdin closed early; its close handler finishes the run.
      }
    });
    stdin.on("end", () => {
      try {
        child.stdin.end();
      } catch {
        // Already closed.
      }
    });
    child.stdout.on("data", (chunk) => stdout.write(chunk));
    child.stderr.on("data", (chunk) => stderr.write(chunk));
  });
}

const SIGNAL_EXIT_CODES = {
  SIGHUP: 129,
  SIGINT: 130,
  SIGTERM: 143,
};

function signalExitCode(signal) {
  return SIGNAL_EXIT_CODES[signal] ?? 1;
}

/**
 * Launcher entry: silent in unconfigured workspaces, transparent proxy in
 * configured ones, and a clean instructions-bearing session when the
 * configured workspace lacks a resolvable kibi-mcp.
 */
async function runLauncher(options = {}) {
  const {
    cwd = process.cwd(),
    env = process.env,
    stdin = process.stdin,
    stdout = process.stdout,
    spawnImpl = spawn,
    stderr = process.stderr,
  } = options;

  const workspace = resolveKibiWorkspace(cwd, env);
  if (!workspace.optedIn) {
    return serveSilent({
      stdin,
      stdout,
      toolMessage: UNCONFIGURED_WORKSPACE_TOOL_MESSAGE,
    });
  }

  const available = await probeKibiMcp({ cwd: workspace.root, env, spawnImpl });
  if (available) {
    return proxyKibiMcp({
      workspaceRoot: workspace.root,
      env,
      spawnImpl,
      stdin,
      stdout,
      stderr,
    });
  }
  return serveSilent({
    stdin,
    stdout,
    instructions: MISSING_KIBI_MCP_INSTRUCTIONS,
  });
}

async function main() {
  process.exitCode = await runLauncher();
}

if (require.main === module) main();

module.exports = {
  MISSING_KIBI_MCP_INSTRUCTIONS,
  main,
  UNCONFIGURED_WORKSPACE_TOOL_MESSAGE,
  createLineReader,
  proxyKibiMcp,
  probeKibiMcp,
  resolveKibiWorkspace,
  runLauncher,
  serveSilent,
  signalExitCode,
  silentServerResponse,
};
