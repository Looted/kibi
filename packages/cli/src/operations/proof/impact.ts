/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { OperationContext } from "../../public/operations/runtime-types.js";
import { executeCoverage } from "../../public/operations/specs/reporting.js";
import {
  type CoverageRowLike,
  type RequirementFingerprints,
  diffFingerprints,
  fingerprintRequirements,
  renderRequirementDiffs,
} from "./baseline-diff.js";

// implements REQ-kibi-verification-evidence-contract
export const COMMITTED_BASELINE_PATH = "proof/baseline.json";

export type ProofBaselineFile = {
  readonly version?: string;
  readonly mode?: string;
  readonly currentRequirements?: number;
  readonly proofProven?: number;
  readonly currentUnproven?: number;
  readonly trackedGaps?: Record<string, number>;
  readonly requirements?: RequirementFingerprints;
};

export type ProofImpactResult = {
  readonly comparisonTarget: typeof COMMITTED_BASELINE_PATH;
  readonly baselineVersion: string;
  readonly currentRequirements: number;
  readonly proofProven: number;
  readonly currentUnproven: number;
  readonly changes: ReturnType<typeof diffFingerprints>;
};

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function loadCommittedBaseline(
  workspaceRoot: string,
): Promise<ProofBaselineFile> {
  const absolute = join(workspaceRoot, COMMITTED_BASELINE_PATH);
  try {
    return JSON.parse(await readFile(absolute, "utf8")) as ProofBaselineFile;
  } catch {
    throw new Error(
      `proof impact: committed ${COMMITTED_BASELINE_PATH} is missing or unreadable`,
    );
  }
}

// implements REQ-kibi-verification-evidence-contract
export function buildProofImpact(
  baseline: ProofBaselineFile,
  coverage: { summary?: Record<string, unknown>; rows?: unknown },
): { result: ProofImpactResult; rows: CoverageRowLike[] } {
  const rows = Array.isArray(coverage.rows)
    ? (coverage.rows as CoverageRowLike[])
    : [];
  const summary = coverage.summary ?? {};
  const proofNotApplicable = asNumber(summary.proofNotApplicable);
  const total = asNumber(summary.total);
  const proofProven = asNumber(summary.proofProven);
  const currentUnproven =
    asNumber(summary.proofMissing) + asNumber(summary.proofUnresolved);
  const current = fingerprintRequirements(rows);
  const changes = diffFingerprints(baseline.requirements, current);
  return {
    rows,
    result: {
      comparisonTarget: COMMITTED_BASELINE_PATH,
      baselineVersion: baseline.version ?? "unknown",
      currentRequirements: total - proofNotApplicable,
      proofProven,
      currentUnproven,
      changes,
    },
  };
}

// implements REQ-kibi-verification-evidence-contract
export function renderProofImpact(
  result: ProofImpactResult,
  rows: readonly CoverageRowLike[],
): string {
  const header = [
    `Proof impact compared to committed ${result.comparisonTarget}`,
    `baseline version: ${result.baselineVersion}`,
    `current requirements: ${result.currentRequirements}`,
    `proofProven: ${result.proofProven}`,
    `currentUnproven: ${result.currentUnproven}`,
    `changed requirements: ${result.changes.length}`,
    "",
  ];
  const diff = renderRequirementDiffs(result.changes, rows);
  return `${header.join("\n")}${diff || "No requirement fingerprint changes versus the committed baseline.\n"}`;
}

// implements REQ-kibi-verification-evidence-contract
export async function executeProofImpact(context: OperationContext): Promise<{
  result: ProofImpactResult;
  rows: CoverageRowLike[];
  text: string;
}> {
  const baseline = await loadCommittedBaseline(context.workspaceRoot);
  const coverage = await executeCoverage(
    { by: "req", includePassing: true, limit: 100_000, offset: 0 },
    context,
  );
  const { result, rows } = buildProofImpact(
    baseline,
    coverage.structuredContent as {
      summary?: Record<string, unknown>;
      rows?: unknown;
    },
  );
  return { result, rows, text: renderProofImpact(result, rows) };
}
