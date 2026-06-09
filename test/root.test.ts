import { spawn } from "node:child_process";

type SuiteSummary = {
  pass: number;
  fail: number;
  files: number;
};

type Batch = {
  label: string;
  args: string[];
};

const BATCHES: Batch[] = [
  {
    label: "cli",
    args: ["test", "--timeout", "15000", "./packages/cli"],
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
    args: ["test", "--timeout", "15000", "./packages/opencode"],
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

function parseSuiteSummaries(output: string): SuiteSummary[] {
  const summaries: SuiteSummary[] = [];
  const summaryPattern =
    /\n\s*(\d+) pass\n\s*(\d+) fail[\s\S]*?Ran \d+ tests across (\d+) files?/g;
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
    15 * 60 * 1000,
  );

  const status = await new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code));
  }).finally(() => clearTimeout(timeout));

  const summaries = parseSuiteSummaries(
    Buffer.concat([...outputChunks, ...errorChunks]).toString("utf8"),
  );
  if (summaries.length !== 1) {
    throw new Error(
      `Expected one Bun summary for ${batch.label}, got ${summaries.length}.`,
    );
  }
  if (timedOut) {
    throw new Error(`${batch.label} timed out after 15 minutes.`);
  }
  if (status !== 0) {
    throw new Error(`${batch.label} exited with status ${status ?? "null"}.`);
  }

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

try {
  process.exit(await runCuratedUnitSuite());
} catch (error) {
  console.error(error);
  process.exit(1);
}
