#!/usr/bin/env node
// runtime.test.mjs — fast unit tests for the launcher runtime planner.
// Pure/injected fakes only: no wsl.exe, no real spawns, no network.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Keep the launcher's per-user cache/log files inside a throwaway dir.
const SANDBOX_TMP = mkdtempSync(join(tmpdir(), "kibi-vibe-test-tmp-"));
process.env.TMPDIR = SANDBOX_TMP;
import {
  WSL_NODE_PROBE_SCRIPT,
  buildWslArgs,
  debugLaunch,
  isKibiWorkspace,
  mergeWslEnv,
  packageVersion,
  parseWslNodeProbe,
  parseWslUnc,
  planRuntime,
  probeWslNode,
  resolveMcpHost,
  resolvePackageBin,
  resolveWorkspace,
  toWslPath,
} from "../bin/kibi-runtime.mjs";

function makeTmp() {
  return mkdtempSync(join(tmpdir(), "kibi-vibe-test-"));
}

test("parseWslUnc captures distro and converts the rest of the UNC path", () => {
  assert.deepEqual(
    parseWslUnc(
      "\\\\wsl.localhost\\Ubuntu-22.04\\home\\looted\\projects\\kibi",
    ),
    {
      distro: "Ubuntu-22.04",
      wslPath: "/home/looted/projects/kibi",
    },
  );
  assert.deepEqual(parseWslUnc("//wsl$/Ubuntu-22.04/home/looted/x"), {
    distro: "Ubuntu-22.04",
    wslPath: "/home/looted/x",
  });
  assert.equal(parseWslUnc("C:\\Users\\pfran\\projects\\kibi"), null);
  assert.equal(parseWslUnc("/home/looted/projects/kibi"), null);
});

test("toWslPath converts UNC paths purely and drive paths via wslpath", () => {
  assert.equal(
    toWslPath("\\\\wsl.localhost\\Ubuntu-22.04\\home\\x"),
    "/home/x",
  );
  const calls = [];
  const fake = /** @type {any} */ (
    (cmd, args) => {
      calls.push([cmd, args]);
      return { status: 0, stdout: "/mnt/c/Users/pfran\n" };
    }
  );
  assert.equal(
    toWslPath("C:\\Users\\pfran", { spawnSyncImpl: fake }),
    "/mnt/c/Users/pfran",
  );
  // --exec: wsl.exe runs wslpath directly, with no shell parsing the path.
  assert.deepEqual(calls, [
    ["wsl.exe", ["--exec", "wslpath", "-a", "C:/Users/pfran"]],
  ]);
  const failing = /** @type {any} */ (
    () => ({ error: new Error("no wsl"), status: null, stdout: "" })
  );
  assert.equal(toWslPath("D:\\nope", { spawnSyncImpl: failing }), null);
  assert.equal(toWslPath("relative/path"), null);
});

test("toWslPath hands a hostile drive path to wslpath as one literal argv entry", () => {
  const calls = [];
  const fake = /** @type {any} */ (
    (cmd, args) => {
      calls.push([cmd, args]);
      return { status: 0, stdout: "/mnt/c/work/x\n" };
    }
  );
  const hostile = "C:\\work\\$(touch pwned); `id` & x y";
  assert.equal(toWslPath(hostile, { spawnSyncImpl: fake }), "/mnt/c/work/x");
  assert.deepEqual(calls, [
    [
      "wsl.exe",
      ["--exec", "wslpath", "-a", "C:/work/$(touch pwned); `id` & x y"],
    ],
  ]);
  // No shell is involved: the program is wslpath, never bash/sh/-c.
  const argv = /** @type {string[]} */ (calls[0][1]);
  assert.ok(!argv.some((a) => /^(?:bash|sh|-l?c)$/.test(a)));
});

test("toWslPath names the distro with -d when one is given", () => {
  const calls = [];
  const fake = /** @type {any} */ (
    (cmd, args) => {
      calls.push(args);
      return { status: 0, stdout: "/mnt/d/proj\n" };
    }
  );
  assert.equal(
    toWslPath("D:\\proj", { spawnSyncImpl: fake, distro: "Debian" }),
    "/mnt/d/proj",
  );
  assert.deepEqual(calls, [
    ["-d", "Debian", "--exec", "wslpath", "-a", "D:/proj"],
  ]);
  // The cache is keyed by distro: another distro converts again.
  toWslPath("D:\\proj", { spawnSyncImpl: fake, distro: "Ubuntu" });
  assert.equal(calls.length, 2);
  // An empty answer is a failed conversion.
  const empty = /** @type {any} */ (() => ({ status: 0, stdout: "  \n" }));
  assert.equal(toWslPath("E:\\gone", { spawnSyncImpl: empty }), null);
});

test("resolveWorkspace honors trimmed env keys first", () => {
  const tmp = makeTmp();
  try {
    const ws = join(tmp, "ws");
    mkdirSync(join(ws, ".kb"), { recursive: true });
    writeFileSync(join(ws, ".kb", "manifest.json"), "{}");
    const r = resolveWorkspace(join(tmp, "elsewhere"), {
      KIBI_ROOT: "  ",
      KIBI_PROJECT_ROOT: "",
      KIBI_WORKSPACE: ` ${ws} `,
    });
    assert.equal(r.root, ws);
    assert.equal(r.source, "env:KIBI_WORKSPACE");
    const r2 = resolveWorkspace(join(tmp, "elsewhere"), {
      KIBI_ROOT: ` ${ws} `,
    });
    assert.equal(r2.source, "env:KIBI_ROOT");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("resolveWorkspace walks up to .kb/manifest.json but stops at a .git boundary", () => {
  const tmp = makeTmp();
  try {
    // repo with .git and .kb at the root, session in a subdirectory
    const repo = join(tmp, "repo");
    mkdirSync(join(repo, ".git"), { recursive: true });
    mkdirSync(join(repo, ".kb"), { recursive: true });
    writeFileSync(join(repo, ".kb", "manifest.json"), "{}");
    mkdirSync(join(repo, "packages", "x"), { recursive: true });
    const r = resolveWorkspace(
      join(repo, "packages", "x"),
      {},
      { pointerFile: join(tmp, "nope.txt") },
    );
    assert.equal(r.root, repo);
    assert.equal(r.source, "walk");

    // a bare .kb without manifest.json is NOT an opt-in
    const bare = join(tmp, "bare");
    mkdirSync(join(bare, ".kb"), { recursive: true });
    const r2 = resolveWorkspace(
      bare,
      {},
      { pointerFile: join(tmp, "nope.txt") },
    );
    assert.equal(r2.source, "cwd");

    // an enclosing repo without .kb must not leak in past the inner .git
    const outer = join(tmp, "outer");
    mkdirSync(join(outer, ".git"), { recursive: true });
    mkdirSync(join(outer, ".kb"), { recursive: true });
    writeFileSync(join(outer, ".kb", "manifest.json"), "{}");
    const inner = join(outer, "inner");
    mkdirSync(join(inner, ".git"), { recursive: true });
    const r3 = resolveWorkspace(
      inner,
      {},
      { pointerFile: join(tmp, "nope.txt") },
    );
    assert.equal(r3.root, inner); // stopped at inner .git, did not reach outer
    assert.equal(r3.source, "cwd");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("resolveWorkspace falls back to the pointer file, resolving relative pointers", () => {
  const tmp = makeTmp();
  try {
    const target = join(tmp, "target");
    mkdirSync(target, { recursive: true });
    const pointerFile = join(tmp, "kibi-workspace.txt");
    writeFileSync(pointerFile, ` ${target}\n`);
    const r = resolveWorkspace(join(tmp, "nowhere"), {}, { pointerFile });
    assert.equal(r.root, target);
    assert.equal(r.source, "pointer");
    writeFileSync(pointerFile, "target\n");
    const r2 = resolveWorkspace(join(tmp, "nowhere"), {}, { pointerFile });
    assert.equal(r2.root, target);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("resolveWorkspace applies the pointer only outside other Git repositories", () => {
  const tmp = makeTmp();
  try {
    const target = join(tmp, "target");
    mkdirSync(target, { recursive: true });
    // the launcher lives in its own plugin repository
    const plugin = join(tmp, "plugin");
    mkdirSync(join(plugin, ".git"), { recursive: true });
    mkdirSync(join(plugin, "bin"), { recursive: true });
    const pointerFile = join(plugin, "kibi-workspace.txt");
    writeFileSync(pointerFile, `${target}\n`);

    // a cwd inside another repository without a KB is that project's own
    const other = join(tmp, "other");
    mkdirSync(join(other, ".git"), { recursive: true });
    mkdirSync(join(other, "src"), { recursive: true });
    const r = resolveWorkspace(join(other, "src"), {}, { pointerFile });
    assert.equal(r.root, join(other, "src"));
    assert.equal(r.source, "cwd");

    // a host spawning from the plugin directory still follows the pointer
    const r2 = resolveWorkspace(join(plugin, "bin"), {}, { pointerFile });
    assert.equal(r2.root, target);
    assert.equal(r2.source, "pointer");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("a spawn cwd without .kb/manifest.json resolves as the cwd but is never accepted as a Kibi workspace", () => {
  const tmp = makeTmp();
  try {
    // A bare cwd: no env key, no Kibi workspace in any .git-bounded
    // ancestor, no pointer.
    const bare = join(tmp, "bare");
    mkdirSync(join(bare, ".git"), { recursive: true });
    mkdirSync(join(bare, ".kb"), { recursive: true }); // .kb alone is no opt-in
    const resolved = resolveWorkspace(
      bare,
      {},
      { pointerFile: join(tmp, "no-pointer.txt") },
    );
    assert.equal(resolved.source, "cwd");
    assert.equal(resolved.root, bare);
    assert.equal(isKibiWorkspace(resolved.root), false);
    // The same holds for a subdirectory: the walk stops at the .git boundary.
    mkdirSync(join(bare, "src"), { recursive: true });
    const sub = resolveWorkspace(
      join(bare, "src"),
      {},
      { pointerFile: join(tmp, "no-pointer.txt") },
    );
    assert.equal(sub.source, "cwd");
    assert.equal(isKibiWorkspace(sub.root), false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("isKibiWorkspace requires .kb/manifest.json", () => {
  const tmp = makeTmp();
  try {
    mkdirSync(join(tmp, ".kb"), { recursive: true });
    assert.equal(isKibiWorkspace(tmp), false);
    writeFileSync(join(tmp, ".kb", "manifest.json"), "{}");
    assert.equal(isKibiWorkspace(tmp), true);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("planRuntime wraps in WSL on Windows with the UNC distro and never builds a shell string", () => {
  const plan = planRuntime(
    "\\\\wsl.localhost\\Ubuntu-22.04\\home\\looted\\projects\\kibi",
    {},
    {
      platform: "win32",
      probe: (distro) => {
        assert.equal(distro, "Ubuntu-22.04"); // S2: distro from the UNC path is probed and used
        return {
          nodeWslPath: "/home/looted/.nvm/versions/node/v24.21.0/bin/node",
          major: 24,
        };
      },
    },
  );
  assert.equal(plan.mode, "wsl");
  assert.equal(plan.wslCwd, "/home/looted/projects/kibi");
  assert.equal(plan.distro, "Ubuntu-22.04");
  const args = buildWslArgs(
    plan,
    "/home/looted/projects/kibi/node_modules/kibi-mcp/bin/kibi-mcp.mjs",
  );
  assert.deepEqual(args.slice(0, 6), [
    "-d",
    "Ubuntu-22.04",
    "--cd",
    "/home/looted/projects/kibi",
    "--exec",
    "/home/looted/.nvm/versions/node/v24.21.0/bin/node",
  ]);
  // S1: no shell string is ever built — no bash/-lc, and a hostile path stays
  // a single literal argv element.
  assert.ok(!args.some((a) => a.includes("bash") || a.includes("-lc")));
  const evil = planRuntime(
    "C:\\work\\$(calc)",
    { KIBI_FORCE_WSL: "1" },
    {
      platform: "win32",
      probe: () => ({ nodeWslPath: "/usr/bin/node", major: 24 }),
      toWslPath: () => "/mnt/c/work/$(calc)",
    },
  );
  const evilArgs = buildWslArgs(evil, "/mnt/c/bin/kibi-mcp.mjs");
  assert.ok(evilArgs.includes("/mnt/c/work/$(calc)"));
  assert.ok(!evilArgs.some((a) => a.includes("calc)") && a.includes(" ")));
});

test("planRuntime hard-fails when a forced WSL wrap cannot convert the Windows path (S3)", () => {
  assert.throws(
    () =>
      planRuntime(
        "C:\\work\\x",
        { KIBI_FORCE_WSL: "1" },
        {
          platform: "win32",
          probe: () => ({ nodeWslPath: "/usr/bin/node", major: 24 }),
          toWslPath: () => null,
        },
      ),
    /cannot convert Windows path/,
  );
});

test("planRuntime runs drive-letter Windows workspaces natively without probing WSL", () => {
  // Native Windows routing: the bundled kibi-swipl-win32-x64 runtime supplies
  // SWI-Prolog, so a C:\... workspace spawns directly and WSL is not probed.
  const native = planRuntime(
    "C:\\Projekty\\kibi",
    {},
    {
      platform: "win32",
      probe: () => {
        throw new Error("probe must not run for a drive-letter workspace");
      },
    },
  );
  assert.deepEqual(native, { mode: "direct", workspace: "C:\\Projekty\\kibi" });
});

test("planRuntime honors KIBI_FORCE_WSL for drive-letter workspaces and KIBI_FORCE_DIRECT for UNC", () => {
  const forcedWsl = planRuntime(
    "C:\\work\\x",
    { KIBI_FORCE_WSL: "1" },
    {
      platform: "win32",
      probe: () => ({ nodeWslPath: "/usr/bin/node", major: 24 }),
      toWslPath: () => "/mnt/c/work/x",
    },
  );
  assert.equal(forcedWsl.mode, "wsl");
  assert.equal(forcedWsl.wslCwd, "/mnt/c/work/x");
  assert.equal(forcedWsl.distro, null);
  const forcedDirect = planRuntime(
    "\\\\wsl.localhost\\Ubuntu-22.04\\home\\looted\\kibi",
    { KIBI_FORCE_DIRECT: "1" },
    {
      platform: "win32",
      probe: () => {
        throw new Error("probe must not run when KIBI_FORCE_DIRECT=1");
      },
    },
  );
  assert.deepEqual(forcedDirect, {
    mode: "direct",
    workspace: "\\\\wsl.localhost\\Ubuntu-22.04\\home\\looted\\kibi",
  });
});

test("planRuntime spawns directly off Windows and when forced", () => {
  assert.deepEqual(planRuntime("/home/looted/projects/kibi", {}), {
    mode: "direct",
    workspace: "/home/looted/projects/kibi",
  });
  const forced = planRuntime(
    "C:\\work\\x",
    { KIBI_FORCE_DIRECT: "1" },
    {
      platform: "win32",
      probe: () => {
        throw new Error("probe must not run when KIBI_FORCE_DIRECT=1");
      },
    },
  );
  assert.equal(forced.mode, "direct");
});

test("planRuntime refuses a WSL workspace whose distro has no usable Node.js instead of running Windows Node.js", () => {
  const unc = "\\\\wsl.localhost\\Ubuntu-22.04\\home\\looted\\kibi";
  assert.throws(
    () => planRuntime(unc, {}, { platform: "win32", probe: () => null }),
    (error) =>
      error instanceof Error &&
      /no usable Node\.js 22\+/.test(error.message) &&
      /"Ubuntu-22\.04"/.test(error.message) &&
      /KIBI_FORCE_DIRECT=1/.test(error.message),
  );
  // A forced WSL wrap on a drive-letter workspace is refused the same way,
  // naming the default distribution.
  assert.throws(
    () =>
      planRuntime(
        "C:\\work\\x",
        { KIBI_FORCE_WSL: "1" },
        { platform: "win32", probe: () => null },
      ),
    /default WSL distribution/,
  );
  // KIBI_FORCE_DIRECT=1 is the explicit way to use Windows Node.js.
  assert.deepEqual(
    planRuntime(
      unc,
      { KIBI_FORCE_DIRECT: "1" },
      { platform: "win32", probe: () => null },
    ),
    { mode: "direct", workspace: unc },
  );
});

test("parseWslNodeProbe reads sentinel lines and ignores login-profile noise", () => {
  const noisy = [
    "Welcome to Ubuntu 22.04",
    "nvm: using v20.1.0",
    "KIBI_PROBE_NODE=/home/u/.nvm/versions/node/v24.21.0/bin/node",
    "/usr/bin/node",
    "v10.0.0",
    "KIBI_PROBE_VERSION=v24.21.0",
    "",
  ].join("\r\n");
  assert.deepEqual(parseWslNodeProbe(noisy), {
    nodeWslPath: "/home/u/.nvm/versions/node/v24.21.0/bin/node",
    major: 24,
  });
  // Untagged lines alone never count, however node-like they look.
  assert.equal(parseWslNodeProbe("/usr/bin/node\nv24.0.0\n"), null);
  // Old Node.js, a non-absolute path, a missing version, or no output.
  assert.equal(
    parseWslNodeProbe(
      "KIBI_PROBE_NODE=/usr/bin/node\nKIBI_PROBE_VERSION=v20.19.6",
    ),
    null,
  );
  assert.equal(
    parseWslNodeProbe("KIBI_PROBE_NODE=node\nKIBI_PROBE_VERSION=v24.0.0"),
    null,
  );
  assert.equal(parseWslNodeProbe("KIBI_PROBE_NODE=/usr/bin/node"), null);
  assert.equal(parseWslNodeProbe(undefined), null);
});

test("probeWslNode makes one wsl.exe call with the constant probe script and rejects old Node", () => {
  const calls = [];
  const fake = /** @type {any} */ (
    (cmd, args) => {
      calls.push(args);
      return {
        status: 0,
        stdout:
          "banner from .profile\nKIBI_PROBE_NODE=/home/u/.nvm/versions/node/v24.21.0/bin/node\nKIBI_PROBE_VERSION=v24.21.0\n",
      };
    }
  );
  const ok = probeWslNode("Ubuntu-22.04", {
    spawnSyncImpl: fake,
    platform: "win32",
  });
  assert.ok(ok);
  assert.equal(ok.major, 24);
  assert.equal(ok.nodeWslPath, "/home/u/.nvm/versions/node/v24.21.0/bin/node");
  // one single wsl.exe call, with -d, and the constant script (no interpolation)
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], [
    "-d",
    "Ubuntu-22.04",
    "--exec",
    "bash",
    "-lc",
    WSL_NODE_PROBE_SCRIPT,
  ]);
  const old = probeWslNode(null, {
    spawnSyncImpl: /** @type {any} */ (
      () => ({
        status: 0,
        stdout: "KIBI_PROBE_NODE=/usr/bin/node\nKIBI_PROBE_VERSION=v20.19.6\n",
      })
    ),
    platform: "win32",
  });
  assert.equal(old, null);
  // A failing wsl.exe, a spawn error and a throwing spawn all read as none.
  const failed = /** @type {any} */ (() => ({ status: 1, stdout: "" }));
  assert.equal(
    probeWslNode("Failing", { spawnSyncImpl: failed, platform: "win32" }),
    null,
  );
  const throwing = /** @type {any} */ (
    () => {
      throw new Error("spawn EPERM");
    }
  );
  assert.equal(
    probeWslNode("Throwing", { spawnSyncImpl: throwing, platform: "win32" }),
    null,
  );
  assert.equal(probeWslNode(null, { platform: "linux" }), null);
});

test(
  "the probe script finds an nvm-only Node.js and asks that path for its version",
  { skip: process.platform === "win32" && "needs a POSIX shell" },
  () => {
    // A login PATH without node, and nvm installs that are NOT on PATH: the
    // fallback must settle on the newest one and report that install's own
    // version, which only running the resolved path can give.
    const tmp = makeTmp();
    try {
      const home = join(tmp, "home");
      const tools = join(tmp, "tools");
      mkdirSync(tools, { recursive: true });
      for (const version of ["v9.0.0", "v18.20.0", "v24.21.0"]) {
        const bin = join(home, ".nvm", "versions", "node", version, "bin");
        mkdirSync(bin, { recursive: true });
        writeFileSync(join(bin, "node"), `#!/bin/sh\necho ${version}\n`, {
          mode: 0o755,
        });
      }
      // PATH offers only the utilities the script uses, never a node.
      for (const tool of ["ls", "sort", "tail"]) {
        const which = spawnSync("sh", ["-c", `command -v ${tool}`], {
          encoding: "utf8",
        }).stdout.trim();
        writeFileSync(join(tools, tool), `#!/bin/sh\nexec ${which} "$@"\n`, {
          mode: 0o755,
        });
      }
      const out = spawnSync("/bin/sh", ["-c", WSL_NODE_PROBE_SCRIPT], {
        encoding: "utf8",
        env: { HOME: home, PATH: tools },
      });
      assert.equal(out.status, 0, out.stderr);
      // `sort -V` orders v9 < v18 < v24: the newest install wins, and its
      // version comes from running that very path (node is not on PATH).
      assert.deepEqual(parseWslNodeProbe(out.stdout), {
        nodeWslPath: join(
          home,
          ".nvm",
          "versions",
          "node",
          "v24.21.0",
          "bin",
          "node",
        ),
        major: 24,
      });
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  },
);

test("resolveMcpHost defaults to vibe and honors a trimmed env override (S8)", () => {
  assert.equal(resolveMcpHost({}), "vibe");
  assert.equal(resolveMcpHost({ KIBI_MCP_HOST: "  " }), "vibe");
  assert.equal(resolveMcpHost({ KIBI_MCP_HOST: " opencode " }), "opencode");
});

test("mergeWslEnv appends names colon-separated without duplicates", () => {
  assert.equal(mergeWslEnv(undefined, ["KIBI_MCP_HOST"]), "KIBI_MCP_HOST");
  assert.equal(
    mergeWslEnv("PATH/l:KIBI_MCP_HOST", ["KIBI_MCP_HOST", "KIBI_WORKSPACE/p"]),
    "PATH/l:KIBI_MCP_HOST:KIBI_WORKSPACE/p",
  );
});

test("resolvePackageBin prefers the workspace node_modules over require.resolve", () => {
  const tmp = makeTmp();
  try {
    const pkgDir = join(tmp, "node_modules", "kibi-mcp");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(
      join(pkgDir, "package.json"),
      JSON.stringify({
        name: "kibi-mcp",
        bin: { "kibi-mcp": "bin/kibi-mcp.mjs" },
      }),
    );
    assert.equal(
      resolvePackageBin(tmp, "kibi-mcp", "kibi-mcp"),
      join(pkgDir, "bin/kibi-mcp.mjs"),
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("debugLaunch is opt-in and writes a per-user 0600 log line inside a 0700 directory (S5)", () => {
  const tmp = makeTmp();
  const prevTmp = process.env.TMPDIR;
  const prevPluginData = process.env.PLUGIN_DATA;
  const prevDebug = process.env.KIBI_VIBE_LAUNCHER_DEBUG;
  try {
    process.env.TMPDIR = tmp;
    Reflect.deleteProperty(process.env, "PLUGIN_DATA");
    Reflect.deleteProperty(process.env, "KIBI_VIBE_LAUNCHER_DEBUG");
    debugLaunch({ kind: "off" });
    assert.equal(readdirSync(tmp).length, 0);
    process.env.KIBI_VIBE_LAUNCHER_DEBUG = "1";
    debugLaunch({ kind: "on", workspace: "/x" });
    const dirs = readdirSync(tmp).filter((n) => n.startsWith("kibi-vibe-"));
    assert.equal(dirs.length, 1);
    const dirPath = join(tmp, dirs[0]);
    assert.equal(
      statSync(dirPath).mode & 0o777,
      0o700,
      "private dir must be 0700",
    );
    const logPath = join(dirPath, "launcher.log");
    const line = JSON.parse(readFileSync(logPath, "utf8").trim());
    assert.equal(line.kind, "on");
    assert.equal(line.workspace, "/x");
    assert.equal(
      statSync(logPath).mode & 0o777,
      0o600,
      "debug log must be per-user 0600",
    );
  } finally {
    if (prevTmp === undefined) Reflect.deleteProperty(process.env, "TMPDIR");
    else process.env.TMPDIR = prevTmp;
    if (prevPluginData === undefined)
      Reflect.deleteProperty(process.env, "PLUGIN_DATA");
    else process.env.PLUGIN_DATA = prevPluginData;
    if (prevDebug === undefined)
      Reflect.deleteProperty(process.env, "KIBI_VIBE_LAUNCHER_DEBUG");
    else process.env.KIBI_VIBE_LAUNCHER_DEBUG = prevDebug;
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("packageVersion reads the package.json version the silent MCP server reports", () => {
  const manifest = JSON.parse(
    readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"),
      "utf8",
    ),
  );
  assert.equal(packageVersion(), manifest.version);
});

test("packageVersion falls back to plugin.json, then to 0.0.0", () => {
  const tmp = makeTmp();
  try {
    assert.equal(packageVersion(tmp), "0.0.0");
    writeFileSync(join(tmp, "package.json"), "{ not json");
    writeFileSync(
      join(tmp, "plugin.json"),
      JSON.stringify({ version: "1.2.3" }),
    );
    assert.equal(packageVersion(tmp), "1.2.3");
    writeFileSync(
      join(tmp, "package.json"),
      JSON.stringify({ version: "4.5.6" }),
    );
    assert.equal(packageVersion(tmp), "4.5.6");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
