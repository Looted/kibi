// kibi-runtime.mjs — runtime detection and spawn planning for launching Kibi
// from a host process (the Mistral Vibe MCP server, context hooks, or the
// kibi.mjs CLI wrapper; other agent hosts can reuse it by setting
// KIBI_MCP_HOST to their own name).
//
// Kibi needs Node.js 22+ and SWI-Prolog 9+. The bundled SWI-Prolog covers
// Linux, macOS and Windows x64, so Kibi runs natively by default; a
// \\wsl.localhost\<distro> UNC workspace (or KIBI_FORCE_WSL=1) runs inside
// WSL instead. This module decides per workspace whether to spawn Kibi
// directly with the current Node or through `wsl.exe --cd <path> --exec ...`.
//
// Security rule: WSL commands are NEVER built as shell strings. The workspace
// path, the node binary and every CLI argument are passed as literal argv
// entries to `wsl.exe --exec`, so a path containing $(...), backticks or
// quotes can never be shell-injected. The only shell string ever executed is
// a constant probe command with no interpolated values.
import { spawn, spawnSync } from "node:child_process";
import {
  appendFileSync,
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export const KIBI_MIN_NODE_MAJOR = 22;
export const DEFAULT_MCP_HOST = "vibe";
/** Exit code meaning "this workspace has no Kibi KB" (hooks skip on it). */
export const NO_KIBI_EXIT_CODE = 3;

/** The MCP host name reported to the kibi-mcp server (env-overridable). */
export function resolveMcpHost(env = process.env) {
  const value = String(env.KIBI_MCP_HOST ?? "").trim();
  return value || DEFAULT_MCP_HOST;
}

function parseMajor(text) {
  const match = /(\d+)\.\d+\.\d+/.exec(String(text));
  return match ? Number(match[1]) : 0;
}

function userTag() {
  const raw =
    process.env.USERNAME ||
    process.env.USER ||
    (typeof process.getuid === "function" ? String(process.getuid()) : "user");
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function perUserTmpFile(name) {
  return join(tmpdir(), `kibi-vibe-${name}-${userTag()}`);
}

// ---------------------------------------------------------------------------
// Best-effort per-user caches. They only exist to keep hook runs cheap (one
// wsl.exe probe at most per TTL, zero when warm); every failure is ignored.
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 120_000;

function readRuntimeCache() {
  try {
    const parsed = JSON.parse(
      readFileSync(perUserTmpFile("runtime.json"), "utf8"),
    );
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeRuntimeCache(patch) {
  try {
    const merged = { ...readRuntimeCache(), ...patch };
    const fd = openSync(perUserTmpFile("runtime.json"), "w", 0o600);
    try {
      writeFileSync(fd, JSON.stringify(merged));
    } finally {
      closeSync(fd);
    }
  } catch {
    // caching must never break a launch
  }
}

/**
 * @typedef {{ nodeWslPath: string, major: number }} WslNodeProbe
 */

/** In-process probe cache keyed by distro (or "default"). */
const probeCache = new Map();

/**
 * Probe the Node.js available inside a WSL distribution (default distro when
 * `distro` is null). One single wsl.exe call; the command string is a
 * constant — no value is ever interpolated into it. Returns
 * { nodeWslPath, major } when Node.js >= KIBI_MIN_NODE_MAJOR, else null.
 * Result is cached in-process and in a per-user cache file (0600).
 *
 * @param {string | null} [distro]
 * @param {{ env?: NodeJS.ProcessEnv, spawnSyncImpl?: typeof spawnSync, platform?: string }} [options]
 * @returns {WslNodeProbe | null}
 */
export function probeWslNode(
  distro = null,
  {
    env = process.env,
    spawnSyncImpl = spawnSync,
    platform = process.platform,
  } = {},
) {
  if (platform !== "win32") return null;
  const key = distro ?? "default";
  if (probeCache.has(key)) return probeCache.get(key);
  const cached = readRuntimeCache().wslNode?.[key];
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    probeCache.set(key, cached.value);
    return cached.value;
  }
  let result = null;
  try {
    const args = [];
    if (distro) args.push("-d", distro);
    // Login shell so nvm-installed Node.js is on PATH; constant string only.
    // Falls back to the newest nvm install when the login PATH has no node.
    args.push(
      "--exec",
      "bash",
      "-lc",
      'command -v node 2>/dev/null || ls -d "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | sort -V | tail -n 1; node --version 2>/dev/null || true',
    );
    const out = spawnSyncImpl("wsl.exe", args, { encoding: "utf8" });
    if (!out.error && out.status === 0) {
      const lines = String(out.stdout ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const nodeWslPath = lines[0]?.startsWith("/") ? lines[0] : null;
      const major = parseMajor(lines[1] ?? "");
      if (nodeWslPath && major >= KIBI_MIN_NODE_MAJOR) {
        result = { nodeWslPath, major };
      }
    }
  } catch {
    result = null;
  }
  probeCache.set(key, result);
  writeRuntimeCache({
    wslNode: {
      ...readRuntimeCache().wslNode,
      [key]: { at: Date.now(), value: result },
    },
  });
  return result;
}

/**
 * Parse a \\wsl.localhost\<distro>\... or \\wsl$\<distro>\... UNC path into
 * the WSL-side path and the distribution name. Pure; returns null when the
 * input is not a WSL UNC path.
 */
export function parseWslUnc(winPath) {
  const normalized = String(winPath).replace(/\//g, "\\");
  const unc = /^\\+wsl(?:\.localhost|\$)\\+([^\\]+)\\+(.+)$/i.exec(normalized);
  if (!unc) return null;
  return { distro: unc[1], wslPath: `/${unc[2].replace(/\\/g, "/")}` };
}

/**
 * Convert a Windows path to the path WSL sees. WSL UNC paths convert purely;
 * drive-letter paths go through `wsl.exe wslpath` (cached per user). Returns
 * null when conversion is impossible — callers must treat that as a hard
 * error, never silently fall back to another directory.
 */
export function toWslPath(winPath, { spawnSyncImpl = spawnSync } = {}) {
  const unc = parseWslUnc(winPath);
  if (unc) return unc.wslPath;
  const normalized = String(winPath).replace(/\//g, "\\");
  if (!/^[a-zA-Z]:[\\/]/.test(normalized)) return null;
  const cacheKey = normalized.toLowerCase();
  const cached = readRuntimeCache().wslpath?.[cacheKey];
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
  const out = spawnSyncImpl(
    "wsl.exe",
    ["wslpath", normalized.replace(/\\/g, "/")],
    {
      encoding: "utf8",
    },
  );
  if (out.error || out.status !== 0) return null;
  const converted = out.stdout.trim();
  if (!converted) return null;
  writeRuntimeCache({
    wslpath: {
      ...readRuntimeCache().wslpath,
      [cacheKey]: { at: Date.now(), value: converted },
    },
  });
  return converted;
}

/** A workspace is opted in only when its Kibi project root owns .kb/manifest.json. */
export function isKibiWorkspace(root) {
  return existsSync(join(resolve(root), ".kb", "manifest.json"));
}

function isWithin(root, target) {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/**
 * Resolve the Kibi workspace for a launch. Hosts do not always spawn MCP
 * servers or hooks with the session folder as cwd (Vibe Desktop spawns them
 * from its own install directory), so in order:
 *   1. KIBI_WORKSPACE, then KIBI_PROJECT_ROOT, then KIBI_ROOT (trimmed, resolved);
 *   2. the cwd or its nearest ancestor that owns .kb/manifest.json — the walk
 *      stops at a .git boundary so unrelated enclosing repos never leak in;
 *   3. a `kibi-workspace.txt` pointer file next to this launcher (one line:
 *      an absolute path, or a path relative to the launcher directory). It
 *      points a cwd outside any Git repository, or inside the repository that
 *      holds the launcher, at one workspace, which is what makes hosts that
 *      spawn from a foreign cwd work; a cwd inside another repository without
 *      a KB is never redirected;
 *   4. the cwd unchanged.
 * Returns { root, source }.
 */
export function resolveWorkspace(
  cwd = process.cwd(),
  env = process.env,
  { pointerFile = join(HERE, "kibi-workspace.txt") } = {},
) {
  for (const key of ["KIBI_WORKSPACE", "KIBI_PROJECT_ROOT", "KIBI_ROOT"]) {
    const value = String(env[key] ?? "").trim();
    if (value) return { root: resolve(value), source: `env:${key}` };
  }
  let dir = resolve(cwd);
  let repoRoot = null;
  for (;;) {
    if (isKibiWorkspace(dir)) return { root: dir, source: "walk" };
    if (existsSync(join(dir, ".git"))) {
      repoRoot = dir; // repo boundary: never walk past it
      break;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // A cwd inside some other Git repository that has no KB is that project,
  // not the pointer's: redirecting it would feed one project's KB into
  // another's session. The pointer still applies when the cwd's repository
  // holds the launcher itself (a host spawning from the plugin directory).
  if (repoRoot !== null && !isWithin(repoRoot, dirname(resolve(pointerFile)))) {
    return { root: resolve(cwd), source: "cwd" };
  }
  try {
    const pointer = readFileSync(pointerFile, "utf8").trim();
    if (pointer) {
      return {
        root: isAbsolute(pointer)
          ? pointer
          : resolve(dirname(pointerFile), pointer),
        source: "pointer",
      };
    }
  } catch {
    // no pointer file: fall through
  }
  return { root: resolve(cwd), source: "cwd" };
}

/**
 * Append one JSON line to the per-user launcher debug log — ONLY when
 * KIBI_VIBE_LAUNCHER_DEBUG=1 is set (opt-in; the file is created 0600 and
 * lives in the per-user temp dir). Never throws.
 */
export function debugLaunch(event, env = process.env) {
  if (String(env.KIBI_VIBE_LAUNCHER_DEBUG ?? "") !== "1") return;
  try {
    appendFileSync(
      perUserTmpFile("launcher.log"),
      `${JSON.stringify({
        ts: new Date().toISOString(),
        pid: process.pid,
        cwd: process.cwd(),
        ...event,
      })}\n`,
      { mode: 0o600 },
    );
  } catch {
    // logging must never break a launch
  }
}

/**
 * @typedef {object} PlanDeps
 * @property {string} [deps.platform]
 * @property {(distro: string | null) => WslNodeProbe | null} [deps.probe]
 * @property {(winPath: string) => string | null} [deps.toWslPath]
 */

/**
 * Decide how to run Kibi for a workspace. On Windows, a drive-letter
 * workspace (C:\...) runs natively (direct spawn of the project-local
 * kibi-mcp/kibi; SWI-Prolog comes from the bundled kibi-swipl-win32-x64
 * runtime), while a \\wsl.localhost\<distro> UNC workspace is served
 * through that distro via WSL. KIBI_FORCE_WSL=1 forces the WSL wrap for
 * drive-letter workspaces; KIBI_FORCE_DIRECT=1 forces a native spawn even
 * for UNC workspaces. Throws when a forced WSL wrap cannot convert the
 * Windows path (never silently cd's elsewhere).
 *
 * @param {string} workspace
 * @param {NodeJS.ProcessEnv} [env]
 * @param {PlanDeps} [deps]
 */
export function planRuntime(workspace, env = process.env, deps = {}) {
  const platform = deps.platform ?? process.platform;
  const probe = deps.probe ?? ((distro) => probeWslNode(distro, { env }));
  const convert = deps.toWslPath ?? toWslPath;
  const raw = String(workspace || process.cwd());
  const unc = parseWslUnc(raw);
  // On Windows keep the raw path (UNC/drive-letter forms are meaningful
  // there); elsewhere normalize through resolve.
  const winPath = unc || /^[A-Za-z]:[\\/]/.test(raw);
  const root = platform === "win32" && winPath ? raw : resolve(raw);
  const forceDirect = String(env.KIBI_FORCE_DIRECT ?? "") === "1";
  const forceWsl = String(env.KIBI_FORCE_WSL ?? "") === "1";
  if (platform === "win32" && (unc || forceWsl) && !forceDirect) {
    const probed = probe(unc ? unc.distro : null);
    if (probed) {
      const wslCwd = unc ? unc.wslPath : convert(root);
      if (!wslCwd) {
        throw new Error(
          `cannot convert Windows path "${root}" to a WSL path; fix the workspace path, unset KIBI_FORCE_WSL to run Kibi directly on Windows, or set KIBI_FORCE_DIRECT=1`,
        );
      }
      return {
        mode: "wsl",
        workspace: root,
        wslCwd,
        distro: unc ? unc.distro : null,
        wslNode: probed.nodeWslPath,
        wslNodeMajor: probed.major,
      };
    }
  }
  return { mode: "direct", workspace: root };
}

/** Resolve a project-local package bin from a workspace, like npx --no-install. */
export function resolvePackageBin(workspace, packageName, binName) {
  const root = resolve(workspace);
  // Prefer the workspace's own node_modules: that is exactly what
  // `npx --no-install` resolves, and a package's "exports" map may not expose
  // ./package.json to require.resolve (kibi-cli does not).
  const localPkgJson = join(root, "node_modules", packageName, "package.json");
  const pkgJsonPath = existsSync(localPkgJson)
    ? localPkgJson
    : createRequire(join(root, "package.json")).resolve(
        `${packageName}/package.json`,
      );
  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.[binName];
  if (typeof bin !== "string" || !bin) {
    throw new Error(`${packageName} declares no "${binName}" bin`);
  }
  return join(dirname(pkgJsonPath), bin);
}

/** Merge extra variable names into a WSLENV colon-separated list. */
export function mergeWslEnv(existing, names) {
  const parts = String(existing ?? "")
    .split(":")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const name of names) {
    if (!parts.includes(name)) parts.push(name);
  }
  return parts.join(":");
}

/**
 * Build the literal argv for a WSL spawn: `wsl.exe [-d distro] --cd <wslCwd>
 * --exec <node> <binWsl> [args...]`. No shell string is built, so no path or
 * argument can be shell-injected.
 */
export function buildWslArgs(plan, binWsl, extraArgs = []) {
  const args = [];
  if (plan.distro) args.push("-d", plan.distro);
  args.push(
    "--cd",
    plan.wslCwd,
    "--exec",
    plan.wslNode,
    binWsl,
    ...extraArgs.map(String),
  );
  return args;
}

function wslEnv(env, plan, host) {
  return {
    ...env,
    KIBI_MCP_HOST: host,
    KIBI_MCP_ATTACH_ROOT: plan.workspace,
    KIBI_WORKSPACE: plan.workspace,
    // Let the host/attach vars cross into WSL; /p translates the Windows
    // paths to WSL paths inside the distribution.
    WSLENV: mergeWslEnv(env.WSLENV, [
      "KIBI_MCP_HOST",
      "KIBI_MCP_ATTACH_ROOT/p",
      "KIBI_WORKSPACE/p",
    ]),
  };
}

/** Spawn the project-local kibi-mcp server (stdio inherited) under the right runtime. */
export function spawnKibiMcp(
  plan,
  { env = process.env, spawnImpl = spawn } = {},
) {
  const host = resolveMcpHost(env);
  if (plan.mode === "wsl") {
    const binWsl = toWslPath(
      resolvePackageBin(plan.workspace, "kibi-mcp", "kibi-mcp"),
    );
    if (!binWsl)
      throw new Error(
        `cannot convert kibi-mcp bin path to a WSL path for ${plan.workspace}`,
      );
    return spawnImpl("wsl.exe", buildWslArgs(plan, binWsl), {
      stdio: ["inherit", "inherit", "inherit"],
      env: wslEnv(env, plan, host),
    });
  }
  const binPath = resolvePackageBin(plan.workspace, "kibi-mcp", "kibi-mcp");
  return spawnImpl(process.execPath, [binPath], {
    cwd: plan.workspace,
    stdio: ["inherit", "inherit", "inherit"],
    env: { ...env, KIBI_MCP_ATTACH_ROOT: plan.workspace, KIBI_MCP_HOST: host },
  });
}

/**
 * Spawn a kibi CLI route (`node kibi.mjs <route...>` forwards argv) under the
 * right runtime. The caller's JSON payload is written to the child's stdin
 * when the route args contain `--input -`.
 */
export function spawnKibiCli(
  plan,
  routeArgs,
  { env = process.env, spawnImpl = spawn } = {},
) {
  const args = routeArgs.map(String);
  if (plan.mode === "wsl") {
    const binWsl = toWslPath(
      resolvePackageBin(plan.workspace, "kibi-cli", "kibi"),
    );
    if (!binWsl)
      throw new Error(
        `cannot convert kibi bin path to a WSL path for ${plan.workspace}`,
      );
    return spawnImpl("wsl.exe", buildWslArgs(plan, binWsl, args), {
      stdio: ["pipe", "inherit", "inherit"],
      env: wslEnv(env, plan, resolveMcpHost(env)),
    });
  }
  const binPath = resolvePackageBin(plan.workspace, "kibi-cli", "kibi");
  return spawnImpl(process.execPath, [binPath, ...args], {
    cwd: plan.workspace,
    stdio: ["pipe", "inherit", "inherit"],
    env,
  });
}

// ---------------------------------------------------------------------------
// Silent zero-tool MCP server, used outside Kibi workspaces (or when the
// configured workspace's kibi-mcp cannot be started) so the host never shows
// "MCP failed to connect". Answers initialize/tools/list/ping with empty
// results and exits 0 when stdin closes.
// ---------------------------------------------------------------------------

/**
 * Serve a minimal newline-delimited JSON-RPC MCP endpoint with zero tools on
 * stdio. Resolves when stdin ends; the caller should then exit 0.
 *
 * @param {{ serverName?: string, instructions?: string }} [options]
 * @returns {Promise<void>}
 */
export function serveEmptyMcpServer({
  serverName = "kibi-vibe-launcher",
  instructions,
} = {}) {
  return new Promise((resolvePromise) => {
    const serverInfo = { name: serverName, version: "0.1.0" };
    let buf = "";
    const send = (msg) => {
      process.stdout.write(`${JSON.stringify(msg)}\n`);
    };
    const respond = (id, result) => send({ jsonrpc: "2.0", id, result });
    const respondError = (id, code, message) =>
      send({ jsonrpc: "2.0", id, error: { code, message } });
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      buf += chunk;
      for (;;) {
        const idx = buf.indexOf("\n");
        if (idx === -1) break;
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }
        if (msg.id === undefined || msg.id === null) continue; // notification
        switch (msg.method) {
          case "initialize":
            respond(msg.id, {
              protocolVersion: msg.params?.protocolVersion ?? "2024-11-05",
              capabilities: { tools: { listChanged: false } },
              serverInfo,
              ...(instructions ? { instructions } : {}),
            });
            break;
          case "tools/list":
            respond(msg.id, { tools: [] });
            break;
          case "prompts/list":
            respond(msg.id, { prompts: [] });
            break;
          case "resources/list":
            respond(msg.id, { resources: [] });
            break;
          case "ping":
            respond(msg.id, {});
            break;
          default:
            respondError(
              msg.id,
              -32601,
              `method not found: ${String(msg.method)}`,
            );
        }
      }
    });
    process.stdin.on("end", () => resolvePromise());
    process.stdin.on("error", () => resolvePromise());
    process.stdin.resume();
  });
}
