/*
 * E2E: the CI unit-coverage pipeline runs end to end over real Bun coverage.
 *
 * REQ-014 — the coverage runner is the CI enforcement pipeline: it spawns real
 * `bun test --coverage` shards, merges the produced LCOV with source-map
 * diagnostics, summarizes line and branch coverage, audits the production
 * source manifest, and fails closed when coverage is incomplete. This
 * exerciser drives every one of those stages against a real fixture workspace
 * and the real repository shard orchestration (bounded to the runtime shard),
 * asserting both the passing flow and the fail-closed gate.
 *
 * Run via `bun run documentation/tests/e2e/coverage-pipeline.e2e.ts`.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeCoverageManifestAudit } from "../../../scripts/coverage-manifest.ts";
import { mergeLcovContentsWithDiagnostics } from "../../../scripts/merge-lcov.ts";
import {
  COVERAGE_SHARDS,
  UnitCoverageFailure,
  runUnitCoverage,
  runUnitCoverageIfMain,
  summarizeBranchCoverage,
} from "../../../scripts/run-unit-coverage.ts";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    console.error(`E2E FAILURE: ${message}`);
    process.exit(1);
  }
}

function fixtureLcov(file: string, hitAll: boolean, suffix?: string): string {
  const checksum = suffix === undefined ? "" : `,${suffix}`;
  return `TN:
SF:${file}
FN:1,(top-level)
FNDA:1,(top-level)
FNF:1
FNH:1
BRDA:10,0,0,1
BRDA:11,0,1,${hitAll ? 1 : 0}
BRF:2
BRH:${hitAll ? 2 : 1}
DA:1,1${checksum}
DA:2,${hitAll ? 1 : 0}${checksum}
DA:3,1${checksum}
LF:3
LH:${hitAll ? 3 : 2}
end_of_record
`;
}

// ── Stage 1: real `bun test --coverage` over a fixture workspace ────────────
const fixtureRoot = mkdtempSync(join(tmpdir(), "kibi-coverage-pipeline-"));
try {
  mkdirSync(join(fixtureRoot, "packages", "demo", "src"), { recursive: true });
  mkdirSync(join(fixtureRoot, "packages", "demo", "tests"), {
    recursive: true,
  });
  writeFileSync(
    join(fixtureRoot, "packages", "demo", "src", "covered.ts"),
    "export function covered(value: number): number {\n  if (value > 0) {\n    return value;\n  }\n  return 0;\n}\n",
    "utf8",
  );
  writeFileSync(
    join(fixtureRoot, "packages", "demo", "src", "untested.ts"),
    "export function untested(): number {\n  return 41;\n}\n",
    "utf8",
  );
  writeFileSync(
    join(fixtureRoot, "packages", "demo", "tests", "covered.test.ts"),
    `import { describe, expect, test } from "bun:test";
import { covered } from "../src/covered";

describe("covered", () => {
  test("returns positive values and clamps the rest", () => {
    expect(covered(1)).toBe(1);
    expect(covered(-1)).toBe(0);
  });
});
`,
    "utf8",
  );
  const fixtureCoverageDir = join(fixtureRoot, "coverage", "unit");
  mkdirSync(fixtureCoverageDir, { recursive: true });
  const bunBinary = process.execPath;
  const coverageRun = spawnSync(
    bunBinary,
    [
      "test",
      "--coverage",
      "--coverage-reporter",
      "lcov",
      "--coverage-dir",
      fixtureCoverageDir,
      "./packages/demo/tests/covered.test.ts",
    ],
    { cwd: fixtureRoot, encoding: "utf8", timeout: 120_000 },
  );
  assert(
    (coverageRun.status ?? 1) === 0,
    `fixture bun test --coverage failed:\n${coverageRun.stdout ?? ""}\n${coverageRun.stderr ?? ""}`,
  );
  assert(
    existsSync(join(fixtureCoverageDir, "lcov.info")),
    "real bun coverage must publish lcov.info",
  );
  const realLcov = readFileSync(join(fixtureCoverageDir, "lcov.info"), "utf8");
  assert(
    realLcov.includes("SF:"),
    "the real fixture lcov must contain source file records",
  );

  // ── Stage 2: branch summaries distinguish measured from missing BRDA ─────
  const measured = summarizeBranchCoverage(fixtureLcov("a.ts", true));
  assert(
    measured.available === true && measured.found === 2 && measured.hit === 2,
    `summarizeBranchCoverage mis-read a measured report: ${JSON.stringify(measured)}`,
  );
  const partial = summarizeBranchCoverage(fixtureLcov("a.ts", false));
  assert(
    partial.available === true && partial.hit === 1,
    `summarizeBranchCoverage must count untaken branches: ${JSON.stringify(partial)}`,
  );
  const noBranches = summarizeBranchCoverage(
    "SF:a.ts\nLF:1\nLH:1\nend_of_record\n",
  );
  assert(
    noBranches.available === false && noBranches.found === 0,
    "a report without BRDA records must stay explicitly unavailable",
  );
  const realBranches = summarizeBranchCoverage(realLcov);
  assert(
    typeof realBranches.available === "boolean",
    "branch summary over the real bun report must produce a verdict",
  );

  // ── Stage 3: merge with diagnostics over real + synthetic reports ────────
  const mergeable = [realLcov, fixtureLcov("synthetic.ts", true)];
  const merged = mergeLcovContentsWithDiagnostics(mergeable);
  assert(
    merged.lcov.includes("SF:") && merged.lcov.length > 0,
    "the merged lcov must union its inputs",
  );
  const conflicting = mergeLcovContentsWithDiagnostics([
    fixtureLcov("conflict.ts", true, "checksum-one"),
    fixtureLcov("conflict.ts", false, "checksum-two"),
  ]);
  assert(
    conflicting.diagnostics.length > 0,
    "conflicting source-map line data must surface diagnostics",
  );

  // ── Stage 4: production-source manifest audit gates incomplete coverage ──
  const auditDir = join(fixtureRoot, "coverage", "audit");
  mkdirSync(auditDir, { recursive: true });
  const missing = writeCoverageManifestAudit(fixtureRoot, auditDir, realLcov);
  assert(
    missing.includes("packages/demo/src/untested.ts"),
    `the audit must flag production sources absent from LCOV: ${JSON.stringify(missing)}`,
  );
  const missingReport = readFileSync(
    join(auditDir, "missing-source-files.txt"),
    "utf8",
  );
  assert(
    missingReport.includes("packages/demo/src/untested.ts"),
    "missing-source-files.txt must record the gap",
  );
  const completeLcov = `${realLcov}${fixtureLcov("packages/demo/src/untested.ts", true)}`;
  const complete = writeCoverageManifestAudit(
    fixtureRoot,
    auditDir,
    completeLcov,
  );
  assert(
    complete.length === 0,
    `a complete manifest must audit clean: ${JSON.stringify(complete)}`,
  );

  // ── Stage 5: the manifest CLI is a real process with exit codes ──────────
  const manifestRun = spawnSync(
    bunBinary,
    [
      join(process.cwd(), "scripts", "coverage-manifest.ts"),
      fixtureRoot,
      fixtureCoverageDir,
    ],
    { cwd: process.cwd(), encoding: "utf8", timeout: 60_000 },
  );
  assert(
    (manifestRun.status ?? 0) === 1,
    `coverage-manifest CLI must exit 1 on an incomplete manifest, got ${manifestRun.status}:\n${manifestRun.stdout ?? ""}`,
  );
  assert(
    (manifestRun.stderr ?? "").includes(
      "production source files are absent from LCOV",
    ),
    "the CLI must explain the manifest failure",
  );
  const completeDir = join(fixtureRoot, "coverage", "complete");
  mkdirSync(completeDir, { recursive: true });
  writeFileSync(join(completeDir, "lcov.info"), completeLcov, "utf8");
  const cleanRun = spawnSync(
    bunBinary,
    [
      join(process.cwd(), "scripts", "coverage-manifest.ts"),
      fixtureRoot,
      completeDir,
    ],
    { cwd: process.cwd(), encoding: "utf8", timeout: 60_000 },
  );
  assert(
    (cleanRun.status ?? 1) === 0,
    `coverage-manifest CLI must exit 0 on a complete manifest:\n${cleanRun.stdout ?? ""}${cleanRun.stderr ?? ""}`,
  );

  // ── Stage 6: real shard orchestration through the runtime shard ──────────
  assert(
    COVERAGE_SHARDS.some((shard) => shard.label === "runtime"),
    "the runtime shard must exist for the bounded orchestration run",
  );
  const pipelineCoverageDir = join(fixtureRoot, "coverage", "pipeline");
  const pipelineShardDir = join(fixtureRoot, "coverage", "pipeline-shards");
  let pipelineFailure: unknown;
  try {
    await runUnitCoverage({
      coverageDir: pipelineCoverageDir,
      shardDir: pipelineShardDir,
      shardLabels: ["runtime"],
    });
  } catch (error) {
    pipelineFailure = error;
  }
  assert(
    pipelineFailure instanceof UnitCoverageFailure,
    `a partial-shard run must fail the manifest audit closed (${pipelineFailure})`,
  );
  assert(
    String(pipelineFailure).includes("Coverage manifest audit failed"),
    `the fail-closed error must be the repository manifest audit:\n${String(pipelineFailure)}`,
  );
  const pipelineSummary = readFileSync(
    join(pipelineCoverageDir, "coverage-summary.txt"),
    "utf8",
  );
  assert(
    /Merged unit line coverage: \d+\.\d+%/.test(pipelineSummary),
    `the orchestrated run must publish a line-coverage summary:\n${pipelineSummary}`,
  );
  assert(
    /Merged unit branch coverage: (unavailable|\d+\.\d+%)/.test(
      pipelineSummary,
    ),
    `the orchestrated run must publish a branch-coverage summary:\n${pipelineSummary}`,
  );
  const pipelineLcov = readFileSync(
    join(pipelineCoverageDir, "lcov.info"),
    "utf8",
  );
  assert(
    pipelineLcov.includes("packages/runtime/src/"),
    "the runtime shard must contribute its package sources to the merged lcov",
  );
  assert(
    existsSync(join(pipelineCoverageDir, "lcov.runtime.info")),
    "per-shard snapshots must be published after nested runners finish",
  );
  const failedShards = readFileSync(
    join(pipelineCoverageDir, "failed-shards.txt"),
    "utf8",
  );
  assert(
    failedShards.trim() === "",
    `the runtime shard must pass inside the orchestrated run: ${failedShards}`,
  );
  // Library callers throw instead of setting process.exitCode, so bun-test
  // isolates are not poisoned. The CLI main path still maps the same failure
  // onto exit 1.

  // The main-module guard must stay a no-op for embedding importers.
  await runUnitCoverageIfMain(false, {
    coverageDir: join(fixtureRoot, "coverage", "noop"),
  });
  assert(
    !existsSync(join(fixtureRoot, "coverage", "noop")),
    "runUnitCoverageIfMain(false) must not start a run",
  );

  // Unknown shard labels must be rejected loudly instead of running nothing.
  let rejected = false;
  try {
    await runUnitCoverage({
      coverageDir: join(fixtureRoot, "coverage", "never"),
      shardLabels: ["runtime", "does-not-exist"],
    });
  } catch (error) {
    rejected = String(error).includes("Unknown unit coverage shard label");
  }
  assert(rejected, "unknown shard labels must throw before any shard runs");
  assert(
    !existsSync(join(fixtureRoot, "coverage", "never")),
    "a rejected run must not create its publish directory",
  );

  console.log("coverage pipeline e2e: all stages passed");
} finally {
  // Keep the pipeline artifacts out of the repository; everything lives in the
  // temp fixture, including the orchestrated shard run.
  rmSync(fixtureRoot, { recursive: true, force: true });
}
