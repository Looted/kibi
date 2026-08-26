import { spawn } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const driverDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(driverDir, "../../../..");
const serverPath = path.join(repoRoot, "packages/mcp/bin/kibi-mcp");
const fixturePath = path.join(
  repoRoot,
  "packages/mcp/tests/fixtures/bounded-search-kb.pl",
);

export function waitForExit(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve({ code: child.exitCode, signal: child.signalCode });
      return;
    }
    const timeout = setTimeout(() => {
      reject(new Error(`process ${child.pid ?? 0} did not exit`));
    }, timeoutMs);
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal });
    });
  });
}

function readMessage(child, timeoutMs = 120_000) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("timed out waiting for MCP response"));
    }, timeoutMs);
    const onData = (chunk) => {
      buffer += chunk.toString();
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      const line = buffer.slice(0, newline).trim();
      cleanup();
      resolve(JSON.parse(line));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      child.stdout?.off("data", onData);
    };
    child.stdout?.on("data", onData);
  });
}

export async function request(child, id, method, params) {
  child.stdin?.write(
    `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`,
  );
  return await readMessage(child);
}

export async function spawnMcpTestServer({
  entityCount,
  delaySeconds,
  stderrBytes = 0,
}) {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "kibi-node-mcp-"));
  const child = spawn(process.execPath, [serverPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      KIBI_BRANCH: "develop",
      KIBI_KB_PL_PATH: fixturePath,
      KIBI_TEST_DELAY_SECONDS: String(delaySeconds),
      KIBI_TEST_ENTITY_COUNT: String(entityCount),
      KIBI_TEST_STDERR_BYTES: String(stderrBytes),
      KIBI_WORKSPACE: workspace,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const initialize = await request(child, 1, "initialize", {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "node-transport-driver", version: "1.0.0" },
  });
  if (!initialize.result) {
    throw new Error(`MCP initialization failed: ${JSON.stringify(initialize)}`);
  }
  return { child, workspace };
}

export async function readChildPid(parentPid) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const value = await readFile(
        `/proc/${parentPid}/task/${parentPid}/children`,
        "utf8",
      );
      const childPid = Number(value.trim().split(/\s+/)[0]);
      if (Number.isInteger(childPid) && childPid > 0) return childPid;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`SWI-Prolog child not found for MCP pid ${parentPid}`);
}

export function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

export async function waitUntilReaped(pid) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (!isAlive(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return false;
}

export async function stopServer(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  try {
    await waitForExit(child, 12_000);
  } catch {
    child.kill("SIGKILL");
    await waitForExit(child, 2_000);
  }
}
