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

import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { writeCoverageManifestAudit } from "./coverage-manifest";
import { finalizeLcov } from "./finalize-lcov";
import { mergeLcovContents } from "./merge-lcov";

const COVERAGE_DIR = "coverage/unit";
const LCOV_PATH = join(COVERAGE_DIR, "lcov.info");
const UNIT_LINE_COVERAGE_FLOOR = 50;
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
  "15000",
  "--isolate",
  "--max-concurrency=1",
] as const;

const COVERAGE_SHARDS: readonly {
  readonly label: string;
  readonly paths: readonly string[];
}[] = [
  { label: "cli", paths: ["./packages/cli"] },
  { label: "mcp", paths: ["./packages/mcp"] },
  { label: "opencode", paths: ["./packages/opencode"] },
  { label: "codex", paths: ["./packages/codex"] },
  { label: "cursor", paths: ["./packages/cursor"] },
  {
    label: "vscode.activation",
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
    label: "vscode.core",
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
] as const;

function runBunTest(paths: readonly string[]): number {
  const result = spawnSync("bun", [...COVERAGE_ARGS, ...paths], {
    stdio: "inherit",
  });
  return result.status ?? 1;
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
  mkdirSync(COVERAGE_DIR, { recursive: true });

  const shardFiles: string[] = [];
  const failedShards: string[] = [];
  for (const shard of COVERAGE_SHARDS) {
    rmSync(LCOV_PATH, { force: true });
    const exitCode = runBunTest(shard.paths);
    if (exitCode !== 0) failedShards.push(`${shard.label} (exit ${exitCode})`);

    let lcovPath: string;
    try {
      lcovPath = await finalizeLcov(COVERAGE_DIR);
    } catch (error) {
      failedShards.push(`${shard.label} (coverage artifact missing)`);
      console.error(error);
      continue;
    }
    const shardPath = join(COVERAGE_DIR, `lcov.${shard.label}.info`);
    cpSync(lcovPath, shardPath);
    shardFiles.push(shardPath);
  }

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
  if (failedShards.length > 0) {
    console.error(`Coverage shards failed:\n${failedShards.join("\n")}`);
    process.exitCode = 1;
  }
}

if (import.meta.main) {
  await runUnitCoverage();
}
