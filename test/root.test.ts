import { spawn } from "node:child_process";
import { resolve } from "node:path";

export type SuiteSummary = {
  pass: number;
  fail: number;
  files: number;
};

type Batch = {
  label: string;
  args: string[];
};

// implements REQ-root-suite-batch-diagnostics
// covered_by TEST-root-suite-batch-diagnostics
export const BATCH_TIMEOUT_MINUTES = 25;

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
    args: ["test", "--timeout", "15000", "./packages/cli"],
  },
  {
    label: "skillopt evaluator",
    args: ["test", "--timeout", "15000", "./scripts/skillopt-eval/tests"],
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
  const child = spawn("bun", batch.args, {
    cwd: process.cwd(),
    env: process.env,
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
  }).finally(() => clearTimeout(timeout));

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
  const summaries: Array<SuiteSummary & { label: string }> = [];
  for (const batch of BATCHES) {
    summaries.push(await runBatch(batch));
  }
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
