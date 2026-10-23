/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 */

import { execFileSync } from "node:child_process";

import type { OperationContext } from "../../public/operations/runtime-types.js";
import { executeCoverage } from "../../public/operations/specs/reporting.js";
import {
  type CoverageRowLike,
  type RequirementFingerprint,
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
  readonly proofTested?: number;
  readonly currentUntested?: number;
  readonly trackedGaps?: Record<string, number>;
  readonly requirements?: RequirementFingerprints;
};

export type ProofImpactResult = {
  readonly comparisonTarget: typeof COMMITTED_BASELINE_PATH;
  readonly baselineVersion: string;
  readonly currentRequirements: number;
  readonly proofTested: number;
  readonly currentUntested: number;
  readonly changes: ReturnType<typeof diffFingerprints>;
};

export type ReadCommittedFile = (
  workspaceRoot: string,
  relativePath: string,
) => string | Promise<string>;

export type ProofImpactExecuteOptions = {
  readonly readCommittedFile?: ReadCommittedFile;
  readonly loadCoverage?: (
    context: OperationContext,
  ) => Promise<{ structuredContent: unknown }>;
};

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function gitErrorText(error: unknown): string {
  if (error && typeof error === "object" && "stderr" in error) {
    const stderr = (error as { stderr?: unknown }).stderr;
    if (typeof stderr === "string" && stderr.trim() !== "") return stderr;
    if (Buffer.isBuffer(stderr) && stderr.length > 0) {
      return stderr.toString("utf8");
    }
  }
  return error instanceof Error ? error.message : String(error);
}

function committedBaselineReadError(
  relativePath: string,
  error: unknown,
): Error {
  const text = gitErrorText(error);
  if (
    /not a git repository/i.test(text) ||
    /ambiguous argument 'HEAD'/i.test(text) ||
    /unknown revision/i.test(text) ||
    /needed a single revision/i.test(text) ||
    /bad revision 'HEAD'/i.test(text)
  ) {
    return new Error(
      `proof impact: repository is not in a suitable Git state to read HEAD:${relativePath}`,
    );
  }
  if (
    /does not exist in 'HEAD'/i.test(text) ||
    /exists on disk, but not in 'HEAD'/i.test(text) ||
    /path '.*' does not exist/i.test(text)
  ) {
    return new Error(
      `proof impact: HEAD:${relativePath} is missing or unreadable`,
    );
  }
  return new Error(
    `proof impact: could not read HEAD:${relativePath}: ${text.trim()}`,
  );
}

// implements REQ-kibi-verification-evidence-contract
export function readCommittedHeadFile(
  workspaceRoot: string,
  relativePath: string,
): string {
  try {
    return execFileSync(
      "git",
      ["-C", workspaceRoot, "show", `HEAD:${relativePath}`],
      {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch (error) {
    throw committedBaselineReadError(relativePath, error);
  }
}

// implements REQ-kibi-verification-evidence-contract
export async function loadCommittedBaseline(
  workspaceRoot: string,
  readCommittedFile: ReadCommittedFile = readCommittedHeadFile,
): Promise<ProofBaselineFile> {
  const raw = await readCommittedFile(workspaceRoot, COMMITTED_BASELINE_PATH);
  let parsed: ProofBaselineFile;
  try {
    parsed = JSON.parse(raw) as ProofBaselineFile;
  } catch {
    throw new Error(
      `proof impact: HEAD:${COMMITTED_BASELINE_PATH} is not valid JSON`,
    );
  }
  return upgradeBaselineStatuses(parsed);
}

/**
 * A baseline committed before kibi.proof-baseline.v3 records a fully tested
 * requirement as `proven`. Read it as `tested`, so the comparison shows real
 * changes instead of a rename on every row.
 */
// implements REQ-kibi-evidence-levels
export function upgradeBaselineStatuses(
  baseline: ProofBaselineFile,
): ProofBaselineFile {
  if (baseline.requirements === undefined) return baseline;
  const requirements: Record<string, RequirementFingerprint> = {};
  for (const [id, entry] of Object.entries(baseline.requirements)) {
    requirements[id] =
      entry?.proofStatus === "proven"
        ? { ...entry, proofStatus: "tested" }
        : entry;
  }
  return { ...baseline, requirements };
}

/** Diagnostic only: successful evaluation always exits 0. Ratchet lives in check-proof-baseline.mjs. */
export function proofImpactExitCode(_result: ProofImpactResult): 0 {
  return 0;
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
  const proofTested = asNumber(summary.proofTested);
  const currentUntested =
    asNumber(summary.proofMissing) + asNumber(summary.proofUnresolved);
  const current = fingerprintRequirements(rows);
  const changes = diffFingerprints(baseline.requirements, current);
  return {
    rows,
    result: {
      comparisonTarget: COMMITTED_BASELINE_PATH,
      baselineVersion: baseline.version ?? "unknown",
      currentRequirements: total - proofNotApplicable,
      proofTested,
      currentUntested,
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
    `proofTested: ${result.proofTested}`,
    `currentUntested: ${result.currentUntested}`,
    `changed requirements: ${result.changes.length}`,
    "",
  ];
  const diff = renderRequirementDiffs(result.changes, rows);
  return `${header.join("\n")}${diff || "No requirement fingerprint changes versus the committed baseline.\n"}`;
}

// implements REQ-kibi-verification-evidence-contract
export async function executeProofImpact(
  context: OperationContext,
  options: ProofImpactExecuteOptions = {},
): Promise<{
  result: ProofImpactResult;
  rows: CoverageRowLike[];
  text: string;
}> {
  const baseline = await loadCommittedBaseline(
    context.workspaceRoot,
    options.readCommittedFile ?? readCommittedHeadFile,
  );
  const coverage = options.loadCoverage
    ? await options.loadCoverage(context)
    : await executeCoverage(
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
