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
const { fileURLToPath } = require("node:url");
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
 * Find a project-local package candidate using the same node_modules ancestor
 * layout that createRequire uses. This is only used to distinguish a genuinely
 * missing package from an installed-but-broken package; the actual entry point
 * is always resolved through the package's public exports below.
 */
function findLocalPackageDirectory(workspaceRoot) {
  let current = path.resolve(workspaceRoot);
  while (current !== undefined) {
    const candidate = path.join(current, "node_modules", KIBI_MCP_PACKAGE);
    try {
      fs.lstatSync(candidate);
      return candidate;
    } catch {
      // Keep walking toward the filesystem root.
    }
    current = nextAncestorDirectory(current);
  }
  return null;
}

/**
 * Derive the owning package manifest from the public entry returned by
 * require.resolve. This intentionally walks from the resolved file rather
 * than resolving `kibi-mcp/package.json`, which is commonly blocked by the
 * package's exports map.
 */
function findOwningPackageManifest(resolvedEntry) {
  let current = path.dirname(path.resolve(resolvedEntry));
  while (current !== undefined) {
    const candidate = path.join(current, "package.json");
    try {
      const packageJson = JSON.parse(fs.readFileSync(candidate, "utf8"));
      if (packageJson.name === KIBI_MCP_PACKAGE) {
        return { path: candidate, packageJson };
      }
    } catch {
      // There is no readable manifest at this ancestor.
    }
    current = nextAncestorDirectory(current);
  }
  return null;
}

function isReadableFile(entry) {
  try {
    if (!fs.statSync(entry).isFile()) return false;
    // The launcher invokes JavaScript bins with process.execPath, so the bin
    // itself must be a readable regular file, not an OS-executable file.
    fs.accessSync(entry, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function readDeclaredBinEntry(packageJsonPath, packageJson) {
  const bin =
    typeof packageJson.bin === "string"
      ? packageJson.bin
      : isRecord(packageJson.bin)
        ? packageJson.bin[KIBI_MCP_PACKAGE]
        : undefined;
  if (typeof bin !== "string" || bin.length === 0) return null;
  const entry = path.resolve(path.dirname(packageJsonPath), bin);
  return isReadableFile(entry) ? entry : null;
}

function resolveLocalInstallation(workspaceRoot) {
  const localPackageDirectory = findLocalPackageDirectory(workspaceRoot);
  const marker = path.join(workspaceRoot, "package.json");
  if (!fs.existsSync(marker)) {
    return localPackageDirectory ? { found: true, entry: null } : null;
  }

  try {
    const requireFromWorkspace = createRequire(marker);
    // Resolve only the package's public entry. Do not import or execute it.
    const resolvedEntry = requireFromWorkspace.resolve(KIBI_MCP_PACKAGE);
    const owningManifest = findOwningPackageManifest(resolvedEntry);
    if (!owningManifest) return { found: true, entry: null };
    const entry = readDeclaredBinEntry(
      owningManifest.path,
      owningManifest.packageJson,
    );
    return { found: true, entry };
  } catch {
    return localPackageDirectory ? { found: true, entry: null } : null;
  }
}

/**
 * Resolve the project-local kibi-mcp executable through Node's public package
 * entry and its owning manifest. Running the declared bin through
 * process.execPath keeps launching shell-free and Windows-safe. A discovered
 * local package that cannot be resolved completely is deliberately returned as
 * a blocked local installation so global PATH fallback cannot mask it.
 */
function resolveLocalEntry(workspaceRoot) {
  return resolveLocalInstallation(workspaceRoot)?.entry ?? null;
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
    return readDeclaredBinEntry(pkgJsonPath, pkg);
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
  const localInstallation = resolveLocalInstallation(workspaceRoot);
  if (localInstallation?.entry) {
    return {
      command: process.execPath,
      args: [localInstallation.entry],
      via: "project-local",
    };
  }
  if (localInstallation?.found) return null;
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

// >>> kibi-session-proxy: generated from scripts/launcher-shared/kibi-session-proxy.js; run `bun run sync:session-proxy`
/**
 * Kibi MCP session proxy: keeps a host's kibi-mcp attached to the session's
 * current workspace.
 *
 * Hosts start plugin MCP servers in the project a session opened, then may
 * move the session into a git worktree (Claude Code desktop does this). A
 * server attached at startup would then answer every request from the
 * original checkout's branch. MCP roots fix that: before each tool call the
 * proxy asks the client for `roots/list` (Claude Code answers with the
 * session's current directory). When the roots name a different Kibi
 * workspace, it starts kibi-mcp there, replays the client's initialize
 * handshake, retires the previous server once it has answered its in-flight
 * requests, and sends `notifications/tools/list_changed`. Client messages are
 * queued meanwhile so ordering is kept.
 *
 * Following is skipped when the caller disables it (an operator-pinned
 * workspace), when the client does not advertise roots, and whenever the
 * roots query, the new server's start, or its handshake fails: the current
 * server keeps answering. Messages are proxied line by line; anything that is
 * not JSON passes through unchanged.
 *
 * This block is the single source for every host launcher. It is copied
 * verbatim between the kibi-session-proxy markers by
 * `bun run sync:session-proxy`, because launchers must stay self-contained
 * (Codex inlines its launcher as `node -e`). It works as CommonJS and ESM:
 * everything it needs from Node is passed in through `deps`.
 */
function createKibiSessionProxy(deps) {
  const { spawn: defaultSpawn, fileURLToPath } = deps;
  const LAUNCHER_ID_PREFIX = "kibi-launcher:";
  const ROOTS_TIMEOUT_MS = 2000;
  const SWITCH_TIMEOUT_MS = 30000;
  const RETIRE_GRACE_MS = 5000;
  const RETIRE_DRAIN_MAX_MS = 60000;
  const SIGNAL_EXIT_CODES = {
    SIGHUP: 129,
    SIGINT: 130,
    SIGTERM: 143,
    SIGBREAK: 148,
  };

  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function isLauncherId(id) {
    return typeof id === "string" && id.startsWith(LAUNCHER_ID_PREFIX);
  }

  function isResponse(message) {
    return (
      isRecord(message) &&
      !message.method &&
      message.id !== undefined &&
      message.id !== null
    );
  }

  /**
   * Split a stream into lines. `flush()` delivers a trailing partial line
   * when the stream ends, so output without a final newline is not lost.
   */
  function lineReader(onLine) {
    let buffer = "";
    const read = (chunk) => {
      buffer += chunk.toString("utf8");
      for (;;) {
        const newlineIndex = buffer.indexOf("\n");
        if (newlineIndex < 0) break;
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (line.trim().length > 0) onLine(line);
      }
    };
    read.flush = () => {
      const rest = buffer;
      buffer = "";
      if (rest.trim().length > 0) onLine(rest);
    };
    return read;
  }

  /** True when any of `keys` pins the workspace through the environment. */
  function isWorkspacePinned(env, keys) {
    return keys.some(
      (key) => typeof env[key] === "string" && env[key].trim().length > 0,
    );
  }

  /**
   * The workspace named by MCP roots: the first `file://` root for which
   * `resolveWorkspace(directory)` returns a workspace root, else null.
   */
  function workspaceFromRoots(roots, resolveWorkspace) {
    if (!Array.isArray(roots)) return null;
    for (const root of roots) {
      if (!isRecord(root) || typeof root.uri !== "string") continue;
      let directory;
      try {
        directory = fileURLToPath(root.uri);
      } catch {
        continue;
      }
      const workspace = resolveWorkspace(directory);
      if (workspace) return workspace;
    }
    return null;
  }

  /**
   * Proxy a kibi-mcp session. `resolveTarget(root)` returns the
   * `{ command, args }` that starts kibi-mcp for a workspace (or null), and
   * `resolveWorkspace(directory)` maps a root directory to a workspace root
   * (or null). Resolves with the exit code to mirror.
   */
  function proxySession(options) {
    const {
      workspaceRoot,
      initialTarget,
      resolveTarget,
      resolveWorkspace,
      host,
      logPrefix,
      env = process.env,
      spawnImpl = defaultSpawn,
      stdin = process.stdin,
      stdout = process.stdout,
      stderr = process.stderr,
      followRoots = true,
      rootsTimeoutMs = ROOTS_TIMEOUT_MS,
      switchTimeoutMs = SWITCH_TIMEOUT_MS,
      signals = ["SIGINT", "SIGTERM", "SIGHUP"],
    } = options;

    return new Promise((resolveExit) => {
      let exited = false;
      let current = null;
      let initializeRequest = null;
      let clientInitialized = false;
      let clientSupportsRoots = false;
      let nextLauncherId = 1;
      const pendingLauncher = new Map();
      const queue = [];
      let busy = false;

      const log = (text) => stderr.write(`${logPrefix} ${text}\n`);

      const writeClient = (payload) => {
        try {
          stdout.write(
            typeof payload === "string"
              ? `${payload}\n`
              : `${JSON.stringify(payload)}\n`,
          );
        } catch {
          // The client went away; the session is over either way.
        }
      };

      const onClientData = lineReader((line) => {
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          queue.push(line);
          void pump();
          return;
        }
        if (isRecord(message) && isLauncherId(message.id) && !message.method) {
          pendingLauncher.get(message.id)?.(message);
          return;
        }
        queue.push(message);
        void pump();
      });
      const onClientEnd = () => {
        try {
          current?.proc.stdin?.end();
        } catch {
          // Already closed.
        }
      };

      const finish = (code, signal) => {
        if (exited) return;
        exited = true;
        for (const [signalName, handler] of signalHandlers) {
          process.removeListener(signalName, handler);
        }
        stdin.removeListener?.("data", onClientData);
        stdin.removeListener?.("end", onClientEnd);
        stdin.pause?.();
        resolveExit(
          signal
            ? (SIGNAL_EXIT_CODES[signal] ?? 1)
            : code === null || code === undefined
              ? 1
              : code,
        );
      };

      // One handler per signal name, so a signal emitted without its name
      // (as `process.emit("SIGTERM")` does) is still forwarded correctly.
      const signalHandlers = new Map();
      function forwardSignal(signal) {
        if (current && !current.proc.killed) current.proc.kill(signal);
        finish(undefined, signal);
      }

      /** Wait for the response to a request the proxy itself issued. */
      const awaitLauncherResponse = (id, timeoutMs) =>
        new Promise((resolveResponse) => {
          const timer = setTimeout(() => {
            pendingLauncher.delete(id);
            resolveResponse(null);
          }, timeoutMs);
          pendingLauncher.set(id, (message) => {
            clearTimeout(timer);
            pendingLauncher.delete(id);
            resolveResponse(message);
          });
        });

      const startServer = (root, target) => {
        // `inFlight` holds client request ids this server has not answered,
        // so a retired server can finish them before it is shut down.
        const server = {
          root,
          proc: null,
          inFlight: new Set(),
          onDrained: null,
        };
        server.proc = spawnImpl(target.command, [...target.args], {
          cwd: root,
          env: {
            ...env,
            KIBI_WORKSPACE: root,
            ...(host ? { KIBI_MCP_HOST: host } : {}),
          },
          stdio: ["pipe", "pipe", "pipe"],
        });
        server.send = (message) => {
          try {
            server.proc.stdin?.write(
              typeof message === "string"
                ? `${message}\n`
                : `${JSON.stringify(message)}\n`,
            );
          } catch {
            // Its close handler reports the exit.
          }
        };
        const onServerData = lineReader((line) => {
          let message;
          try {
            message = JSON.parse(line);
          } catch {
            if (server === current) writeClient(line);
            return;
          }
          if (isResponse(message) && isLauncherId(message.id)) {
            pendingLauncher.get(message.id)?.(message);
            return;
          }
          if (isResponse(message)) {
            // Answers to client requests are delivered even after a switch.
            server.inFlight.delete(message.id);
            writeClient(message);
            if (server.inFlight.size === 0) server.onDrained?.();
            return;
          }
          if (server === current) writeClient(message);
        });
        server.proc.stdout?.on("data", onServerData);
        server.proc.stdout?.on("end", () => onServerData.flush());
        server.proc.stderr?.on("data", (chunk) => stderr.write(chunk));
        return server;
      };

      /** Shut a server down once it has answered every request sent to it. */
      const retire = (server) => {
        let closed = false;
        const close = () => {
          if (closed) return;
          closed = true;
          server.onDrained = null;
          try {
            server.proc.stdin?.end();
          } catch {
            // Already closed.
          }
          setTimeout(() => {
            if (server.proc.exitCode === null && !server.proc.killed) {
              server.proc.kill("SIGTERM");
            }
          }, RETIRE_GRACE_MS).unref?.();
        };
        if (server.inFlight.size === 0) {
          close();
          return;
        }
        server.onDrained = close;
        setTimeout(close, RETIRE_DRAIN_MAX_MS).unref?.();
      };

      function attach(server) {
        current = server;
        server.proc.once("error", (error) => {
          if (server !== current) return;
          log(`Failed to start kibi-mcp: ${error?.message ?? String(error)}`);
          finish(1);
        });
        server.proc.once("close", (code, signal) => {
          if (server === current) finish(code, signal);
        });
      }

      /** Move to the workspace named by the client's roots, if it changed. */
      const followSessionWorkspace = async () => {
        const rootsId = `${LAUNCHER_ID_PREFIX}roots-${nextLauncherId++}`;
        writeClient({ jsonrpc: "2.0", id: rootsId, method: "roots/list" });
        const rootsResponse = await awaitLauncherResponse(
          rootsId,
          rootsTimeoutMs,
        );
        const desired = workspaceFromRoots(
          rootsResponse?.result?.roots,
          resolveWorkspace,
        );
        if (!desired || desired === current.root) return;

        const nextTarget = resolveTarget(desired);
        if (!nextTarget) {
          log(
            `Session moved to ${desired}, but no kibi-mcp resolves there; staying on ${current.root}`,
          );
          return;
        }
        let next;
        try {
          next = startServer(desired, nextTarget);
        } catch (error) {
          log(
            `Failed to start kibi-mcp for ${desired}: ${error?.message ?? String(error)}; staying on ${current.root}`,
          );
          return;
        }
        next.proc.once("error", () => {});
        const initId = `${LAUNCHER_ID_PREFIX}init-${nextLauncherId++}`;
        next.send({ ...initializeRequest, id: initId });
        const initResponse = await awaitLauncherResponse(
          initId,
          switchTimeoutMs,
        );
        if (!initResponse || initResponse.error) {
          log(
            `kibi-mcp for ${desired} did not complete initialize; staying on ${current.root}`,
          );
          retire(next);
          return;
        }
        if (clientInitialized) {
          next.send({ jsonrpc: "2.0", method: "notifications/initialized" });
        }
        const previous = current;
        attach(next);
        retire(previous);
        log(`Following the session into ${desired} (was ${previous.root})`);
        writeClient({
          jsonrpc: "2.0",
          method: "notifications/tools/list_changed",
        });
      };

      const forward = (message) => {
        if (isRecord(message) && message.method === "initialize") {
          initializeRequest = message;
          clientSupportsRoots = isRecord(message.params?.capabilities?.roots);
        }
        if (
          isRecord(message) &&
          message.method === "notifications/initialized"
        ) {
          clientInitialized = true;
        }
        if (
          isRecord(message) &&
          typeof message.method === "string" &&
          message.id !== undefined &&
          message.id !== null
        ) {
          current.inFlight.add(message.id);
        }
        current.send(message);
      };

      async function pump() {
        if (busy) return;
        busy = true;
        while (queue.length > 0 && !exited) {
          const message = queue.shift();
          if (
            followRoots &&
            clientSupportsRoots &&
            initializeRequest &&
            isRecord(message) &&
            message.method === "tools/call"
          ) {
            try {
              await followSessionWorkspace();
            } catch (error) {
              log(
                `Could not follow the session workspace: ${error?.message ?? String(error)}`,
              );
            }
          }
          forward(message);
        }
        busy = false;
      }

      try {
        attach(startServer(workspaceRoot, initialTarget));
      } catch (error) {
        log(`Failed to start kibi-mcp: ${error?.message ?? String(error)}`);
        resolveExit(1);
        return;
      }
      for (const signalName of signals) {
        const handler = () => forwardSignal(signalName);
        signalHandlers.set(signalName, handler);
        process.once(signalName, handler);
      }
      stdin.on("data", onClientData);
      stdin.on("end", onClientEnd);
    });
  }

  return { isWorkspacePinned, proxySession, workspaceFromRoots };
}
// <<< kibi-session-proxy

const sessionProxy = createKibiSessionProxy({ spawn, fileURLToPath });

/** True when the operator pinned the workspace through the environment. */
function isWorkspacePinned(env = process.env) {
  return sessionProxy.isWorkspacePinned(env, KIBI_WORKSPACE_ENV_KEYS);
}

/** The opted-in Kibi workspace that contains `directory`, ignoring pins. */
function workspaceForDirectory(directory, env = process.env) {
  const searchEnv = { ...env };
  for (const key of KIBI_WORKSPACE_ENV_KEYS) delete searchEnv[key];
  const workspace = resolveKibiWorkspace(directory, searchEnv);
  return workspace.optedIn ? workspace.root : null;
}

/** The Kibi workspace named by the client's MCP roots, or null. */
function workspaceFromRoots(roots, env = process.env) {
  return sessionProxy.workspaceFromRoots(roots, (directory) =>
    workspaceForDirectory(directory, env),
  );
}

/**
 * Proxy kibi-mcp and keep it attached to the session's current workspace
 * (see the kibi-session-proxy block above). An explicit KIBI_WORKSPACE (or
 * alias) pins the workspace and disables following.
 */
function proxyKibiMcp(options = {}) {
  const env = options.env ?? process.env;
  const stderr = options.stderr ?? process.stderr;
  const resolveTarget = (root) => resolveLaunchTarget(root, env);
  const initialTarget = resolveTarget(options.workspaceRoot);
  if (!initialTarget) {
    stderr.write(
      "[kibi-zcode] kibi-mcp is no longer resolvable from the workspace\n",
    );
    return Promise.resolve(1);
  }
  return sessionProxy.proxySession({
    ...options,
    env,
    stderr,
    initialTarget,
    resolveTarget,
    resolveWorkspace: (directory) => workspaceForDirectory(directory, env),
    host: "zcode",
    logPrefix: "[kibi-zcode]",
    followRoots: options.followRoots ?? !isWorkspacePinned(env),
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
  isWorkspacePinned,
  proxyKibiMcp,
  resolveKibiWorkspace,
  resolveLaunchTarget,
  resolveLocalEntry,
  resolveWindowsShimEntry,
  runLauncher,
  serveSilent,
  signalExitCode,
  silentServerResponse,
  workspaceFromRoots,
};
