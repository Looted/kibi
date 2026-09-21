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
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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
/** Per-file bound for process-isolated shards. A clean file should finish well under this. */
const FILE_PROCESS_TIMEOUT_MS = 5 * 60 * 1000;
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

// implements REQ-014
export class UnitCoverageFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnitCoverageFailure";
  }
}

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
const CLI_SYNC_COMMAND_TESTS = readdirSync(CLI_COMMANDS_DIR)
  .filter((entry) => /^sync.*\.(?:test|spec)\.ts$/.test(entry))
  .map((entry) => `${CLI_COMMANDS_DIR}/${entry}`)
  .sort();
const CLI_CHECK_COMMAND_TESTS = [
  `${CLI_COMMANDS_DIR}/check.test.ts`,
  `${CLI_COMMANDS_DIR}/check-remaining.coverage.test.ts`,
  `${CLI_COMMANDS_DIR}/check-stale-manifest.test.ts`,
];
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
  /**
   * batch: one Bun process for the shard (default).
   * process-per-file: one Bun process per test file so a poisoned process
   * cannot take down later files in the same shard.
   */
  readonly isolation?: "batch" | "process-per-file";
}[] = [
  {
    label: "cli.commands",
    // Process-per-file: Bun 1.4 + coverage can hang a shared commands process
    // (dangling engine / spawnSync ETIMEDOUT cascade). Isolation replaces the
    // former 25-minute shared-process bound.
    paths: CLI_COMMAND_TESTS.filter(
      (path) =>
        !CLI_SYNC_COMMAND_TESTS.includes(path) &&
        !CLI_CHECK_COMMAND_TESTS.includes(path) &&
        !CLI_DOCTOR_COMMAND_TESTS.includes(path),
    ),
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
    isolation: "process-per-file",
  },
  {
    label: "cli.check-command",
    paths: CLI_CHECK_COMMAND_TESTS,
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
    isolation: "process-per-file",
  },
  {
    label: "cli.sync-command",
    paths: [CLI_SYNC_COMMAND_TEST],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
    isolation: "process-per-file",
  },
  {
    label: "cli.sync-coverage",
    paths: CLI_SYNC_COMMAND_TESTS.filter(
      (path) => path !== CLI_SYNC_COMMAND_TEST,
    ),
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
    isolation: "process-per-file",
  },
  {
    label: "cli.doctor",
    paths: CLI_DOCTOR_COMMAND_TESTS,
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
    isolation: "process-per-file",
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
    isolation: "process-per-file",
  },
  {
    // Isolated from engine-remaining: Bun 1.4 + coverage can failWrite EPIPE
    // from a live unix peer into the shared shard after other socket tests.
    label: "cli.engine-live-socket",
    paths: [
      "./packages/cli/tests/coverage-isolates/engine-live-socket.coverage.test.ts",
    ],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
    isolation: "process-per-file",
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
    isolation: "process-per-file",
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
    isolation: "process-per-file",
  },
  {
    // Same Bun 1.4 + coverage hang pattern observed after report-remaining isolation.
    label: "cli.sync-tracked-relationships",
    paths: [
      "./packages/cli/tests/coverage-isolates/sync-tracked-relationships.coverage.test.ts",
    ],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
    isolation: "process-per-file",
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

/**
 * Parse `--shards a,b` / `--shards=a,b` from argv, then `KIBI_COVERAGE_SHARDS`.
 * Used so local iteration (and act/CI debug) can run one shard without the
 * full unit-coverage matrix.
 */
export function shardLabelsFromArgv(
  argv: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): readonly string[] | undefined {
  const eq = argv.find((arg) => arg.startsWith("--shards="));
  if (eq !== undefined) {
    return eq
      .slice("--shards=".length)
      .split(",")
      .map((label) => label.trim())
      .filter((label) => label.length > 0);
  }
  const flagIndex = argv.indexOf("--shards");
  const flagValue = flagIndex >= 0 ? argv[flagIndex + 1] : undefined;
  if (typeof flagValue === "string") {
    return flagValue
      .split(",")
      .map((label) => label.trim())
      .filter((label) => label.length > 0);
  }
  const fromEnv = env.KIBI_COVERAGE_SHARDS;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv
      .split(",")
      .map((label) => label.trim())
      .filter((label) => label.length > 0);
  }
  return undefined;
}

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

type BunTestRunResult = Readonly<{
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
  lastOutput: string;
}>;

// implements REQ-014
export function formatCoverageFailure(
  options: Readonly<{
    label: string;
    file?: string;
    exitCode: number;
    durationMs: number;
    timeoutMs: number;
    timedOut: boolean;
    lastOutput?: string;
    missingCoverage?: boolean;
  }>,
): string {
  const file = options.file ? ` file=${options.file}` : "";
  const timedOut = options.timedOut ? " timedOut" : "";
  const missing = options.missingCoverage ? " coverage artifact missing" : "";
  const tail =
    options.lastOutput && options.lastOutput.trim().length > 0
      ? ` lastOutput=${JSON.stringify(options.lastOutput.slice(-500))}`
      : "";
  return `${options.label}${file} (exit ${options.exitCode}, ${options.durationMs}ms, timeout=${options.timeoutMs}ms${timedOut}${missing}${tail})`;
}

async function runBunTest(
  label: string,
  paths: readonly string[],
  coverageDir: string,
  timeoutMs = DEFAULT_SHARD_TIMEOUT_MS,
  setup?: readonly string[],
  processTimeoutMs = SHARD_PROCESS_TIMEOUT_MS,
  captureOutput = false,
): Promise<BunTestRunResult> {
  const args: string[] = [...COVERAGE_ARGS];
  const coverageDirIndex = args.indexOf("--coverage-dir");
  args[coverageDirIndex + 1] = coverageDir;
  const timeoutIndex = args.indexOf("--timeout");
  args[timeoutIndex + 1] = String(timeoutMs);
  const runtimeDirectory = mkdtempSync(
    join(tmpdir(), "kibi-unit-coverage-runtime-"),
  );
  const started = Date.now();
  try {
    if (setup !== undefined) {
      const setupResult = childProcess.spawnSync("bun", [...setup], {
        stdio: captureOutput ? "pipe" : "inherit",
        encoding: captureOutput ? "utf8" : undefined,
        env: isolatedUnitBatchEnv(runtimeDirectory),
        timeout: processTimeoutMs,
        killSignal: "SIGTERM",
      });
      if (spawnErrorCode(setupResult.error) === "ETIMEDOUT") {
        const lastOutput = captureOutput
          ? `${setupResult.stdout ?? ""}${setupResult.stderr ?? ""}`
          : "";
        console.error(
          `Unit coverage shard ${label} setup timed out after ${processTimeoutMs}ms; continuing with the remaining shards.`,
        );
        return {
          exitCode: 1,
          timedOut: true,
          durationMs: Date.now() - started,
          lastOutput,
        };
      }
      if ((setupResult.status ?? 1) !== 0) {
        return {
          exitCode: setupResult.status ?? 1,
          timedOut: false,
          durationMs: Date.now() - started,
          lastOutput: captureOutput
            ? `${setupResult.stdout ?? ""}${setupResult.stderr ?? ""}`
            : "",
        };
      }
    }
    const result = childProcess.spawnSync("bun", [...args, ...paths], {
      stdio: captureOutput ? "pipe" : "inherit",
      encoding: captureOutput ? "utf8" : undefined,
      env: isolatedUnitBatchEnv(runtimeDirectory),
      timeout: processTimeoutMs,
      killSignal: "SIGTERM",
    });
    const lastOutput = captureOutput
      ? `${result.stdout ?? ""}${result.stderr ?? ""}`
      : "";
    if (spawnErrorCode(result.error) === "ETIMEDOUT") {
      console.error(
        `Unit coverage shard ${label} timed out after ${processTimeoutMs}ms while waiting for the Bun test process; continuing with the remaining shards.`,
      );
      return {
        exitCode: 1,
        timedOut: true,
        durationMs: Date.now() - started,
        lastOutput,
      };
    }
    return {
      exitCode: result.status ?? 1,
      timedOut: false,
      durationMs: Date.now() - started,
      lastOutput,
    };
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

async function captureLcovArtifact(
  options: Readonly<{
    shardCoverageDir: string;
    coverageLcovPath: string;
    /** Passing tests that spawn nested Bun may emit no LCOV; keep the merge going. */
    allowEmpty?: boolean;
  }>,
): Promise<string> {
  const searchDirs = [
    options.shardCoverageDir,
    dirname(options.coverageLcovPath),
    dirname(BUN_DEFAULT_LCOV_PATH),
  ].filter((dir, index, all) => all.indexOf(dir) === index);

  const findExisting = async (): Promise<string | undefined> => {
    for (const dir of searchDirs) {
      const direct = join(dir, "lcov.info");
      if (existsSync(direct) && statSync(direct).size > 0) return direct;
      try {
        const finalized = await finalizeLcov(dir);
        if (existsSync(finalized) && statSync(finalized).size > 0) {
          return finalized;
        }
      } catch {
        // Keep searching sibling coverage directories and tmp LCOV names.
      }
    }
    return undefined;
  };

  const immediate = await findExisting();
  if (immediate !== undefined) return immediate;

  if (options.allowEmpty !== true) {
    const deadline = Date.now() + 400;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const retried = await findExisting();
      if (retried !== undefined) return retried;
    }
    throw new Error(
      `No lcov.info or temporary LCOV file found in ${options.shardCoverageDir}`,
    );
  }

  mkdirSync(options.shardCoverageDir, { recursive: true });
  const emptyPath = join(options.shardCoverageDir, "lcov.info");
  writeFileSync(emptyPath, "TN:\nend_of_record\n");
  console.warn(
    `Bun produced no LCOV under ${options.shardCoverageDir}; recording an empty coverage artifact.`,
  );
  return emptyPath;
}

function shardUnitName(path: string, index: number): string {
  const base = path.split("/").pop() ?? `file-${index}`;
  return `${String(index).padStart(3, "0")}-${base.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
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
      const isolation = shard.isolation ?? "batch";
      const units =
        isolation === "process-per-file"
          ? shard.paths.map((path, index) => ({
              label: `${shard.label}::${path}`,
              file: path,
              paths: [path],
              coverageDir: join(shardCoverageDir, shardUnitName(path, index)),
              processTimeoutMs: FILE_PROCESS_TIMEOUT_MS,
              setup: index === 0 ? shard.setup : undefined,
              captureOutput: true,
            }))
          : [
              {
                label: shard.label,
                file: undefined,
                paths: shard.paths,
                coverageDir: shardCoverageDir,
                processTimeoutMs:
                  shard.processTimeoutMs ?? SHARD_PROCESS_TIMEOUT_MS,
                setup: shard.setup,
                captureOutput: false,
              },
            ];
      const unitLcovs: string[] = [];
      console.info(
        `Starting unit coverage shard ${shard.label} (${units.length} ${isolation === "process-per-file" ? "file" : "path group"}${units.length === 1 ? "" : "s"}, isolation=${isolation})...`,
      );
      for (const unit of units) {
        mkdirSync(unit.coverageDir, { recursive: true });
        rmSync(coverageLcovPath, { force: true });
        if (coverageLcovPath !== BUN_DEFAULT_LCOV_PATH) {
          rmSync(BUN_DEFAULT_LCOV_PATH, { force: true });
        }
        const result = await runBunTest(
          unit.label,
          unit.paths,
          unit.coverageDir,
          shard.timeoutMs ?? DEFAULT_SHARD_TIMEOUT_MS,
          unit.setup,
          unit.processTimeoutMs,
          unit.captureOutput,
        );
        console.info(
          `Finished unit coverage ${unit.label} (exit ${result.exitCode}, ${result.durationMs}ms${result.timedOut ? ", timedOut" : ""}).`,
        );
        if (result.exitCode !== 0) {
          failedShards.push(
            formatCoverageFailure({
              label: shard.label,
              file: unit.file,
              exitCode: result.exitCode,
              durationMs: result.durationMs,
              timeoutMs: unit.processTimeoutMs,
              timedOut: result.timedOut,
              lastOutput: result.lastOutput,
            }),
          );
        }
        try {
          const lcovPath = await captureLcovArtifact({
            shardCoverageDir: unit.coverageDir,
            coverageLcovPath,
            allowEmpty: result.exitCode === 0,
          });
          const unitPath = join(unit.coverageDir, "lcov.info");
          if (lcovPath !== unitPath) cpSync(lcovPath, unitPath);
          unitLcovs.push(unitPath);
        } catch (error) {
          failedShards.push(
            formatCoverageFailure({
              label: shard.label,
              file: unit.file,
              exitCode: result.exitCode,
              durationMs: result.durationMs,
              timeoutMs: unit.processTimeoutMs,
              timedOut: result.timedOut,
              lastOutput: result.lastOutput,
              missingCoverage: true,
            }),
          );
          console.error(error);
        }
      }
      if (unitLcovs.length === 0) continue;
      const shardPath = join(shardCoverageDir, "lcov.info");
      const firstUnit = unitLcovs[0];
      if (unitLcovs.length === 1 && firstUnit !== undefined) {
        if (firstUnit !== shardPath) cpSync(firstUnit, shardPath);
      } else {
        const mergedUnits = mergeLcovContentsWithDiagnostics(
          unitLcovs.map((filePath) => readFileSync(filePath, "utf8")),
        );
        writeFileSync(shardPath, mergedUnits.lcov, "utf8");
      }
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
    const failures: string[] = [];
    if (
      options.shardLabels === undefined &&
      lineCoverage < UNIT_LINE_COVERAGE_FLOOR
    ) {
      failures.push(
        `Unit line coverage ${lineCoverage.toFixed(2)}% is below the ${UNIT_LINE_COVERAGE_FLOOR}% floor.`,
      );
    }
    if (options.shardLabels === undefined) {
      const missingFiles = writeCoverageManifestAudit(
        process.cwd(),
        coverageDir,
        mergedLcov,
      );
      if (missingFiles.length > 0) {
        failures.push(
          `Coverage manifest audit failed: ${missingFiles.length} production source files are absent from LCOV.`,
        );
      }
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
      failures.push(`Coverage shards failed:\n${failedShards.join("\n")}`);
    }
    if (failures.length > 0) {
      const message = failures.join("\n");
      console.error(message);
      throw new UnitCoverageFailure(message);
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
  const shardLabels =
    options.shardLabels ?? shardLabelsFromArgv(process.argv.slice(2));
  try {
    await runUnitCoverage({ ...options, shardLabels });
  } catch (error) {
    if (error instanceof UnitCoverageFailure) {
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

await runUnitCoverageIfMain();
