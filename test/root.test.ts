import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export type SuiteSummary = {
  pass: number;
  fail: number;
  files: number;
};

type Batch = {
  label: string;
  args: string[];
};

export function isolatedUnitBatchEnv(
  runtimeDirectory: string,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    KIBI_ENGINE_IDLE_TIMEOUT_MS: "30000",
    KIBI_RUNTIME_DIR: runtimeDirectory,
  };
  // Proof CI sets KIBI_BRANCH for the dogfood detached HEAD. Unit batches are
  // independent Git sandboxes and must resolve their own branch identity.
  Reflect.deleteProperty(env, "KIBI_BRANCH");
  // Host workspace identity must not leak into shard sandboxes (MCP env
  // resolution walks KIBI_WORKSPACE before local .git/.kb markers).
  for (const key of ["KIBI_WORKSPACE", "KIBI_PROJECT_ROOT", "KIBI_ROOT"]) {
    Reflect.deleteProperty(env, key);
  }
  return env;
}

// implements REQ-root-suite-batch-diagnostics
// covered_by TEST-root-suite-batch-diagnostics
export const BATCH_TIMEOUT_MINUTES = 25;
export const BATCH_CONCURRENCY = 2;
export const TEST_ENGINE_SHUTDOWN_TIMEOUT_MS = 5_000;
/** Journaled engine and SkillOpt trainer tests exceed Bun's 15s default. */
// implements REQ-test-journaled-engine-harness
// covered_by TEST-test-journaled-engine-harness
export const CLI_ENGINE_BATCH_TIMEOUT_MS = 120_000;

type BatchOutcome = {
  timedOut: boolean;
  status: number | null;
  summaryCount: number;
};

// implements REQ-root-suite-batch-diagnostics
// covered_by TEST-root-suite-batch-diagnostics
export function getBatchFailureMessage(
  label: string,
  outcome: BatchOutcome,
): string | null {
  if (outcome.timedOut) {
    return `${label} timed out after ${BATCH_TIMEOUT_MINUTES} minutes (status ${outcome.status ?? "null"}; ${outcome.summaryCount} summaries).`;
  }
  if (outcome.status !== 0) {
    return `${label} exited with status ${outcome.status ?? "null"} (${outcome.summaryCount} summaries).`;
  }
  if (outcome.summaryCount !== 1) {
    return `Expected one Bun summary for ${label}, got ${outcome.summaryCount}.`;
  }
  return null;
}

const BATCHES: Batch[] = [
  {
    label: "cli",
    args: [
      "test",
      "--timeout",
      String(CLI_ENGINE_BATCH_TIMEOUT_MS),
      "./packages/cli",
    ],
  },
  {
    label: "skillopt evaluator",
    args: [
      "test",
      "--timeout",
      String(CLI_ENGINE_BATCH_TIMEOUT_MS),
      "./scripts/skillopt-eval/tests",
    ],
  },
  {
    label: "mcp",
    args: [
      "test",
      "--timeout",
      "15000",
      "--max-concurrency=1",
      "./packages/mcp",
    ],
  },
  {
    label: "opencode",
    args: [
      "test",
      "--timeout",
      "15000",
      "--max-concurrency=1",
      "./packages/opencode",
    ],
  },
  {
    label: "codex",
    args: ["test", "--timeout", "15000", "./packages/codex"],
  },
  {
    label: "cursor",
    args: ["test", "--timeout", "15000", "./packages/cursor"],
  },
  {
    label: "vscode activation",
    args: [
      "test",
      "--timeout",
      "15000",
      "--isolate",
      "--max-concurrency=1",
      "./packages/vscode/tests/activation/extension.test.ts",
      "./packages/vscode/tests/activation/workspace.test.ts",
      "./packages/vscode/tests/activation/treeView.test.ts",
      "./packages/vscode/tests/activation/contextOnOpen.test.ts",
      "./packages/vscode/tests/activation/mcp.test.ts",
      "./packages/vscode/tests/activation-modules.test.ts",
      "./packages/vscode/tests/workspace-activation-direct.test.ts",
    ],
  },
  {
    label: "vscode core",
    args: [
      "test",
      "--timeout",
      "15000",
      "--isolate",
      "--max-concurrency=1",
      "./packages/vscode/tests/code-action-provider.test.ts",
      "./packages/vscode/tests/codeLens.test.ts",
      "./packages/vscode/tests/extension.test.ts",
      "./packages/vscode/tests/helpers.test.ts",
      "./packages/vscode/tests/hover-provider.test.ts",
      "./packages/vscode/tests/hover.test.ts",
      "./packages/vscode/tests/manifestContract.test.ts",
      "./packages/vscode/tests/manifestResolver.test.ts",
      "./packages/vscode/tests/relationshipCache.test.ts",
      "./packages/vscode/tests/symbolIndex.test.ts",
      "./packages/vscode/tests/traceability.test.ts",
      "./packages/vscode/tests/treeProvider.test.ts",
      "./packages/vscode/tests/vscodeMock.test.ts",
    ],
  },
];

export function parseSuiteSummaries(output: string): SuiteSummary[] {
  const summaries: SuiteSummary[] = [];
  const summaryPattern =
    /\n\s*(\d+) pass(?:\n\s*\d+ skip)?\n\s*(\d+) fail[\s\S]*?Ran \d+ tests across (\d+) files?/g;
  for (const match of output.matchAll(summaryPattern)) {
    summaries.push({
      pass: Number(match[1]),
      fail: Number(match[2]),
      files: Number(match[3]),
    });
  }
  return summaries;
}

function processIsRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// Test batches own a private runtime directory, so every PID file in it is an
// exact engine target rather than an ambient user process.
// implements REQ-test-journaled-engine-harness
export async function stopTestEngines(
  runtimeDirectory: string,
): Promise<number> {
  if (!existsSync(runtimeDirectory)) return 0;
  const pids: number[] = [];
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
      // The daemon may remove its PID file during discovery.
    }
  }

  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // The daemon may have completed its idle shutdown after discovery.
    }
  }

  const deadline = Date.now() + TEST_ENGINE_SHUTDOWN_TIMEOUT_MS;
  while (pids.some(processIsRunning) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  for (const pid of pids.filter(processIsRunning)) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // The process exited between the liveness check and escalation.
    }
  }
  return pids.length;
}

function formatSuiteSummary(
  summaries: Array<SuiteSummary & { label: string }>,
): string {
  const total = summaries.reduce(
    (accumulator, summary) => ({
      pass: accumulator.pass + summary.pass,
      fail: accumulator.fail + summary.fail,
      files: accumulator.files + summary.files,
    }),
    { pass: 0, fail: 0, files: 0 },
  );

  const batches = summaries
    .map(
      (summary) =>
        `  ${summary.label}: ${summary.pass} pass, ${summary.fail} fail across ${summary.files} files`,
    )
    .join("\n");

  return [
    "Curated unit suite results:",
    batches,
    `  total: ${total.pass} pass, ${total.fail} fail across ${total.files} files`,
  ].join("\n");
}

// implements REQ-root-suite-batch-diagnostics
// covered_by TEST-root-suite-batch-diagnostics
async function runBatch(
  batch: Batch,
): Promise<SuiteSummary & { label: string }> {
  console.info(`\n$ bun ${batch.args.join(" ")}`);
  const runtimeDirectory = mkdtempSync(
    join(tmpdir(), "kibi-unit-engine-runtime-"),
  );
  const child = spawn("bun", batch.args, {
    cwd: process.cwd(),
    env: isolatedUnitBatchEnv(runtimeDirectory),
    stdio: ["ignore", "pipe", "pipe"],
  });

  const outputChunks: Buffer[] = [];
  const errorChunks: Buffer[] = [];
  let timedOut = false;

  child.stdout.on("data", (chunk: Buffer) => {
    outputChunks.push(chunk);
    process.stdout.write(chunk);
  });

  child.stderr.on("data", (chunk: Buffer) => {
    errorChunks.push(chunk);
    process.stderr.write(chunk);
  });

  const timeout = setTimeout(
    () => {
      timedOut = true;
      child.kill("SIGTERM");
    },
    BATCH_TIMEOUT_MINUTES * 60 * 1000,
  );

  const status = await new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code));
  }).finally(async () => {
    clearTimeout(timeout);
    const stopped = await stopTestEngines(runtimeDirectory);
    rmSync(runtimeDirectory, { recursive: true, force: true });
    if (stopped > 0) {
      console.info(
        `Stopped ${stopped} test engine${stopped === 1 ? "" : "s"} for ${batch.label}.`,
      );
    }
  });

  const summaries = parseSuiteSummaries(
    Buffer.concat([...outputChunks, ...errorChunks]).toString("utf8"),
  );
  const failureMessage = getBatchFailureMessage(batch.label, {
    timedOut,
    status,
    summaryCount: summaries.length,
  });
  if (failureMessage !== null) throw new Error(failureMessage);

  return { ...summaries[0], label: batch.label };
}

async function runCuratedUnitSuite(): Promise<number> {
  const summaries = new Array<SuiteSummary & { label: string }>(BATCHES.length);
  let nextBatch = 0;
  const workers = Array.from(
    { length: Math.min(BATCH_CONCURRENCY, BATCHES.length) },
    async () => {
      while (nextBatch < BATCHES.length) {
        const index = nextBatch;
        nextBatch += 1;
        const batch = BATCHES[index];
        if (batch !== undefined) summaries[index] = await runBatch(batch);
      }
    },
  );
  const workerResults = await Promise.allSettled(workers);
  const failure = workerResults.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (failure !== undefined) throw failure.reason;
  console.info(`\n${formatSuiteSummary(summaries)}`);
  return summaries.some((summary) => summary.fail > 0) ? 1 : 0;
}

const isEntryPoint =
  process.argv.length >= 2 &&
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === import.meta.filename;
if (isEntryPoint) {
  try {
    process.exit(await runCuratedUnitSuite());
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
