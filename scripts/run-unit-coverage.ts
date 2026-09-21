#!/usr/bin/env bun
/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import * as childProcess from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isolatedUnitBatchEnv, stopTestEngines } from "../test/root.test.js";
import { writeCoverageManifestAudit } from "./coverage-manifest";
import { finalizeLcov } from "./finalize-lcov";
import { mergeLcovContentsWithDiagnostics } from "./merge-lcov";

const COVERAGE_DIR = "coverage/unit";
// Bun 1.3.10 ignores --coverage-dir for LCOV and writes here instead. This
// path must remain tracked separately from an embedding run's requested
// coverage directory so nested runners can capture and clear the fallback
// without mistaking a stale report for the current shard.
const BUN_DEFAULT_LCOV_PATH = join(COVERAGE_DIR, "lcov.info");
// Bun may clear its configured coverage directory at the start of each test
// process. Keep intermediate shard copies in a sibling directory so they
// survive until the final merge.
const SHARD_DIR = "coverage/.unit-shards";
const UNIT_LINE_COVERAGE_FLOOR = 50;
const DEFAULT_SHARD_TIMEOUT_MS = 15_000;
// This is deliberately separate from Bun's per-test timeout. Some valid
// shards contain hundreds of tests that invoke the CLI serially; the complete
// cli.commands shard takes several minutes locally. The process bound only
// protects against a true runner leak while leaving that shard headroom.
const SHARD_PROCESS_TIMEOUT_MS = 15 * 60 * 1000;
/** cli.commands is a large serial CLI suite; CI needs more than the default process bound. */
const CLI_COMMANDS_PROCESS_TIMEOUT_MS = 25 * 60 * 1000;
/** Journaled engine and packed SkillOpt tests start Prolog/daemons; 15s isolate kills them. */
const CLI_ENGINE_SHARD_TIMEOUT_MS = 120_000;
const COVERAGE_ARGS = [
  "test",
  "--coverage",
  "--coverage-reporter",
  "text",
  "--coverage-reporter",
  "lcov",
  "--coverage-dir",
  COVERAGE_DIR,
  "--timeout",
  String(DEFAULT_SHARD_TIMEOUT_MS),
  "--isolate",
  "--max-concurrency=1",
] as const;

// implements REQ-root-suite-batch-diagnostics
const CLI_ROOT_TESTS = readdirSync("./packages/cli/tests")
  .filter((entry) => /\.(?:test|spec)\.ts$/.test(entry))
  .map((entry) => `./packages/cli/tests/${entry}`);

const ZCODE_ARTIFACT_TESTS = new Set([
  "install-artifact.test.ts",
  "mcp-launcher.subprocess.test.ts",
  "packed-consumer-smoke.test.ts",
]);
const ZCODE_UNIT_TESTS = readdirSync("./packages/zcode/tests")
  .filter(
    (entry) =>
      /\.(?:test|spec)\.ts$/.test(entry) && !ZCODE_ARTIFACT_TESTS.has(entry),
  )
  .map((entry) => `./packages/zcode/tests/${entry}`);

function spawnErrorCode(error: Error | undefined): string | undefined {
  return (error as NodeJS.ErrnoException | undefined)?.code;
}

const CLI_COMMANDS_DIR = "./packages/cli/tests/commands";
const CLI_SYNC_COMMAND_TEST = `${CLI_COMMANDS_DIR}/sync.test.ts`;
const CLI_DOCTOR_COMMAND_TESTS = readdirSync(CLI_COMMANDS_DIR)
  .filter((entry) => /^doctor.*\.(?:test|spec)\.ts$/.test(entry))
  .map((entry) => `${CLI_COMMANDS_DIR}/${entry}`)
  .sort();
const CLI_COMMAND_TESTS = readdirSync(CLI_COMMANDS_DIR)
  .filter((entry) => /\.(?:test|spec)\.ts$/.test(entry))
  .map((entry) => `${CLI_COMMANDS_DIR}/${entry}`);

export const COVERAGE_SHARDS: readonly {
  readonly label: string;
  readonly paths: readonly string[];
  readonly timeoutMs?: number;
  /** Override the Bun process wall-clock bound for oversized serial shards. */
  readonly processTimeoutMs?: number;
  /** Build generated package assets before tests that execute the built tree. */
  readonly setup?: readonly string[];
  /** Query-string `?case=` imports poison Bun's line map; still run the tests. */
  readonly mergeLcov?: boolean;
}[] = [
  {
    label: "cli.commands",
    // sync.test.ts and doctor*.test.ts are isolated below: under Bun 1.4 +
    // --coverage they can hang the shared commands process (dangling engine /
    // spawnSync ETIMEDOUT cascade) until the process bound fires.
    paths: CLI_COMMAND_TESTS.filter(
      (path) =>
        path !== CLI_SYNC_COMMAND_TEST &&
        !CLI_DOCTOR_COMMAND_TESTS.includes(path),
    ),
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
    processTimeoutMs: CLI_COMMANDS_PROCESS_TIMEOUT_MS,
  },
  {
    label: "cli.sync-command",
    paths: [CLI_SYNC_COMMAND_TEST],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
    processTimeoutMs: 5 * 60 * 1000,
  },
  {
    // Isolated from cli.commands: Bun 1.4 + coverage can leave a dangling
    // engine after doctor SWI-Prolog checks, then poison spawnSync(/bin/sh)
    // for every later commands-suite test (ETIMEDOUT cascade).
    label: "cli.doctor",
    paths: CLI_DOCTOR_COMMAND_TESTS,
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
    processTimeoutMs: 5 * 60 * 1000,
  },
  {
    label: "cli.operations",
    paths: ["./packages/cli/tests/operations"],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
  },
  {
    label: "cli.public",
    paths: ["./packages/cli/tests/public"],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
  },
  {
    label: "cli.support",
    paths: [
      "./packages/cli/tests/extractors",
      "./packages/cli/tests/utils",
      "./packages/cli/tests/logic",
      "./packages/cli/tests/proof",
      "./packages/cli/tests/relationships",
      "./packages/cli/tests/traceability",
      "./packages/cli/tests/prolog",
      "./packages/cli/tests/helpers",
    ],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
  },
  {
    label: "capability-plugins",
    paths: [
      "./packages/plugin-sdk",
      "./packages/plugin-builtin",
      "./packages/plugin-jev",
      "./packages/cli/tests/plugins",
    ],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
  },
  {
    label: "cli.engine-remaining",
    paths: ["./packages/cli/tests/engine-remaining.coverage.test.ts"],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
  },
  {
    // Isolated from engine-remaining: Bun 1.4 + coverage can failWrite EPIPE
    // from a live unix peer into the shared shard after other socket tests.
    label: "cli.engine-live-socket",
    paths: [
      "./packages/cli/tests/coverage-isolates/engine-live-socket.coverage.test.ts",
    ],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
    processTimeoutMs: 3 * 60 * 1000,
  },
  {
    label: "cli.engine",
    paths: CLI_ROOT_TESTS.filter((path) => {
      const name = path.split("/").pop() ?? "";
      return (
        /(?:^|\/)(?:engine|prolog)/.test(name) &&
        !name.includes("engine-remaining")
      );
    }),
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
  },
  {
    label: "cli.root.lcov",
    paths: CLI_ROOT_TESTS.filter((path) => {
      const name = path.split("/").pop() ?? "";
      return (
        !/(?:^|\/)(?:engine|prolog)/.test(name) &&
        /(?:lcov|gaps|remaining)/.test(name)
      );
    }),
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
  },
  {
    label: "cli.root",
    paths: CLI_ROOT_TESTS.filter((path) => {
      const name = path.split("/").pop() ?? "";
      return (
        !/(?:^|\/)(?:engine|prolog)/.test(name) &&
        !/(?:lcov|gaps|remaining)/.test(name)
      );
    }),
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
  },
  {
    label: "cli.discovery-remaining",
    paths: [
      "./packages/cli/tests/coverage-isolates/discovery-remaining.coverage.test.ts",
    ],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
  },
  {
    // Isolated from cli.commands: under Bun 1.4 + --coverage the file can hang
    // the shared commands process after a long serial suite with no test output.
    label: "cli.report-remaining",
    paths: [
      "./packages/cli/tests/coverage-isolates/report-remaining.coverage.test.ts",
    ],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
    processTimeoutMs: 3 * 60 * 1000,
  },
  {
    // Same Bun 1.4 + coverage hang pattern observed after report-remaining isolation.
    label: "cli.sync-tracked-relationships",
    paths: [
      "./packages/cli/tests/coverage-isolates/sync-tracked-relationships.coverage.test.ts",
    ],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
    processTimeoutMs: 3 * 60 * 1000,
  },
  {
    label: "cli.report",
    paths: ["./packages/cli/tests/report"],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
  },
  {
    label: "cli.parity",
    paths: ["./packages/cli/tests/parity"],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
  },
  {
    label: "cli.query",
    paths: ["./packages/cli/tests/query"],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
  },
  {
    label: "cli.integration",
    paths: [
      "./packages/cli/tests/integration",
      "./packages/cli/tests/fixtures",
    ],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
  },
  {
    label: "mcp",
    paths: ["./packages/mcp"],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
  },
  { label: "opencode", paths: ["./packages/opencode"] },
  { label: "codex", paths: ["./packages/codex"] },
  { label: "cursor", paths: ["./packages/cursor"] },
  { label: "runtime", paths: ["./packages/runtime"] },
  {
    label: "zcode",
    paths: ZCODE_UNIT_TESTS,
    setup: ["run", "build:zcode"],
  },
  {
    label: "skillopt",
    paths: ["./scripts/skillopt-eval/tests"],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
  },
  {
    label: "skillopt.training-setup",
    paths: [
      "./scripts/skillopt-eval/coverage-isolates/training-setup.coverage.test.ts",
    ],
  },
  {
    label: "skillopt.optimizer",
    paths: [
      "./scripts/skillopt-eval/coverage-isolates/codex-optimizer-step.coverage.test.ts",
    ],
  },
  {
    label: "skillopt.cursor-runner",
    paths: [
      "./scripts/skillopt-eval/coverage-isolates/cursor-runner.coverage.test.ts",
    ],
  },
  {
    label: "skillopt.fixture-kb",
    paths: [
      "./scripts/skillopt-eval/coverage-isolates/fixture-kb-setup.coverage.test.ts",
    ],
  },
  {
    label: "skillopt.cli-workflow-remaining",
    paths: [
      "./scripts/skillopt-eval/coverage-isolates/cli-workflow-remaining.coverage.test.ts",
    ],
  },
  {
    label: "skillopt.cursor-suite-remaining",
    paths: [
      "./scripts/skillopt-eval/coverage-isolates/cursor-suite-remaining.coverage.test.ts",
    ],
  },
  {
    label: "scripts",
    paths: ["./scripts/tests", "./test/root-summary.test.ts"],
  },
  {
    label: "vscode.activation",
    // LCOV line maps are unioned by source line. Keep activation coverage in
    // its own shard so alternate import graphs remain auditable.
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
    paths: [
      "./packages/vscode/tests/activation/contextOnOpen.test.ts",
      "./packages/vscode/tests/activation/extension.test.ts",
      "./packages/vscode/tests/activation/mcp.test.ts",
      "./packages/vscode/tests/activation/treeView.test.ts",
      "./packages/vscode/tests/activation/workspace.test.ts",
      "./packages/vscode/tests/activation-modules.test.ts",
      "./packages/vscode/tests/workspace-activation-direct.test.ts",
    ],
  },
  {
    label: "vscode.activation-coverage",
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
    paths: [
      "./packages/vscode/tests/coverage-completion.test.ts",
      "./packages/vscode/tests/workspace-resolve.coverage.test.ts",
    ],
  },
  {
    label: "vscode.core",
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
    paths: [
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
  {
    label: "vscode.providers",
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
    paths: [
      "./packages/vscode/tests/code-lens.coverage.test.ts",
      "./packages/vscode/tests/hover-provider.coverage.test.ts",
      "./packages/vscode/tests/tree-provider.coverage.test.ts",
      "./packages/vscode/tests/providers-lcov.coverage.test.ts",
    ],
  },
] as const;

type UnitCoverageOptions = Readonly<{
  /** Override the published coverage directory for an embedding test harness. */
  readonly coverageDir?: string;
  /** Override the intermediate shard directory for an embedding test harness. */
  readonly shardDir?: string;
  /**
   * Restrict the run to shards carrying these labels. Embedding harnesses
   * (for example the end-to-end pipeline exerciser) use this to drive the real
   * orchestration over a bounded shard subset; an omitted list runs every
   * shard exactly as CI does.
   */
  readonly shardLabels?: readonly string[];
}>;

export function selectedShards(labels: readonly string[] | undefined) {
  if (labels === undefined) return COVERAGE_SHARDS;
  const wanted = new Set(labels);
  if (wanted.size === 0) {
    throw new Error(
      "Unknown unit coverage shard label(s): an empty shard selection would run nothing",
    );
  }
  const selected = COVERAGE_SHARDS.filter((shard) => wanted.has(shard.label));
  const missing = [...wanted].filter(
    (label) => !selected.some((shard) => shard.label === label),
  );
  if (missing.length > 0) {
    throw new Error(
      `Unknown unit coverage shard label(s): ${missing.join(", ")}`,
    );
  }
  return selected;
}

async function runBunTest(
  label: string,
  paths: readonly string[],
  coverageDir: string,
  timeoutMs = DEFAULT_SHARD_TIMEOUT_MS,
  setup?: readonly string[],
  processTimeoutMs = SHARD_PROCESS_TIMEOUT_MS,
): Promise<number> {
  const args: string[] = [...COVERAGE_ARGS];
  const coverageDirIndex = args.indexOf("--coverage-dir");
  args[coverageDirIndex + 1] = coverageDir;
  const timeoutIndex = args.indexOf("--timeout");
  args[timeoutIndex + 1] = String(timeoutMs);
  const runtimeDirectory = mkdtempSync(
    join(tmpdir(), "kibi-unit-coverage-runtime-"),
  );
  try {
    if (setup !== undefined) {
      const setupResult = childProcess.spawnSync("bun", [...setup], {
        stdio: "inherit",
        env: isolatedUnitBatchEnv(runtimeDirectory),
        timeout: processTimeoutMs,
        killSignal: "SIGTERM",
      });
      if (spawnErrorCode(setupResult.error) === "ETIMEDOUT") {
        console.error(
          `Unit coverage shard ${label} setup timed out after ${processTimeoutMs}ms; continuing with the remaining shards.`,
        );
        return 1;
      }
      if ((setupResult.status ?? 1) !== 0) return setupResult.status ?? 1;
    }
    const result = childProcess.spawnSync("bun", [...args, ...paths], {
      stdio: "inherit",
      env: isolatedUnitBatchEnv(runtimeDirectory),
      // Bun's per-test timeout cannot interrupt a synchronous child-process
      // leak in a test. Bound the Bun process itself so this shard cannot
      // wedge the serial runner indefinitely.
      timeout: processTimeoutMs,
      killSignal: "SIGTERM",
    });
    if (spawnErrorCode(result.error) === "ETIMEDOUT") {
      console.error(
        `Unit coverage shard ${label} timed out after ${processTimeoutMs}ms while waiting for the Bun test process; continuing with the remaining shards.`,
      );
      return 1;
    }
    return result.status ?? 1;
  } finally {
    await stopTestEngines(runtimeDirectory);
    rmSync(runtimeDirectory, { recursive: true, force: true });
  }
}

function lineCoveragePercent(lcov: string): number {
  let linesFound = 0;
  let linesHit = 0;
  for (const line of lcov.split("\n")) {
    if (line.startsWith("LF:")) linesFound += Number(line.slice(3));
    if (line.startsWith("LH:")) linesHit += Number(line.slice(3));
  }
  return linesFound === 0 ? 0 : (linesHit / linesFound) * 100;
}

// implements REQ-014
// covered_by TEST-scripts-unit-coverage-runner
export type BranchCoverageSummary = Readonly<{
  readonly available: boolean;
  readonly found: number;
  readonly hit: number;
}>;

/**
 * Summarize measured LCOV branches without treating missing BRDA data as a
 * zero measurement. Bun's JavaScript coverage may publish line/function data
 * without branch records, so that case must remain explicitly unavailable.
 */
export function summarizeBranchCoverage(lcov: string): BranchCoverageSummary {
  let found = 0;
  let hit = 0;
  for (const line of lcov.split("\n")) {
    const match = line.match(/^BRDA:\d+,[^,]*,[^,]*,(.*)$/);
    if (match === null) continue;
    const taken = match[1] ?? "";
    if (taken !== "-" && !/^\d+$/.test(taken)) continue;
    found += 1;
    if (taken !== "-" && Number(taken) > 0) hit += 1;
  }
  return { available: found > 0, found, hit };
}

// implements REQ-014
export async function runUnitCoverage(
  options: UnitCoverageOptions = {},
): Promise<void> {
  const coverageDir = options.coverageDir ?? COVERAGE_DIR;
  const shardDir = options.shardDir ?? SHARD_DIR;
  // Validate the shard selection before touching any directory so a rejected
  // run leaves the workspace exactly as it was.
  const shards = selectedShards(options.shardLabels);
  const coverageLcovPath = join(coverageDir, "lcov.info");
  rmSync(coverageDir, { recursive: true, force: true });
  mkdirSync(coverageDir, { recursive: true });
  mkdirSync(shardDir, { recursive: true });
  // Never clear the whole shard base: a nested runner can share it with an
  // outer runner. Each invocation owns only this private run directory.
  const runShardDir = mkdtempSync(join(shardDir, "run-"));

  try {
    const shardFiles: string[] = [];
    const shardArtifacts: Array<Readonly<{ label: string; path: string }>> = [];
    const failedShards: string[] = [];
    for (const shard of shards) {
      const shardCoverageDir = join(
        runShardDir,
        shard.label.replace(/[^a-zA-Z0-9._-]/g, "_"),
      );
      mkdirSync(shardCoverageDir, { recursive: true });
      // Bun 1.3.10 ignores --coverage-dir and emits lcov.info at the
      // repository default. Clear both possible fallback locations before
      // each shard so a nested/previous report cannot be reused.
      rmSync(coverageLcovPath, { force: true });
      if (coverageLcovPath !== BUN_DEFAULT_LCOV_PATH) {
        rmSync(BUN_DEFAULT_LCOV_PATH, { force: true });
      }
      console.info(
        `Starting unit coverage shard ${shard.label} (${shard.paths.length} path${shard.paths.length === 1 ? "" : "s"})...`,
      );
      const exitCode = await runBunTest(
        shard.label,
        shard.paths,
        shardCoverageDir,
        shard.timeoutMs ?? DEFAULT_SHARD_TIMEOUT_MS,
        shard.setup,
        shard.processTimeoutMs ?? SHARD_PROCESS_TIMEOUT_MS,
      );
      console.info(
        `Finished unit coverage shard ${shard.label} (exit ${exitCode}).`,
      );
      if (exitCode !== 0)
        failedShards.push(`${shard.label} (exit ${exitCode})`);

      // Allow Bun's post-process coverage writer to publish its fallback
      // report before selecting the source for this shard.
      await new Promise((resolve) => setTimeout(resolve, 100));
      let lcovPath: string;
      try {
        const shardLcovPath = join(shardCoverageDir, "lcov.info");
        if (existsSync(shardLcovPath)) {
          lcovPath = shardLcovPath;
        } else if (existsSync(coverageLcovPath)) {
          // Compatibility fallback for Bun versions that honor the requested
          // directory only after the child process exits.
          lcovPath = coverageLcovPath;
        } else if (existsSync(BUN_DEFAULT_LCOV_PATH)) {
          // Bun 1.3.10 ignores --coverage-dir and always writes here.
          lcovPath = BUN_DEFAULT_LCOV_PATH;
        } else {
          lcovPath = await finalizeLcov(shardCoverageDir);
        }
      } catch (error) {
        failedShards.push(`${shard.label} (coverage artifact missing)`);
        console.error(error);
        continue;
      }
      // Keep the captured snapshot outside coverageDir until every child has
      // finished. A nested Bun process may clear coverage/unit/lcov.info.
      const shardPath = join(shardCoverageDir, "lcov.info");
      if (lcovPath !== shardPath) cpSync(lcovPath, shardPath);
      shardArtifacts.push({ label: shard.label, path: shardPath });
      if (shard.mergeLcov !== false) {
        shardFiles.push(shardPath);
      }
    }

    // A nested Bun process may clear the requested coverage directory while
    // honoring neither its --coverage-dir nor its caller's lifecycle. Recreate
    // the published directory only after all child processes have finished.
    mkdirSync(coverageDir, { recursive: true });
    const mergeResult = mergeLcovContentsWithDiagnostics(
      shardFiles.map((filePath) => readFileSync(filePath, "utf8")),
    );
    writeFileSync(coverageLcovPath, mergeResult.lcov, "utf8");
    writeFileSync(
      join(coverageDir, "lcov-conflicts.txt"),
      mergeResult.diagnostics.length > 0
        ? `${mergeResult.diagnostics.join("\n")}\n`
        : "",
      "utf8",
    );
    if (mergeResult.diagnostics.length > 0) {
      console.warn(
        `Coverage merger reported ${mergeResult.diagnostics.length} source-map conflict(s); see ${join(coverageDir, "lcov-conflicts.txt")}`,
      );
    }
    const mergedLcov = mergeResult.lcov;
    const lineCoverage = lineCoveragePercent(mergedLcov);
    const branchCoverage = summarizeBranchCoverage(mergedLcov);
    const branchSummary = branchCoverage.available
      ? `Merged unit branch coverage: ${((branchCoverage.hit / branchCoverage.found) * 100).toFixed(2)}% (${branchCoverage.hit}/${branchCoverage.found} branches)`
      : "Merged unit branch coverage: unavailable (LCOV contains no BRDA records)";
    console.log(
      `Merged unit line coverage: ${lineCoverage.toFixed(2)}% (floor ${UNIT_LINE_COVERAGE_FLOOR}%)`,
    );
    console.log(branchSummary);
    writeFileSync(
      join(coverageDir, "coverage-summary.txt"),
      `${[
        `Merged unit line coverage: ${lineCoverage.toFixed(2)}%`,
        branchSummary,
      ].join("\n")}\n`,
      "utf8",
    );
    if (lineCoverage < UNIT_LINE_COVERAGE_FLOOR) {
      console.error(
        `Unit line coverage ${lineCoverage.toFixed(2)}% is below the ${UNIT_LINE_COVERAGE_FLOOR}% floor.`,
      );
      process.exitCode = 1;
    }
    const missingFiles = writeCoverageManifestAudit(
      process.cwd(),
      coverageDir,
      mergedLcov,
    );
    if (missingFiles.length > 0) {
      console.error(
        `Coverage manifest audit failed: ${missingFiles.length} production source files are absent from LCOV.`,
      );
      process.exitCode = 1;
    }
    // Publish per-shard snapshots only after all child and nested runners are
    // done, so Bun's fallback cleanup cannot erase the outer artifacts.
    for (const artifact of shardArtifacts) {
      cpSync(artifact.path, join(coverageDir, `lcov.${artifact.label}.info`));
    }
    writeFileSync(
      join(coverageDir, "failed-shards.txt"),
      failedShards.length > 0 ? `${failedShards.join("\n")}\n` : "",
      "utf8",
    );
    if (failedShards.length > 0) {
      console.error(`Coverage shards failed:\n${failedShards.join("\n")}`);
      process.exitCode = 1;
    }
  } finally {
    rmSync(runShardDir, { recursive: true, force: true });
  }
}

export async function runUnitCoverageIfMain(
  isMain = import.meta.main,
  options: UnitCoverageOptions = {},
): Promise<void> {
  if (!isMain) return;
  await runUnitCoverage(options);
}

await runUnitCoverageIfMain();
