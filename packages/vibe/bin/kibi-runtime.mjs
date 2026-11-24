// kibi-runtime.mjs — runtime detection and spawn planning for launching Kibi
// from a Mistral Vibe host process (the MCP server launcher, the context
// hooks, or the kibi.mjs CLI wrapper). It is part of the kibi-vibe plugin;
// the other agent hosts ship their own launchers.
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
// quotes can never be shell-injected, and that includes the `wslpath`
// conversion of a drive-letter path. The only shell string ever executed is
// the constant Node.js probe script run by `bash -lc` (WSL_NODE_PROBE_SCRIPT),
// which has no interpolated values.
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

/** The kibi-vibe package version (package.json, then plugin.json). */
export function packageVersion(packageRoot = join(HERE, "..")) {
  for (const file of ["package.json", "plugin.json"]) {
    try {
      const { version } = JSON.parse(
        readFileSync(join(packageRoot, file), "utf8"),
      );
      if (typeof version === "string" && version) return version;
    } catch {
      // try the next manifest
    }
  }
  return "0.0.0";
}

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

/**
 * The constant probe script run by `bash -lc` inside WSL. A login shell puts
 * nvm-installed Node.js on PATH; when it still finds none, the newest nvm
 * install is used. Whatever path it settles on is the one asked for its
 * version. Each result line carries a sentinel prefix, so noise a login
 * profile prints (banners, motd, nvm messages) cannot be mistaken for it.
 * No value is ever interpolated into this string.
 */
export const WSL_NODE_PROBE_SCRIPT = [
  "p=$(command -v node 2>/dev/null)",
  '[ -n "$p" ] || p=$(ls -d "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | sort -V | tail -n 1)',
  '[ -n "$p" ] || exit 0',
  "printf 'KIBI_PROBE_NODE=%s\\n' \"$p\"",
  'printf \'KIBI_PROBE_VERSION=%s\\n\' "$("$p" --version 2>/dev/null)"',
].join("\n");

/**
 * Read the sentinel-tagged lines of the probe's stdout (the last of each
 * wins). Returns { nodeWslPath, major } when they name an absolute node path
 * and a Node.js >= KIBI_MIN_NODE_MAJOR, else null.
 *
 * @param {string | null | undefined} stdout
 * @returns {WslNodeProbe | null}
 */
export function parseWslNodeProbe(stdout) {
  let nodeWslPath = null;
  let version = "";
  for (const raw of String(stdout ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("KIBI_PROBE_NODE=")) {
      nodeWslPath = line.slice("KIBI_PROBE_NODE=".length);
    } else if (line.startsWith("KIBI_PROBE_VERSION=")) {
      version = line.slice("KIBI_PROBE_VERSION=".length);
    }
  }
  const major = parseMajor(version);
  return nodeWslPath?.startsWith("/") && major >= KIBI_MIN_NODE_MAJOR
    ? { nodeWslPath, major }
    : null;
}

/** In-process probe cache keyed by distro (or "default"). */
const probeCache = new Map();

/**
 * Probe the Node.js available inside a WSL distribution (default distro when
 * `distro` is null). One single wsl.exe call running the constant
 * WSL_NODE_PROBE_SCRIPT. Returns { nodeWslPath, major } when Node.js >=
 * KIBI_MIN_NODE_MAJOR, else null. Result is cached in-process and in a
 * per-user cache file (0600).
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
    args.push("--exec", "bash", "-lc", WSL_NODE_PROBE_SCRIPT);
    const out = spawnSyncImpl("wsl.exe", args, { encoding: "utf8" });
    if (!out.error && out.status === 0) result = parseWslNodeProbe(out.stdout);
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
 * drive-letter paths go through `wsl.exe --exec wslpath -a` (cached per user),
 * with the path as one literal argv entry and no shell in between, in the
 * given distribution (the default one when `distro` is null). Returns null
 * when conversion is impossible — callers must treat that as a hard error,
 * never silently fall back to another directory.
 *
 * @param {string} winPath
 * @param {{ spawnSyncImpl?: typeof spawnSync, distro?: string | null }} [options]
 * @returns {string | null}
 */
export function toWslPath(
  winPath,
  { spawnSyncImpl = spawnSync, distro = null } = {},
) {
  const unc = parseWslUnc(winPath);
  if (unc) return unc.wslPath;
  const normalized = String(winPath).replace(/\//g, "\\");
  if (!/^[a-zA-Z]:[\\/]/.test(normalized)) return null;
  const cacheKey = `${distro ?? ""}|${normalized.toLowerCase()}`;
  const cached = readRuntimeCache().wslpath?.[cacheKey];
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
  const args = distro ? ["-d", distro] : [];
  args.push("--exec", "wslpath", "-a", normalized.replace(/\\/g, "/"));
  const out = spawnSyncImpl("wsl.exe", args, { encoding: "utf8" });
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
 *      an absolute path, or a path relative to the launcher directory). It is
 *      a single-project, last-resort fallback: it names ONE workspace for
 *      every session that reaches it, so use it only for a plugin copy
 *      dedicated to that project. It points a cwd outside any Git
 *      repository, or inside the repository that holds the launcher, at that
 *      workspace, which is what makes hosts that spawn from a foreign cwd
 *      work; a cwd inside another repository without a KB is never
 *      redirected. To serve several projects from one plugin copy, set
 *      KIBI_WORKSPACE per project instead;
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
 * for UNC workspaces. Throws when the WSL wrap is needed but unusable (no
 * Node.js 22+ in the distribution, or the Windows path cannot be converted):
 * it never silently runs Windows Node.js or cd's elsewhere.
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
    const distro = unc ? unc.distro : null;
    const probed = probe(distro);
    if (!probed) {
      // Never fall back silently: Windows Node.js would run against the
      // distribution's Linux node_modules, or ignore the requested WSL wrap.
      throw new Error(
        `cannot run Kibi in WSL for "${root}": no usable Node.js ${KIBI_MIN_NODE_MAJOR}+ was found in ${distro ? `the WSL distribution "${distro}"` : "the default WSL distribution"} (the wsl.exe probe failed, or the Node.js there is older). Install Node.js ${KIBI_MIN_NODE_MAJOR}+ in that distribution, or set KIBI_FORCE_DIRECT=1 to run Kibi with Windows Node.js`,
      );
    }
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
      distro,
      wslNode: probed.nodeWslPath,
      wslNodeMajor: probed.major,
    };
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
      { distro: plan.distro },
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
      { distro: plan.distro },
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
    const serverInfo = { name: serverName, version: packageVersion() };
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
