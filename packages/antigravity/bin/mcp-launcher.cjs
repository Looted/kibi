#!/usr/bin/env node
/**
 * Kibi Antigravity plugin MCP launcher.
 *
 * Starting Kibi MCP through this launcher keeps both workspace-scoped and
 * globally installed (Marketplace) Antigravity plugins quiet outside Kibi
 * workspaces while automatically attaching to the opened Kibi project:
 *
 * - workspace-scoped Kibi repo -> resolves project-local `kibi-mcp` immediately
 *   and proxies stdio directly;
 * - global Marketplace install (cwd is pluginRoot, outside any repo) -> handles
 *   MCP `initialize`, queries the client via `roots/list` (and listens for
 *   `notifications/roots/list_changed`), and if an opened root owns
 *   `.kb/manifest.json`, spawns that project's `kibi-mcp`, replays the
 *   handshake, and proxies all traffic transparently;
 * - unconfigured workspace     -> serves a silent MCP server with zero tools;
 * - configured but missing     -> serves the silent server with an instructions
 *   hint instead of failing the MCP handshake.
 *
 * The launcher never initializes or writes to the workspace.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { createRequire } = require("node:module");
const { fileURLToPath } = require("node:url");

const KIBI_WORKSPACE_ENV_KEYS = [
  "KIBI_WORKSPACE",
  "KIBI_PROJECT_ROOT",
  "KIBI_ROOT",
];
const SERVER_NAME = "kibi-antigravity-launcher";
const SERVER_VERSION = "0.1.0";
const PROBE_TIMEOUT_MS = 8000;
const ROOTS_TIMEOUT_MS = 2500;
const CHILD_INIT_TIMEOUT_MS = 10000;
const KIBI_MCP_PACKAGE = "kibi-mcp";
const LAUNCHER_ROOTS_ID = "__kibi_launcher_roots__";
const LAUNCHER_INIT_ID = "__kibi_launcher_init__";

const MISSING_KIBI_MCP_INSTRUCTIONS =
  "This workspace is configured for Kibi (.kb/manifest.json found), but no " +
  "kibi-mcp executable is resolvable from the workspace. Install kibi-mcp " +
  "in the project (for example: npm install --save-dev kibi-mcp) or globally, " +
  "then reload the Antigravity MCP server. No KB tools are exposed in this session.";

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
 * Mirror of packages/agent-core/src/workspace-optin.ts. A workspace is opted in
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

function rootUriToPath(uri) {
  if (typeof uri !== "string" || uri.trim().length === 0) return null;
  if (uri.startsWith("file://")) {
    try {
      return fileURLToPath(uri);
    } catch {
      return null;
    }
  }
  return path.isAbsolute(uri) ? uri : null;
}

function resolveWorkspaceFromRoots(roots, env = process.env) {
  if (!Array.isArray(roots)) return null;
  for (const entry of roots) {
    const uri = isRecord(entry) ? entry.uri : entry;
    const directory = rootUriToPath(uri);
    if (!directory) continue;
    const resolved = resolveKibiWorkspace(directory, env);
    if (resolved.optedIn) return resolved.root;
  }
  return null;
}

function silentServerResponse(message, options = {}) {
  if (!isRecord(message) || typeof message.method !== "string") return null;
  const hasId = message.id !== undefined && message.id !== null;
  const { instructions, toolMessage, advertiseToolsListChanged } = options;

  if (!hasId) return null;
  if (message.method === "initialize") {
    const params = isRecord(message.params) ? message.params : {};
    const capabilities = advertiseToolsListChanged
      ? { tools: { listChanged: true } }
      : {};
    const result = {
      protocolVersion:
        typeof params.protocolVersion === "string"
          ? params.protocolVersion
          : "2025-06-18",
      capabilities,
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

function resolveLocalEntry(workspaceRoot) {
  return resolveLocalInstallation(workspaceRoot)?.entry ?? null;
}

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

function globalFallbackNotice(prefix, workspaceRoot, target) {
  const where = target.args[0] ?? target.command;
  return `[${prefix}] No project-local kibi-mcp in ${workspaceRoot}; using the global install at ${where}. Install kibi-mcp in the project to pin its version.\n`;
}

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
      "[kibi-antigravity] kibi-mcp is no longer resolvable from the workspace\n",
    );
    return Promise.resolve(1);
  }
  if (target.via !== "project-local") {
    stderr.write(
      globalFallbackNotice("kibi-antigravity", workspaceRoot, target),
    );
  }
  const childEnv = {
    ...env,
    KIBI_MCP_ATTACH_ROOT: workspaceRoot,
    KIBI_MCP_HOST: "antigravity",
  };
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
        `[kibi-antigravity] Failed to start kibi-mcp: ${error?.message ?? String(error)}\n`,
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
        `[kibi-antigravity] Failed to start kibi-mcp: ${error?.message ?? String(error)}\n`,
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

/**
 * Deferred MCP server for global Marketplace installs where `cwd` is the
 * plugin directory rather than the user's opened repository.
 *
 * After `initialize`, if the host advertises MCP `roots` capability, we send
 * `roots/list` to discover the opened workspace(s). When a root owns
 * `.kb/manifest.json`, we spawn its `kibi-mcp`, replay the saved `initialize`
 * handshake internally, and transparently proxy all traffic (including queued
 * `tools/list` / `tools/call` requests). In non-Kibi workspaces we remain a
 * silent zero-tool server.
 */
function serveDeferred(options = {}) {
  const {
    env = process.env,
    spawnImpl = spawn,
    stdin = process.stdin,
    stdout = process.stdout,
    stderr = process.stderr,
    rootsTimeoutMs = ROOTS_TIMEOUT_MS,
    childInitTimeoutMs = CHILD_INIT_TIMEOUT_MS,
  } = options;

  const write = (payload) => {
    try {
      stdout.write(`${JSON.stringify(payload)}\n`);
    } catch {
      // Client disconnected.
    }
  };

  return new Promise((resolveExit) => {
    let exited = false;
    let clientSupportsRoots = false;
    let savedInitParams = { protocolVersion: "2025-06-18", capabilities: {} };
    let discoveryState = "idle"; // "idle" | "awaiting_roots" | "starting_child" | "proxying" | "silent"
    let silentReason = UNCONFIGURED_WORKSPACE_TOOL_MESSAGE;
    let answeredToolsSilently = false;
    let pendingRequests = [];
    let rootsTimer = null;
    let activeInitTimer = null;
    let activeChild = null;

    const finish = (code = 0) => {
      if (exited) return;
      exited = true;
      if (rootsTimer) clearTimeout(rootsTimer);
      if (activeInitTimer) clearTimeout(activeInitTimer);
      if (activeChild && !activeChild.killed) {
        try {
          activeChild.kill("SIGTERM");
        } catch {
          // Ignore.
        }
      }
      for (const signalName of ["SIGINT", "SIGTERM", "SIGHUP"]) {
        process.removeListener(signalName, forwardSignal);
      }
      resolveExit(code);
    };

    const forwardSignal = (signal) => {
      if (activeChild && !activeChild.killed) activeChild.kill(signal);
      finish(signalExitCode(signal));
    };
    for (const signalName of ["SIGINT", "SIGTERM", "SIGHUP"]) {
      process.once(signalName, forwardSignal);
    }

    const answerSilently = (message) => {
      if (message.method === "tools/list") answeredToolsSilently = true;
      const answer = silentServerResponse(message, {
        toolMessage: silentReason,
        advertiseToolsListChanged: true,
      });
      if (answer) write(answer);
    };

    const flushPendingSilently = () => {
      const queued = pendingRequests;
      pendingRequests = [];
      for (const msg of queued) answerSilently(msg);
    };

    const attachChildWorkspace = async (workspaceRoot) => {
      discoveryState = "starting_child";
      const probe = await probeKibiMcp({ cwd: workspaceRoot, env, spawnImpl });
      if (exited) return;
      if (probe.status !== "available") {
        discoveryState = "silent";
        silentReason =
          probe.status === "launch_failed"
            ? `${LAUNCH_FAILED_INSTRUCTIONS_PREFIX}${probe.detail ?? "unknown error"}`
            : MISSING_KIBI_MCP_INSTRUCTIONS;
        flushPendingSilently();
        return;
      }

      const target = resolveLaunchTarget(workspaceRoot, env);
      if (!target) {
        discoveryState = "silent";
        silentReason = MISSING_KIBI_MCP_INSTRUCTIONS;
        flushPendingSilently();
        return;
      }
      if (target.via !== "project-local") {
        stderr.write(
          globalFallbackNotice("kibi-antigravity", workspaceRoot, target),
        );
      }

      let child;
      try {
        child = spawnImpl(target.command, [...target.args], {
          cwd: workspaceRoot,
          env: {
            ...env,
            KIBI_MCP_ATTACH_ROOT: workspaceRoot,
            KIBI_MCP_HOST: "antigravity",
          },
          stdio: ["pipe", "pipe", "pipe"],
        });
      } catch (error) {
        discoveryState = "silent";
        silentReason = `${LAUNCH_FAILED_INSTRUCTIONS_PREFIX}${error?.message ?? String(error)}`;
        flushPendingSilently();
        return;
      }

      activeChild = child;
      let childReady = false;
      const clearInitTimer = () => {
        if (activeInitTimer === initTimer) activeInitTimer = null;
        clearTimeout(initTimer);
      };
      const initTimer = setTimeout(() => {
        if (childReady) return;
        activeInitTimer = null;
        try {
          child.kill("SIGKILL");
        } catch {
          // Ignore.
        }
        activeChild = null;
        discoveryState = "silent";
        silentReason = `${LAUNCH_FAILED_INSTRUCTIONS_PREFIX}child kibi-mcp initialize timed out`;
        flushPendingSilently();
      }, childInitTimeoutMs);
      activeInitTimer = initTimer;

      child.stderr.on("data", (chunk) => stderr.write(chunk));
      child.once("error", (error) => {
        clearInitTimer();
        if (!childReady) {
          activeChild = null;
          discoveryState = "silent";
          silentReason = `${LAUNCH_FAILED_INSTRUCTIONS_PREFIX}${error?.message ?? String(error)}`;
          flushPendingSilently();
        } else {
          finish(1);
        }
      });
      child.once("close", (code, signal) => {
        clearInitTimer();
        if (!childReady) {
          activeChild = null;
          discoveryState = "silent";
          silentReason = `${LAUNCH_FAILED_INSTRUCTIONS_PREFIX}child exited with code ${code ?? signal}`;
          flushPendingSilently();
        } else {
          finish(
            signal
              ? signalExitCode(signal)
              : code === null || code === undefined
                ? 0
                : code,
          );
        }
      });

      child.stdout.on(
        "data",
        createLineReader((line) => {
          let msg;
          try {
            msg = JSON.parse(line);
          } catch {
            stdout.write(`${line}\n`);
            return;
          }
          if (!childReady && msg.id === LAUNCHER_INIT_ID) {
            clearInitTimer();
            childReady = true;
            discoveryState = "proxying";
            try {
              child.stdin.write(
                `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
              );
            } catch {
              // Handled by close.
            }
            const queued = pendingRequests;
            pendingRequests = [];
            for (const pending of queued) {
              try {
                child.stdin.write(`${JSON.stringify(pending)}\n`);
              } catch {
                // Handled by close.
              }
            }
            if (answeredToolsSilently) {
              write({
                jsonrpc: "2.0",
                method: "notifications/tools/list_changed",
              });
            }
            return;
          }
          stdout.write(`${line}\n`);
        }),
      );

      try {
        child.stdin.write(
          `${JSON.stringify({
            jsonrpc: "2.0",
            id: LAUNCHER_INIT_ID,
            method: "initialize",
            params: savedInitParams,
          })}\n`,
        );
      } catch {
        // Error handler will settle state.
      }
    };

    const requestClientRoots = () => {
      if (
        discoveryState === "awaiting_roots" ||
        discoveryState === "starting_child" ||
        discoveryState === "proxying"
      ) {
        return;
      }
      if (!clientSupportsRoots) {
        discoveryState = "silent";
        flushPendingSilently();
        return;
      }
      discoveryState = "awaiting_roots";
      if (rootsTimer) clearTimeout(rootsTimer);
      rootsTimer = setTimeout(() => {
        if (discoveryState !== "awaiting_roots") return;
        discoveryState = "silent";
        flushPendingSilently();
      }, rootsTimeoutMs);
      write({
        jsonrpc: "2.0",
        id: LAUNCHER_ROOTS_ID,
        method: "roots/list",
        params: {},
      });
    };

    const handleMessage = (message) => {
      if (!isRecord(message)) return;

      // Response to our own roots/list probe.
      if (message.id === LAUNCHER_ROOTS_ID && message.method === undefined) {
        if (rootsTimer) {
          clearTimeout(rootsTimer);
          rootsTimer = null;
        }
        if (discoveryState !== "awaiting_roots") return;
        const roots = isRecord(message.result) ? message.result.roots : [];
        const workspaceRoot = resolveWorkspaceFromRoots(roots, env);
        if (workspaceRoot) {
          void attachChildWorkspace(workspaceRoot);
        } else {
          discoveryState = "silent";
          silentReason = UNCONFIGURED_WORKSPACE_TOOL_MESSAGE;
          flushPendingSilently();
        }
        return;
      }

      if (discoveryState === "proxying" && activeChild) {
        try {
          activeChild.stdin.write(`${JSON.stringify(message)}\n`);
        } catch {
          // Child close handler exits.
        }
        return;
      }

      if (message.method === "initialize") {
        const params = isRecord(message.params) ? message.params : {};
        savedInitParams = params;
        clientSupportsRoots = Boolean(
          isRecord(params.capabilities) && params.capabilities.roots,
        );
        const answer = silentServerResponse(message, {
          advertiseToolsListChanged: true,
        });
        if (answer) write(answer);
        return;
      }

      if (message.method === "notifications/initialized") {
        requestClientRoots();
        return;
      }

      if (message.method === "notifications/roots/list_changed") {
        if (discoveryState === "silent" || discoveryState === "idle") {
          requestClientRoots();
        }
        return;
      }

      if (message.method === "ping") {
        const answer = silentServerResponse(message);
        if (answer) write(answer);
        return;
      }

      // If a tools/call carries an explicit workspaceRoot stamped by PreToolUse,
      // attach dynamically even when the client did not advertise roots.
      if (
        message.method === "tools/call" &&
        (discoveryState === "idle" || discoveryState === "silent")
      ) {
        const callArgs = isRecord(message.params?.arguments)
          ? message.params.arguments
          : {};
        const requestedRoot =
          typeof callArgs.workspaceRoot === "string"
            ? callArgs.workspaceRoot.trim()
            : "";
        if (requestedRoot) {
          const resolved = resolveKibiWorkspace(requestedRoot, env);
          if (resolved.optedIn) {
            pendingRequests.push(message);
            void attachChildWorkspace(resolved.root);
            return;
          }
        }
      }

      // If roots discovery hasn't started yet and client supports roots, start
      // it now and queue this request until discovery resolves.
      if (discoveryState === "idle" && clientSupportsRoots) {
        pendingRequests.push(message);
        requestClientRoots();
        return;
      }

      if (
        discoveryState === "awaiting_roots" ||
        discoveryState === "starting_child"
      ) {
        pendingRequests.push(message);
        return;
      }

      answerSilently(message);
    };

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
        handleMessage(message);
      }),
    );
    stdin.on("end", () => {
      if (discoveryState === "proxying" && activeChild) {
        try {
          activeChild.stdin.end();
        } catch {
          // Already closed.
        }
      } else {
        finish(0);
      }
    });
    stdin.on("close", () => {
      if (discoveryState !== "proxying") finish(0);
    });
    stdout.on("error", () => finish(0));
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

async function runLauncher(options = {}) {
  const {
    env = process.env,
    cwd = env.ANTIGRAVITY_WORKSPACE?.trim() ||
      env.PLUGIN_WORKSPACE?.trim() ||
      process.cwd(),
    stdin = process.stdin,
    stdout = process.stdout,
    spawnImpl = spawn,
    stderr = process.stderr,
    rootsTimeoutMs = ROOTS_TIMEOUT_MS,
    childInitTimeoutMs = CHILD_INIT_TIMEOUT_MS,
  } = options;

  let workspace = resolveKibiWorkspace(cwd, env);
  if (!workspace.optedIn && env.PLUGIN_ROOT?.trim()) {
    const fromPlugin = resolveKibiWorkspace(env.PLUGIN_ROOT, env);
    if (fromPlugin.optedIn) workspace = fromPlugin;
  }

  if (!workspace.optedIn) {
    return serveDeferred({
      env,
      spawnImpl,
      stdin,
      stdout,
      stderr,
      rootsTimeoutMs,
      childInitTimeoutMs,
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
  LAUNCHER_INIT_ID,
  LAUNCHER_ROOTS_ID,
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
  resolveWorkspaceFromRoots,
  rootUriToPath,
  runLauncher,
  serveDeferred,
  serveSilent,
  signalExitCode,
  silentServerResponse,
};
