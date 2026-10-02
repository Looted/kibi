#!/usr/bin/env node

/**
 * Consumer-side entrypoint for Cursor's MCP process launcher.
 */

/**
 * Launch the kibi-mcp package installed by the consumer project.
 *
 * Cursor resolves this command from the plugin-root manifest, but the process
 * cwd is host-controlled and is not a reliable consumer workspace (it may be
 * the plugin directory or another host directory). This adapter deliberately
 * knows nothing about the Kibi source tree: it resolves the unrelated consumer
 * workspace from Cursor's workspace-folder data or explicit environment,
 * finds that workspace's kibi-mcp package, and runs its declared bin with the
 * consumer as both cwd and KIBI_WORKSPACE.
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_NAME = "kibi-mcp";
const PLACEHOLDER_PATTERN = /\$\{[^}]+\}/;
const SIGNAL_EXIT_CODES = {
  SIGHUP: 129,
  SIGINT: 130,
  SIGTERM: 143,
  SIGBREAK: 148,
};

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function isDirectory(path) {
  try {
    return fs.statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function isPlaceholder(value) {
  return PLACEHOLDER_PATTERN.test(value.trim());
}

function normalizeWorkspacePath(value, baseDirectory) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed || isPlaceholder(trimmed)) return null;
  const candidate = isAbsolute(trimmed)
    ? trimmed
    : resolve(baseDirectory, trimmed);
  return isDirectory(candidate) ? resolve(candidate) : null;
}

/**
 * Cursor has used both a platform-delimited string and a JSON-like list for
 * workspace-folder environment values. Accept both without treating a
 * literal unresolved placeholder as a path relative to the plugin directory.
 */
export function parseWorkspaceFolderPaths(value) {
  if (typeof value !== "string" || !value.trim()) return [];
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === "string");
      }
    } catch {
      // Fall through to the platform-delimited form.
    }
  }

  const separator = process.platform === "win32" ? ";" : ":";
  const separated = trimmed.split(separator);
  const values =
    separated.length === 1 && trimmed.includes(",")
      ? trimmed.split(",")
      : separated;
  return values
    .flatMap((item) =>
      process.platform === "win32" ? item.split(",") : [item],
    )
    .map((item) => item.trim())
    .filter(Boolean);
}

export function nextAncestorDirectory(current) {
  const parent = dirname(current);
  return parent === current ? undefined : parent;
}

export function packageJsonForResolvedFile(startPath) {
  let current = resolve(startPath);
  try {
    if (!fs.statSync(current).isDirectory()) current = dirname(current);
  } catch {
    current = dirname(current);
  }

  while (current !== undefined) {
    const packageJsonPath = join(current, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = readJson(packageJsonPath);
        if (packageJson.name === PACKAGE_NAME) {
          return { packageJsonPath, packageRoot: current, packageJson };
        }
      } catch {
        // Keep walking if a parent package manifest is malformed.
      }
    }
    current = nextAncestorDirectory(current);
  }
  return null;
}

function isWithinRoot(rootPath, candidatePath) {
  const relativePath = relative(resolve(rootPath), resolve(candidatePath));
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !isAbsolute(relativePath))
  );
}

export function hasConsumerNodeModulesLink(workspaceRoot, packageRoot) {
  try {
    const linkPath = join(workspaceRoot, "node_modules", PACKAGE_NAME);
    const linkedRoot = fs.realpathSync(linkPath);
    return (
      isWithinRoot(linkedRoot, packageRoot) ||
      isWithinRoot(packageRoot, linkedRoot)
    );
  } catch {
    return false;
  }
}

export function isProjectScopedPackage(workspaceRoot, packageRoot) {
  if (isWithinRoot(workspaceRoot, packageRoot)) return true;

  // pnpm can expose a package through a symlink whose realpath is outside the
  // workspace. Require that the consumer's node_modules entry points to it;
  // this rejects arbitrary NODE_PATH/global packages while retaining that
  // package-manager layout. Yarn PnP has no node_modules entry, so only its
  // active resolver hook may authorize an out-of-tree package.
  return (
    hasConsumerNodeModulesLink(workspaceRoot, packageRoot) ||
    Boolean(process.versions.pnp)
  );
}

/**
 * Resolve the consumer's package through Node's project-scoped resolver. This
 * works with npm, pnpm, Yarn, and Bun layouts, unlike a hard-coded .bin path.
 */
export function resolveProjectLocalMcp(workspaceRoot) {
  const root = resolve(workspaceRoot);
  const consumerRequire = createRequire(join(root, "package.json"));
  let packageInfo;

  try {
    packageInfo = packageJsonForResolvedFile(
      consumerRequire.resolve(`${PACKAGE_NAME}/package.json`),
    );
  } catch {
    try {
      packageInfo = packageJsonForResolvedFile(
        consumerRequire.resolve(PACKAGE_NAME),
      );
    } catch {
      packageInfo = null;
    }
  }

  if (!packageInfo) {
    throw new Error(
      `[KIBI-CURSOR] No project-local ${PACKAGE_NAME} package was found for ${root}. ` +
        `Install it in that workspace (for example: npm install --save-dev ${PACKAGE_NAME}) and reload Cursor.`,
    );
  }

  if (!isProjectScopedPackage(root, packageInfo.packageRoot)) {
    throw new Error(
      `[KIBI-CURSOR] Resolved ${PACKAGE_NAME} outside the consumer workspace: ${packageInfo.packageRoot}. Install it in ${root}; global, plugin-local, and ambient NODE_PATH packages are not supported.`,
    );
  }

  const declaredBin = packageInfo.packageJson.bin;
  const binEntry =
    typeof declaredBin === "string"
      ? declaredBin
      : declaredBin && typeof declaredBin === "object"
        ? declaredBin[PACKAGE_NAME]
        : undefined;
  if (typeof binEntry !== "string" || !binEntry) {
    throw new Error(
      `[KIBI-CURSOR] Project-local ${PACKAGE_NAME} does not declare a ${PACKAGE_NAME} executable.`,
    );
  }

  const binPath = resolve(packageInfo.packageRoot, binEntry);
  if (!fs.existsSync(binPath)) {
    throw new Error(
      `[KIBI-CURSOR] Project-local ${PACKAGE_NAME} declares a missing executable: ${binPath}. Reinstall the workspace dependency and reload Cursor.`,
    );
  }

  return {
    packageRoot: packageInfo.packageRoot,
    packageJsonPath: packageInfo.packageJsonPath,
    packageJson: packageInfo.packageJson,
    binPath,
  };
}

export function hasDeclaredProjectDependency(workspaceRoot) {
  const packageJsonPath = join(workspaceRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) return false;
  try {
    const packageJson = readJson(packageJsonPath);
    return [
      packageJson.dependencies,
      packageJson.devDependencies,
      packageJson.optionalDependencies,
      packageJson.peerDependencies,
    ].some((dependencies) =>
      Boolean(
        dependencies &&
          typeof dependencies === "object" &&
          dependencies[PACKAGE_NAME],
      ),
    );
  } catch {
    return false;
  }
}

function isDemonstrablyProjectWorkspace(workspaceRoot) {
  return (
    fs.existsSync(join(workspaceRoot, ".git")) ||
    fs.existsSync(join(workspaceRoot, ".kb")) ||
    hasDeclaredProjectDependency(workspaceRoot)
  );
}

function usableWorkspaceCandidates(values, baseDirectory) {
  return values
    .map((value) => normalizeWorkspacePath(value, baseDirectory))
    .filter((value, index, all) => value && all.indexOf(value) === index)
    .filter((value) => {
      try {
        resolveProjectLocalMcp(value);
        return true;
      } catch {
        return false;
      }
    });
}

function chooseSingleWorkspace(candidates, source) {
  if (candidates.length > 1) {
    throw new Error(
      `[KIBI-CURSOR] ${source} names multiple workspaces with project-local ${PACKAGE_NAME}: ${candidates.join(", ")}. Open a single-root workspace or set KIBI_WORKSPACE to one root.`,
    );
  }
  return candidates[0];
}

/** Resolve the consumer workspace without ever defaulting to the plugin root. */
export function resolveWorkspaceRoot(explicitWorkspace, options = {}) {
  const cwd = resolve(options.cwd ?? process.cwd());
  const env = options.env ?? process.env;

  if (typeof explicitWorkspace === "string" && explicitWorkspace.trim()) {
    const explicit = normalizeWorkspacePath(explicitWorkspace, cwd);
    // Cursor can leave ${workspaceFolder} unresolved. It is invalid, so allow
    // the environment fallbacks below rather than resolving it under cwd.
    if (explicit) return explicit;
  }

  const folderCandidates = chooseSingleWorkspace(
    usableWorkspaceCandidates(
      parseWorkspaceFolderPaths(env.WORKSPACE_FOLDER_PATHS),
      cwd,
    ),
    "WORKSPACE_FOLDER_PATHS",
  );
  if (folderCandidates) return folderCandidates;

  for (const name of ["KIBI_WORKSPACE", "CURSOR_WORKSPACE"]) {
    const candidate = chooseSingleWorkspace(
      usableWorkspaceCandidates([env[name]], cwd),
      name,
    );
    if (candidate) return candidate;
  }

  // A plugin installation is commonly the current cwd. Only use it when
  // project markers make it demonstrably a consumer project and its local
  // package can be resolved; never use an ambient/plugin-local package merely
  // because it happens to be on disk.
  if (isDemonstrablyProjectWorkspace(cwd)) {
    try {
      resolveProjectLocalMcp(cwd);
      return cwd;
    } catch {
      // Continue to the actionable error below.
    }
  }

  throw new Error(
    `[KIBI-CURSOR] Unable to determine a consumer workspace. Cursor must provide \${workspaceFolder}, WORKSPACE_FOLDER_PATHS, KIBI_WORKSPACE, or CURSOR_WORKSPACE; the selected workspace must contain project-local ${PACKAGE_NAME}.`,
  );
}

export function signalExitCode(signal) {
  return SIGNAL_EXIT_CODES[signal] ?? 1;
}

export function isLaunchEntrypoint(argv1, moduleUrl) {
  const entrypoint = argv1 ? resolve(argv1) : undefined;
  return entrypoint === resolve(fileURLToPath(moduleUrl));
}

export async function runLaunchEntrypoint(
  argv = process.argv.slice(2),
  env = process.env,
) {
  const exitCode = await launchKibiMcp(argv, env);
  process.exitCode = exitCode;
  return exitCode;
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

/**
 * The Kibi workspace that contains `directory`: the nearest ancestor owning
 * `.kb/manifest.json`, without crossing a `.git` boundary. Null otherwise.
 */
export function workspaceForDirectory(directory) {
  let current = resolve(directory);
  for (;;) {
    if (fs.existsSync(join(current, ".kb", "manifest.json"))) return current;
    if (fs.existsSync(join(current, ".git"))) return null;
    const parent = nextAncestorDirectory(current);
    if (parent === undefined) return null;
    current = parent;
  }
}

/** The Kibi workspace named by the client's MCP roots, or null. */
export function workspaceFromRoots(roots) {
  return sessionProxy.workspaceFromRoots(roots, workspaceForDirectory);
}

/**
 * Run the project-local MCP server and keep it attached to the session's
 * current workspace (see the kibi-session-proxy block above). KIBI_WORKSPACE
 * pins the workspace and disables following.
 */
export function launchKibiMcp(
  argv = process.argv.slice(2),
  env = process.env,
  spawnImpl = spawn,
) {
  const [explicitWorkspace, ...childArgs] = argv;
  let workspaceRoot;
  let projectLocal;
  try {
    workspaceRoot = resolveWorkspaceRoot(explicitWorkspace, {
      cwd: process.cwd(),
      env,
    });
    projectLocal = resolveProjectLocalMcp(workspaceRoot);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    return Promise.resolve(1);
  }

  const resolveTarget = (root) => {
    try {
      const local = resolveProjectLocalMcp(root);
      return { command: process.execPath, args: [local.binPath, ...childArgs] };
    } catch {
      return null;
    }
  };
  return sessionProxy.proxySession({
    workspaceRoot,
    initialTarget: {
      command: process.execPath,
      args: [projectLocal.binPath, ...childArgs],
    },
    resolveTarget,
    resolveWorkspace: workspaceForDirectory,
    // Identifies the host on usage rows. This never enables telemetry;
    // KIBI_DIAGNOSTIC_MODE stays the operator's explicit opt-in.
    host: "cursor",
    logPrefix: "[KIBI-CURSOR]",
    env,
    spawnImpl,
    followRoots: !(
      typeof env.KIBI_WORKSPACE === "string" && env.KIBI_WORKSPACE.trim()
    ),
    signals:
      process.platform === "win32"
        ? ["SIGBREAK"]
        : ["SIGHUP", "SIGINT", "SIGTERM", "SIGBREAK"],
  });
}

export async function runLaunchIfEntrypoint(
  isEntrypoint = isLaunchEntrypoint(process.argv[1], import.meta.url),
  start = runLaunchEntrypoint,
) {
  if (!isEntrypoint) return;
  await start();
}

await runLaunchIfEntrypoint();
