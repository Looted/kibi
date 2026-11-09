// Installs the packed tarballs into a fresh project on a host that has no
// bundled SWI-Prolog (native Windows) and runs Kibi on the swipl found on
// PATH, as the install guide documents for those hosts:
//
//   node scripts/system-swipl-smoke.mjs --tarballs <packages dir>
//
// It runs doctor, init, sync, check and query through the CLI, then starts
// the packed kibi-mcp server over stdio and calls kb_status, kb_query and
// kb_check. Commands run through the platform shell so npm, npx and git
// resolve the way they do for a user (npm.cmd on Windows).
import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";

import { packedTarballs } from "./simulate-readme-quickstart.mjs";

/** The packages a user installs; npm resolves the rest from overrides. */
const DIRECT = ["kibi-core", "kibi-cli", "kibi-mcp"];

const SMOKE_REQUIREMENT = `---
id: REQ-SYSTEM-SMOKE
title: System runtime smoke requirement
status: open
required_evidence: asserted
---

The system runtime compiles this requirement.

## Context

This requirement exists only so the smoke run has one authored entity to sync, check and query through a system SWI-Prolog on a host with no bundled build.
`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function show(text) {
  const out = text.trim();
  if (out !== "") {
    console.log(out.length > 4000 ? `${out.slice(0, 4000)}\n...` : out);
  }
}

function run(label, command, { cwd, env, allowFailure = false }) {
  console.log(`\n$ ${label}`);
  const result = spawnSync(command, {
    shell: true,
    cwd,
    env,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  show(`${result.stdout ?? ""}${result.stderr ?? ""}`);
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`\`${label}\` exited ${result.status}`);
  }
  return { status: result.status, stdout: result.stdout ?? "" };
}

function swiplOnPath(env) {
  const value = env.PATH ?? env.Path ?? "";
  for (const dir of value.split(path.delimiter)) {
    if (dir === "") continue;
    for (const name of ["swipl", "swipl.exe"]) {
      if (existsSync(path.join(dir, name))) return path.join(dir, name);
    }
  }
  return undefined;
}

/** The file a package's bin entry points at, inside the project. */
function packageBin(project, name, bin) {
  const root = path.join(project, "node_modules", name);
  const manifest = JSON.parse(
    readFileSync(path.join(root, "package.json"), "utf8"),
  );
  const entry =
    typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.[bin];
  assert(entry, `${name} declares no ${bin} bin`);
  return path.join(root, entry);
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} did not print JSON: ${error.message}`);
  }
}

/** A minimal MCP stdio client: newline-delimited JSON-RPC. */
function startMcp(command, args, { cwd, env, timeoutMs }) {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const pending = new Map();
  let nextId = 1;
  createInterface({ input: child.stdout }).on("line", (line) => {
    if (line.trim() === "") return;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    clearTimeout(entry.timer);
    if (message.error) {
      entry.reject(new Error(JSON.stringify(message.error)));
    } else {
      entry.resolve(message.result);
    }
  });
  child.on("exit", (code, signal) => {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(
        new Error(`kibi-mcp exited (${signal ?? code}):\n${stderr}`),
      );
    }
    pending.clear();
  });
  const request = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`${method} timed out:\n${stderr}`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      child.stdin.write(
        `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`,
      );
    });
  return {
    async initialize() {
      const result = await request("initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "kibi-system-swipl-smoke", version: "1.0.0" },
      });
      child.stdin.write(
        `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
      );
      return result;
    },
    call: (name, args) =>
      request("tools/call", { name, arguments: args ?? {} }),
    stderr: () => stderr,
    async close() {
      child.stdin.end();
      await new Promise((resolve) => {
        if (child.exitCode !== null) return resolve();
        const timer = setTimeout(() => {
          child.kill();
          resolve();
        }, 5000);
        child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    },
  };
}

/** Runs the whole smoke; returns the steps it completed. */
async function smoke({ packagesDir }) {
  const env = { ...process.env };
  env.KIBI_SWIPL = undefined;
  assert(
    swiplOnPath(env) !== undefined,
    "no swipl on PATH; install SWI-Prolog first",
  );
  const tarballs = packedTarballs(packagesDir);
  for (const name of DIRECT) {
    assert(name in tarballs, `no ${name} tarball under ${packagesDir}`);
  }
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "kibi-system-")));
  const project = path.join(root, "project");
  const completed = [];
  try {
    mkdirSync(project, { recursive: true });
    env.npm_config_cache = path.join(root, "npm-cache");
    env.npm_config_update_notifier = "false";
    env.npm_config_fund = "false";
    env.npm_config_audit = "false";
    env.KIBI_TELEMETRY = "0";
    const at = { cwd: project, env };

    const overrides = Object.fromEntries(
      Object.entries(tarballs)
        .filter(([name]) => !DIRECT.includes(name))
        .map(([name, file]) => [name, `file:${file}`]),
    );
    writeFileSync(
      path.join(project, "package.json"),
      `${JSON.stringify({ name: "system-smoke", version: "1.0.0", private: true, overrides }, null, 2)}\n`,
    );
    writeFileSync(path.join(project, ".gitignore"), "node_modules/\n");
    run("git init", "git init -q -b main", at);
    run(
      "git commit",
      'git -c user.name=smoke -c user.email=smoke@example.invalid add -A && git -c user.name=smoke -c user.email=smoke@example.invalid commit -q -m "existing project"',
      at,
    );
    run(
      "npm install --save-dev kibi-core kibi-cli kibi-mcp    # tarballs",
      `npm install --save-dev ${DIRECT.map((name) => JSON.stringify(tarballs[name])).join(" ")}`,
      at,
    );
    completed.push("install");

    const kibiBin = packageBin(project, "kibi-cli", "kibi");
    const kibi = (args, extra = {}) =>
      run(`kibi ${args}`, `node ${JSON.stringify(kibiBin)} ${args}`, {
        ...at,
        ...extra,
      });

    const doctor = parseJson(
      kibi("doctor --format json", { allowFailure: true }).stdout,
      "kibi doctor",
    );
    const check = doctor.checks.find((entry) => entry.name === "SWI-Prolog");
    assert(
      check?.passed === true,
      `doctor SWI-Prolog check: ${check?.message}`,
    );
    if (process.platform === "win32") {
      assert(
        check.details?.source === "path",
        `doctor reported ${check.details?.source}, expected the swipl on PATH`,
      );
    }
    completed.push(
      `doctor: ${check.details?.source} ${check.details?.version}`,
    );

    kibi("init");
    completed.push("init");
    mkdirSync(path.join(project, ".kb", "requirements"), { recursive: true });
    writeFileSync(
      path.join(project, ".kb", "requirements", "REQ-SYSTEM-SMOKE.md"),
      SMOKE_REQUIREMENT,
    );
    run("git add", "git add -A", at);
    kibi("sync");
    completed.push("sync");
    kibi("check");
    completed.push("check");
    const query = kibi("query req");
    assert(
      query.stdout.includes("REQ-SYSTEM-SMOKE"),
      "kibi query req did not return the synced requirement",
    );
    completed.push("query");

    console.log("\n$ kibi-mcp: initialize, kb_status, kb_query, kb_check");
    const mcp = startMcp(
      process.execPath,
      [packageBin(project, "kibi-mcp", "kibi-mcp")],
      { cwd: project, env, timeoutMs: 120000 },
    );
    try {
      await mcp.initialize();
      const status = await mcp.call("kb_status");
      assert(
        status?.isError !== true,
        `kb_status failed: ${JSON.stringify(status)}`,
      );
      completed.push("mcp kb_status");
      const queried = await mcp.call("kb_query", { type: "req" });
      assert(
        queried?.isError !== true &&
          JSON.stringify(queried).includes("REQ-SYSTEM-SMOKE"),
        `kb_query failed: ${JSON.stringify(queried)}`,
      );
      completed.push("mcp kb_query");
      const checked = await mcp.call("kb_check");
      assert(
        checked?.isError !== true,
        `kb_check failed: ${JSON.stringify(checked)}`,
      );
      completed.push("mcp kb_check");
    } catch (error) {
      show(mcp.stderr());
      throw error;
    } finally {
      await mcp.close();
    }
    return completed;
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 5 });
  }
}

function parseArgs(argv) {
  let packagesDir;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--tarballs") packagesDir = argv[++index];
    else throw new Error(`unknown argument: ${argv[index]}`);
  }
  if (!packagesDir) {
    throw new Error("usage: system-swipl-smoke.mjs --tarballs <packages dir>");
  }
  return { packagesDir };
}

/** Command-line entry: resolves to the process exit code. */
async function main(argv) {
  try {
    const { packagesDir } = parseArgs(argv);
    const completed = await smoke({ packagesDir: path.resolve(packagesDir) });
    const summary = [
      `Kibi ran on the system SWI-Prolog on ${process.platform}-${process.arch} (packed tarballs):`,
      ...completed.map((step) => `- ${step}`),
    ].join("\n");
    console.log(`\n${summary}`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      writeFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`, {
        flag: "a",
      });
    }
    return 0;
  } catch (error) {
    console.error(
      `system-swipl-smoke: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
