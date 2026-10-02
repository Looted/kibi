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
