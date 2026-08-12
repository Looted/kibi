#!/usr/bin/env node

import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const SHUTDOWN_TIMEOUT_MS = 5_000;

function processIsRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// The runtime directory is created by this runner, so its PID files are exact
// engine targets and never ambient developer processes.
// implements REQ-test-journaled-engine-harness
export async function stopOwnedEngines(runtimeDirectory) {
  if (!existsSync(runtimeDirectory)) return 0;
  const pids = [];
  for (const entry of readdirSync(runtimeDirectory)) {
    if (!entry.endsWith(".pid")) continue;
    try {
      const pid = Number.parseInt(
        readFileSync(join(runtimeDirectory, entry), "utf8"),
        10,
      );
      if (Number.isInteger(pid) && pid > 1 && processIsRunning(pid)) {
        pids.push(pid);
      }
    } catch {
      // A daemon may remove its PID file while the runner discovers it.
    }
  }
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // The daemon exited after discovery.
    }
  }
  const deadline = Date.now() + SHUTDOWN_TIMEOUT_MS;
  while (pids.some(processIsRunning) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  for (const pid of pids.filter(processIsRunning)) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // The daemon exited between the liveness check and escalation.
    }
  }
  return pids.length;
}

// implements REQ-test-journaled-engine-harness
export async function runOwnedEngineTests(command, args) {
  const runtimeDirectory = mkdtempSync(
    join(tmpdir(), "kibi-test-engine-runtime-"),
  );
  let child;
  try {
    child = spawn(command, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        KIBI_ENGINE_IDLE_TIMEOUT_MS: "30000",
        KIBI_RUNTIME_DIR: runtimeDirectory,
      },
      stdio: "inherit",
    });
    const forwardSigint = () => child?.kill("SIGINT");
    const forwardSigterm = () => child?.kill("SIGTERM");
    process.once("SIGINT", forwardSigint);
    process.once("SIGTERM", forwardSigterm);
    const status = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) =>
        resolve(code ?? (signal === null ? 1 : 128)),
      );
    });
    process.off("SIGINT", forwardSigint);
    process.off("SIGTERM", forwardSigterm);
    return status;
  } finally {
    const stopped = await stopOwnedEngines(runtimeDirectory);
    rmSync(runtimeDirectory, { recursive: true, force: true });
    if (stopped > 0) {
      console.info(
        `Stopped ${stopped} test engine${stopped === 1 ? "" : "s"}.`,
      );
    }
  }
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const separator = process.argv.indexOf("--");
  const invocation = process.argv.slice(separator < 0 ? 2 : separator + 1);
  const [command, ...args] = invocation;
  if (command === undefined) {
    throw new Error(
      "Usage: node scripts/run-owned-engine-tests.mjs -- <command> [args...]",
    );
  }
  process.exitCode = await runOwnedEngineTests(command, args);
}
