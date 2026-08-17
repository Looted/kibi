#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const baseline = JSON.parse(
  await readFile(path.resolve("proof/baseline.json"), "utf8"),
);
const kibi = process.env.KIBI_CLI ?? "kibi";

function jsonCommand(argv) {
  const result = spawnSync(kibi, argv, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

const coverage = jsonCommand([
  "coverage",
  "--format",
  "json",
  "--include-passing",
  "--limit",
  "100000",
]);
const status = jsonCommand(["status", "--format", "json"]);
const check = jsonCommand(["check", "--format", "json"]);
const summary = coverage.summary;
const currentRequirements = summary.total - summary.proofNotApplicable;
const currentUnproven = summary.proofMissing + summary.proofUnresolved;
const gapCounts = Object.fromEntries(
  coverage.rows
    .filter((row) => row.proofStatus !== "not_applicable")
    .flatMap((row) => row.proofGaps ?? [])
    .reduce(
      (counts, gap) => counts.set(gap, (counts.get(gap) ?? 0) + 1),
      new Map(),
    ),
);
const violations =
  check.structuredContent?.violations ?? check.violations ?? [];
const failures = [];
if (currentRequirements !== baseline.currentRequirements) {
  failures.push(
    `current requirement count changed from ${baseline.currentRequirements} to ${currentRequirements}`,
  );
}
if (summary.proofProven < baseline.proofProven) {
  failures.push(
    `proofProven regressed from ${baseline.proofProven} to ${summary.proofProven}`,
  );
}
if (currentUnproven > baseline.currentUnproven) {
  failures.push(
    `current unproven count increased from ${baseline.currentUnproven} to ${currentUnproven}`,
  );
}
for (const [gap, count] of Object.entries(gapCounts)) {
  if (count > (baseline.trackedGaps[gap] ?? 0)) {
    failures.push(
      `tracked gap ${gap} increased from ${baseline.trackedGaps[gap] ?? 0} to ${count}`,
    );
  }
}
for (const [gap, count] of Object.entries(baseline.trackedGaps)) {
  if (!(gap in gapCounts) && count > 0)
    failures.push(
      `tracked gap ${gap} disappeared from the report; refresh the baseline explicitly`,
    );
}
if (violations.length > 0)
  failures.push(`kibi check reported ${violations.length} violation(s)`);
if (baseline.mode === "equality") {
  if (summary.proofProven !== currentRequirements || currentUnproven !== 0) {
    failures.push(
      `strict equality failed: proven=${summary.proofProven}, current=${currentRequirements}, unproven=${currentUnproven}`,
    );
  }
  if (
    status.syncState !== "fresh" ||
    status.dirty !== false ||
    status.verificationSnapshotDirty !== false
  ) {
    failures.push(
      "strict equality requires a clean, fresh Kibi status and verification snapshot",
    );
  }
}

const report = {
  version: "kibi.proof-baseline-result.v1",
  mode: baseline.mode,
  currentRequirements,
  proofProven: summary.proofProven,
  currentUnproven,
  gapCounts,
  violations: violations.length,
  status: {
    syncState: status.syncState,
    dirty: status.dirty,
    verificationSnapshot: status.verificationSnapshot,
    verificationSnapshotAvailable: status.verificationSnapshotAvailable,
    verificationSnapshotDirty: status.verificationSnapshotDirty,
  },
  failures,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
