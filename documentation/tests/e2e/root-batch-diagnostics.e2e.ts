/*
 * E2E: the curated unit suite surfaces actionable batch failure diagnostics.
 *
 * SCEN-root-suite-batch-diagnostics — spawns a real failing `bun test`
 * subprocess, parses its summary with the production parser, and asserts the
 * production failure-message builder reports an actionable, named batch
 * failure. Run via `bun run documentation/tests/e2e/root-batch-diagnostics.e2e.ts`.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BATCH_TIMEOUT_MINUTES,
  getBatchFailureMessage,
  isCuratedSuiteEntryPoint,
  parseSuiteSummaries,
  runBatch,
} from "../../../test/root.test.ts";
import { COVERAGE_SHARDS } from "../../../scripts/run-unit-coverage.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    console.error(`E2E FAILURE: ${message}`);
    process.exit(1);
  }
}

// The curated suite must stay a script entrypoint, never a bun-test import.
assert(
  isCuratedSuiteEntryPoint(
    ["bun", join(process.cwd(), "test", "root.test.ts")],
    join(process.cwd(), "test", "root.test.ts"),
    true,
  ) === true,
  "root.test.ts must be a curated suite entrypoint when run directly",
);
assert(
  isCuratedSuiteEntryPoint(
    ["bun", "test", "something"],
    join(process.cwd(), "test", "root.test.ts"),
    true,
  ) === false,
  "root.test.ts must not treat bun test invocations as the curated entrypoint",
);

const fixtureDir = mkdtempSync(join(tmpdir(), "kibi-root-batch-e2e-"));
const failingTest = join(fixtureDir, "failing.fixture.test.ts");
writeFileSync(
  failingTest,
  `import { describe, expect, test } from "bun:test";
describe("root batch diagnostics fixture", () => {
  test("deliberately fails to exercise batch diagnostics", () => {
    expect("actual").toBe("expected");
  });
  test("second case keeps the summary plural for the parser contract", () => {
    expect(1).toBe(1);
  });
});
`,
  "utf8",
);

try {
  const run = spawnSync("bun", ["test", failingTest], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 120_000,
  });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  assert(
    run.status !== 0,
    "the deliberately failing fixture must exit non-zero",
  );

  const summaries = parseSuiteSummaries(output);
  assert(
    summaries.length === 1,
    `the failing run must yield exactly one Bun summary, got ${summaries.length}: ${output.slice(-600)}`,
  );
  assert(
    summaries[0].fail > 0,
    `the parsed summary must report the failure: ${JSON.stringify(summaries)}`,
  );

  const message = getBatchFailureMessage("fixture batch", {
    label: "fixture batch",
    status: run.status ?? 1,
    summaryCount: summaries.length,
    summaries,
    timedOut: false,
  });
  assert(
    message !== null && /fixture batch/.test(message),
    `batch failure message must name the failing batch: ${String(message)}`,
  );
  console.log(
    `root-batch-diagnostics e2e: parsed ${JSON.stringify(summaries)}; message: ${message}`,
  );

  const passingFixture = join(fixtureDir, "passing.fixture.test.ts");
  writeFileSync(
    passingFixture,
    `import { describe, expect, test } from "bun:test";
describe("root batch diagnostics passing fixture", () => {
  test("passes cleanly", () => {
    expect(1).toBe(1);
  });
  test("second clean case", () => {
    expect(2).toBe(2);
  });
});
`,
    "utf8",
  );
  const passingRun = spawnSync("bun", ["test", "--timeout", "15000", passingFixture], {
    cwd: fixtureDir,
    encoding: "utf8",
    timeout: 120_000,
  });
  const passingSummaries = parseSuiteSummaries(
    `${passingRun.stdout ?? ""}${passingRun.stderr ?? ""}`,
  );
  assert(
    passingRun.status === 0 &&
      passingSummaries.length === 1 &&
      passingSummaries[0].fail === 0,
    "a passing batch must parse to a single clean summary",
  );
  assert(
    getBatchFailureMessage("passing batch", {
      label: "passing batch",
      status: passingRun.status ?? 1,
      summaryCount: passingSummaries.length,
      summaries: passingSummaries,
      timedOut: false,
    }) === null,
    "a passing batch must produce no failure message",
  );
  assert(
    Number.isInteger(BATCH_TIMEOUT_MINUTES) && BATCH_TIMEOUT_MINUTES > 0,
    "the curated suite must configure a positive batch timeout",
  );
  assert(
    COVERAGE_SHARDS.length > 0 &&
      COVERAGE_SHARDS.every((shard) => shard.label && Array.isArray(shard.paths)),
    "coverage shards must declare labels and paths",
  );

  // Run a real batch through the production batch runner: the runner spawns
  // the bun subprocess with the isolated unit-batch environment, parses the
  // summary, and cleans up test engines.
  const batched = await runBatch({
    label: "root batch diagnostics fixture batch",
    args: ["test", "--timeout", "15000", passingFixture],
  });
  assert(
    batched.label === "root batch diagnostics fixture batch" &&
      batched.fail === 0 &&
      batched.pass > 0,
    `runBatch must return the clean fixture summary: ${JSON.stringify(batched)}`,
  );
  console.log("root-batch-diagnostics e2e: passed");
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}
