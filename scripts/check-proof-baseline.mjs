#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  diffFingerprints,
  evaluateSemanticBaseline,
  fingerprintRequirements,
  parseSpawnJson,
  renderRequirementDiffs,
} from "./lib/proof-baseline-diff.mjs";

const INTEGRITY_RULES = [
  "no-dangling-refs",
  "source-relationship-parity",
  "no-cycles",
  "required-fields",
  "deprecated-adr-no-successor",
  "domain-contradictions",
  "query-plan-safety",
  "logic-coverage",
  "strict-fact-shape",
  "strict-req-fact-pairing",
  "predicate-verifiability",
  "rule-safety",
  "rule-verifiability",
  "semantic-completeness",
  "symbol-traceability",
];

// --semantic-only compares the baseline without re-proving first: gaps that only
// reflect stale evidence are set aside, so grounding, contradiction, and link
// regressions surface locally before CI runs `kibi prove --all`.
const semanticOnly = process.argv.includes("--semantic-only");

const baseline = JSON.parse(
  await readFile(path.resolve("proof/baseline.json"), "utf8"),
);
const kibi = process.env.KIBI_CLI ?? path.resolve("packages/cli/bin/kibi");

function spawnJson(argv) {
  const result = spawnSync(kibi, argv, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return { argv, result, json: parseSpawnJson(result) };
}

function unwrapPayload(json) {
  if (json && typeof json === "object") {
    if (json.summary && Array.isArray(json.rows)) return json;
    if (json.structuredContent) return unwrapPayload(json.structuredContent);
    if (json.data) return unwrapPayload(json.data);
  }
  return json;
}

const coverage = unwrapPayload(
  spawnJson([
    "coverage",
    "--format",
    "json",
    "--include-passing",
    "--limit",
    "100000",
  ]).json,
);
const status = unwrapPayload(spawnJson(["status", "--format", "json"]).json);
const check = unwrapPayload(
  spawnJson(["check", "--format", "json", "--rules", INTEGRITY_RULES.join(",")])
    .json,
);
const violations =
  check.structuredContent?.violations ?? check.violations ?? [];

if (semanticOnly) {
  const { failures, regressions } = evaluateSemanticBaseline(
    baseline,
    coverage.rows ?? [],
  );
  if (violations.length > 0)
    failures.push(`kibi check reported ${violations.length} violation(s)`);
  if (status.syncState !== "fresh" || status.dirty !== false) {
    failures.push("semantic check requires a fresh Kibi status (dirty: false)");
  }
  const report = {
    version: "kibi.proof-baseline-semantic-result.v1",
    mode: "semantic-only",
    currentRequirements: baseline.currentRequirements,
    regressions,
    violations: violations.length,
    status: { syncState: status.syncState, dirty: status.dirty },
    failures,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (failures.length > 0) process.exitCode = 1;
} else {
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
  const currentFingerprints = fingerprintRequirements(coverage.rows ?? []);
  const fingerprintChanges = diffFingerprints(
    baseline.requirements,
    currentFingerprints,
  );
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
      status.proofSnapshotDirty !== false
    ) {
      failures.push(
        "strict equality requires a clean, fresh Kibi status and proof snapshot",
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
      proofSnapshot: status.proofSnapshot,
      proofSnapshotAvailable: status.proofSnapshotAvailable,
      proofSnapshotDirty: status.proofSnapshotDirty,
    },
    failures,
    fingerprintChanges: fingerprintChanges.length,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (failures.length > 0) {
    const diffText = renderRequirementDiffs(
      fingerprintChanges,
      coverage.rows ?? [],
    );
    if (diffText) process.stdout.write(diffText);
    process.exitCode = 1;
  }
}
