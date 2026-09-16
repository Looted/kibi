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
const { createRequire } = require("node:module");

const KIBI_WORKSPACE_ENV_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT",
];
const SERVER_NAME = "kibi-zcode-launcher";
const SERVER_VERSION = "0.1.0";
const PROBE_TIMEOUT_MS = 8000;
const KIBI_MCP_PACKAGE = "kibi-mcp";

const MISSING_KIBI_MCP_INSTRUCTIONS =
  "This workspace is configured for Kibi (.kb/manifest.json found), but no " +
  "kibi-mcp executable is resolvable from the workspace. Install kibi-mcp " +
  "in the project (for example: npm install --save-dev kibi-mcp) or globally, " +
  "then restart the ZCode session. No KB tools are exposed in this session.";

const LAUNCH_FAILED_INSTRUCTIONS_PREFIX =
  "This workspace is configured for Kibi and a kibi-mcp installation was " +
  "found, but launching it failed. No KB tools are exposed in this session. " +
  "Launch failure: ";

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

/**
 * Resolve the kibi-mcp JavaScript entry point with Node's own resolution from
 * the workspace (workspace node_modules first, walking up), preserving the
 * project-local precedence of the previous `npx --no-install kibi-mcp` setup.
 * Running the resolved entry through process.execPath keeps launching
 * shell-free and Windows-safe: npm-style .cmd shims cannot be spawned without
 * a command interpreter, which used to make correctly configured Windows
 * workspaces look like they had no kibi-mcp at all.
 */
function resolveLocalEntry(workspaceRoot) {
  const marker = path.join(workspaceRoot, "package.json");
  if (!fs.existsSync(marker)) return null;
  try {
    const requireFromWorkspace = createRequire(marker);
    const pkgJsonPath = requireFromWorkspace.resolve(
      `${KIBI_MCP_PACKAGE}/package.json`,
    );
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    const bin =
      typeof pkg.bin === "string"
        ? pkg.bin
        : isRecord(pkg.bin)
          ? pkg.bin[KIBI_MCP_PACKAGE]
          : undefined;
    if (typeof bin !== "string" || bin.length === 0) return null;
    const entry = path.resolve(path.dirname(pkgJsonPath), bin);
    if (!fs.existsSync(entry)) return null;
    return entry;
  } catch {
    return null;
  }
}

/**
 * Find a globally installed kibi-mcp on PATH. POSIX spawn resolves commands
 * through PATH itself; on Windows the npm shim is a .cmd/.bat batch file that
 * cannot be spawned shell-free, so the underlying script is resolved from the
 * standard npm global layout (shim sibling `node_modules/kibi-mcp`) or from
 * the path the shim itself references, and executed via process.execPath.
 */
function findGlobalKibiMcpCommand(env = process.env) {
  const dirs = (env.PATH || env.Path || "")
    .split(path.delimiter)
    .filter((dir) => dir.length > 0);
  const names =
    process.platform === "win32"
      ? [
          `${KIBI_MCP_PACKAGE}.exe`,
          `${KIBI_MCP_PACKAGE}.cmd`,
          `${KIBI_MCP_PACKAGE}.bat`,
          KIBI_MCP_PACKAGE,
        ]
      : [KIBI_MCP_PACKAGE];

  for (const dir of dirs) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
      } catch {
        continue;
      }
      if (process.platform === "win32") {
        const extension = path.extname(candidate).toLowerCase();
        if (extension === ".cmd" || extension === ".bat") {
          const entry = resolveWindowsShimEntry(candidate);
          if (entry) {
            return {
              command: process.execPath,
              args: [entry],
              via: "global-shim",
            };
          }
          continue;
        }
      }
      return { command: candidate, args: [], via: "global-path" };
    }
  }
  return null;
}

/**
 * Best-effort recovery of the JS entry behind an npm Windows shim: standard
 * global installs place the package next to the shim under node_modules, and
 * the shim itself references `<shimDir>\node_modules\<pkg>\bin\<target>`.
 */
function resolveWindowsShimEntry(shimPath) {
  const shimDir = path.dirname(shimPath);
  const siblingPackage = path.join(
    shimDir,
    "node_modules",
    KIBI_MCP_PACKAGE,
    "package.json",
  );
  const viaSibling = readPackageBinEntry(siblingPackage);
  if (viaSibling) return viaSibling;

  try {
    const shimSource = fs.readFileSync(shimPath, "utf8");
    const match = shimSource.match(
      /node_modules[\\/]+kibi-mcp[\\/]+bin[\\/][^\s"%]+/,
    );
    if (!match) return null;
    const referenced = match[0].replaceAll("\\", "/");
    const marker = "node_modules/";
    const offset = referenced.toLowerCase().indexOf(marker);
    if (offset === -1) return null;
    const entry = path.join(
      shimDir,
      referenced.slice(offset).replaceAll("/", path.sep),
    );
    return fs.existsSync(entry) ? entry : null;
  } catch {
    return null;
  }
}

function readPackageBinEntry(pkgJsonPath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    const bin =
      typeof pkg.bin === "string"
        ? pkg.bin
        : isRecord(pkg.bin)
          ? pkg.bin[KIBI_MCP_PACKAGE]
          : undefined;
    if (typeof bin !== "string" || bin.length === 0) return null;
    const entry = path.resolve(path.dirname(pkgJsonPath), bin);
    return fs.existsSync(entry) ? entry : null;
  } catch {
    return null;
  }
}

/**
 * Decide how kibi-mcp would be launched from the workspace without spawning
 * anything: null means genuinely missing; otherwise the returned command/args
 * run shell-free on every platform (spawn on POSIX performs PATH lookup, and
 * Windows never routes .cmd shims through a command interpreter).
 */
function resolveLaunchTarget(workspaceRoot, env = process.env) {
  const localEntry = resolveLocalEntry(workspaceRoot);
  if (localEntry) {
    return {
      command: process.execPath,
      args: [localEntry],
      via: "project-local",
    };
  }
  return findGlobalKibiMcpCommand(env);
}

/**
 * Probe classifies the outcome instead of collapsing every failure into
 * "missing": a resolution miss is missing; a spawn/runtime failure on an
 * installed server is reported as launch_failed so the session gets an
 * accurate hint instead of a wrong install instruction.
 */
function probeKibiMcp(options = {}) {
  const {
    cwd,
    env = process.env,
    spawnImpl = spawn,
    timeoutMs = PROBE_TIMEOUT_MS,
  } = options;
  const target = resolveLaunchTarget(cwd, env);
  if (!target) return Promise.resolve({ status: "missing" });
  return new Promise((resolveProbe) => {
    let settled = false;
    const done = (status, detail) => {
      if (settled) return;
      settled = true;
      resolveProbe({ status, detail });
    };
    let child;
    try {
      child = spawnImpl(
        target.command,
        [...target.args, "--print-resolution"],
        {
          cwd,
          env,
          stdio: "ignore",
        },
      );
    } catch (error) {
      done("launch_failed", error?.message ?? String(error));
      return;
    }
    const timer = setTimeout(() => {
      done("launch_failed", `probe timed out after ${timeoutMs}ms`);
      try {
        child.kill("SIGKILL");
      } catch {
        // Already gone.
      }
    }, timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timer);
      done("launch_failed", error?.message ?? String(error));
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      done(
        code === 0 ? "available" : "launch_failed",
        `probe exit code ${code}`,
      );
    });
  });
}

/**
 * Proxy the real kibi-mcp: stdio passes through untouched and the launcher
 * mirrors the child's exit state. Host shutdown signals are forwarded so the
 * child terminates even when a launcher detaches it from the process group.
 * The launch target is resolved shell-free (see resolveLaunchTarget), so the
 * same strategy works on Windows without a command interpreter.
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
  const target = resolveLaunchTarget(workspaceRoot, env);
  if (!target) {
    stderr.write(
      "[kibi-zcode] kibi-mcp is no longer resolvable from the workspace\n",
    );
    return Promise.resolve(1);
  }
  const childEnv = { ...env, KIBI_WORKSPACE: workspaceRoot };
  return new Promise((resolveExit) => {
    let child;
    try {
      child = spawnImpl(target.command, [...target.args], {
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

  const probe = await probeKibiMcp({ cwd: workspace.root, env, spawnImpl });
  if (probe.status === "available") {
    return proxyKibiMcp({
      workspaceRoot: workspace.root,
      env,
      spawnImpl,
      stdin,
      stdout,
      stderr,
    });
  }
  if (probe.status === "launch_failed") {
    return serveSilent({
      stdin,
      stdout,
      instructions: `${LAUNCH_FAILED_INSTRUCTIONS_PREFIX}${probe.detail ?? "unknown error"}`,
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
  LAUNCH_FAILED_INSTRUCTIONS_PREFIX,
  MISSING_KIBI_MCP_INSTRUCTIONS,
  UNCONFIGURED_WORKSPACE_TOOL_MESSAGE,
  createLineReader,
  findGlobalKibiMcpCommand,
  main,
  probeKibiMcp,
  proxyKibiMcp,
  resolveKibiWorkspace,
  resolveLaunchTarget,
  resolveLocalEntry,
  resolveWindowsShimEntry,
  runLauncher,
  serveSilent,
  signalExitCode,
  silentServerResponse,
};
