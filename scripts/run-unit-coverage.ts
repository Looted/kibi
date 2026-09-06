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
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeCoverageManifestAudit } from "./coverage-manifest";
import { finalizeLcov } from "./finalize-lcov";
import { mergeLcovContents } from "./merge-lcov";
import {
  isolatedUnitBatchEnv,
  stopTestEngines,
} from "../test/root.test.js";

const COVERAGE_DIR = "coverage/unit";
const LCOV_PATH = join(COVERAGE_DIR, "lcov.info");
// Bun may clear its configured coverage directory at the start of each test
// process. Keep intermediate shard copies in a sibling directory so they
// survive until the final merge.
const SHARD_DIR = "coverage/.unit-shards";
const UNIT_LINE_COVERAGE_FLOOR = 50;
const DEFAULT_SHARD_TIMEOUT_MS = 15_000;
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

export const COVERAGE_SHARDS: readonly {
  readonly label: string;
  readonly paths: readonly string[];
  readonly timeoutMs?: number;
  /** Query-string `?case=` imports poison Bun's line map; still run the tests. */
  readonly mergeLcov?: boolean;
}[] = [
  {
    label: "cli.commands",
    paths: ["./packages/cli/tests/commands"],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
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
    label: "cli.engine-remaining",
    paths: [
      "./packages/cli/tests/engine-remaining.coverage.test.ts",
    ],
    timeoutMs: CLI_ENGINE_SHARD_TIMEOUT_MS,
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
  { label: "scripts", paths: ["./scripts/tests"] },
  {
    label: "vscode.activation",
    // merge-lcov now drops extra DA:0 rows from lower-hit-rate maps, so the
    // cache-busted activation shard can contribute its complete activation
    // file maps without poisoning vscode.core.
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

async function runBunTest(
  paths: readonly string[],
  coverageDir: string,
  timeoutMs = DEFAULT_SHARD_TIMEOUT_MS,
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
    const result = childProcess.spawnSync("bun", [...args, ...paths], {
      stdio: "inherit",
      env: isolatedUnitBatchEnv(runtimeDirectory),
    });
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
export async function runUnitCoverage(): Promise<void> {
  rmSync(COVERAGE_DIR, { recursive: true, force: true });
  rmSync(SHARD_DIR, { recursive: true, force: true });
  mkdirSync(COVERAGE_DIR, { recursive: true });
  mkdirSync(SHARD_DIR, { recursive: true });

  const shardFiles: string[] = [];
  const failedShards: string[] = [];
  for (const shard of COVERAGE_SHARDS) {
    const shardCoverageDir = join(
      SHARD_DIR,
      shard.label.replace(/[^a-zA-Z0-9._-]/g, "_"),
    );
    mkdirSync(shardCoverageDir, { recursive: true });
    // Bun 1.3.13 accepts --coverage-dir but still emits lcov.info at the
    // repository default. Remove that path before each shard so a fallback
    // capture cannot accidentally reuse the previous shard's report.
    rmSync(LCOV_PATH, { force: true });
    const exitCode = await runBunTest(
      shard.paths,
      shardCoverageDir,
      shard.timeoutMs ?? DEFAULT_SHARD_TIMEOUT_MS,
    );
    if (exitCode !== 0) failedShards.push(`${shard.label} (exit ${exitCode})`);

    let lcovPath: string;
    try {
      const shardLcovPath = join(shardCoverageDir, "lcov.info");
      if (existsSync(shardLcovPath)) {
        lcovPath = shardLcovPath;
      } else if (existsSync(LCOV_PATH)) {
        // Compatibility fallback for Bun versions that ignore --coverage-dir.
        lcovPath = LCOV_PATH;
      } else {
        lcovPath = await finalizeLcov(shardCoverageDir);
      }
    } catch (error) {
      failedShards.push(`${shard.label} (coverage artifact missing)`);
      console.error(error);
      continue;
    }
    const shardPath = join(COVERAGE_DIR, `lcov.${shard.label}.info`);
    cpSync(lcovPath, shardPath);
    if (shard.mergeLcov !== false) {
      shardFiles.push(shardPath);
    }
  }

  // Some Bun versions flush the default report just after the test process
  // exits. Let that writer finish before publishing the merged artifact so it
  // cannot overwrite the final report.
  await new Promise((resolve) => setTimeout(resolve, 100));
  const mergedLcov = mergeLcovContents(
    shardFiles.map((filePath) => readFileSync(filePath, "utf8")),
  );
  writeFileSync(LCOV_PATH, mergedLcov, "utf8");
  const lineCoverage = lineCoveragePercent(mergedLcov);
  console.log(
    `Merged unit line coverage: ${lineCoverage.toFixed(2)}% (floor ${UNIT_LINE_COVERAGE_FLOOR}%)`,
  );
  if (lineCoverage < UNIT_LINE_COVERAGE_FLOOR) {
    console.error(
      `Unit line coverage ${lineCoverage.toFixed(2)}% is below the ${UNIT_LINE_COVERAGE_FLOOR}% floor.`,
    );
    process.exitCode = 1;
  }
  const missingFiles = writeCoverageManifestAudit(
    process.cwd(),
    COVERAGE_DIR,
    mergedLcov,
  );
  if (missingFiles.length > 0) {
    console.warn(
      `Coverage manifest audit: ${missingFiles.length} production source files are absent from LCOV.`,
    );
  }
  writeFileSync(
    join(COVERAGE_DIR, "failed-shards.txt"),
    failedShards.length > 0 ? `${failedShards.join("\n")}\n` : "",
    "utf8",
  );
  // Keep the published artifact focused on the merged report. A late Bun
  // coverage writer from a failed shard may still finish after its test
  // process exits; isolating and removing shard directories prevents it from
  // overwriting the merged lcov.info.
  rmSync(SHARD_DIR, { recursive: true, force: true });
  if (failedShards.length > 0) {
    console.error(`Coverage shards failed:\n${failedShards.join("\n")}`);
    process.exitCode = 1;
  }
}

export async function runUnitCoverageIfMain(
  isMain = import.meta.main,
): Promise<void> {
  if (!isMain) return;
  await runUnitCoverage();
}

await runUnitCoverageIfMain();
