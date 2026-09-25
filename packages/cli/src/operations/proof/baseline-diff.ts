/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 */

// implements REQ-kibi-verification-evidence-contract
export const PROOF_BASELINE_VERSION = "kibi.proof-baseline.v2";

export type RequirementFingerprint = {
  readonly proofStatus: string;
  readonly gaps: readonly string[];
  readonly uncoveredSymbols: readonly string[];
};

export type RequirementFingerprints = Readonly<
  Record<string, RequirementFingerprint>
>;

export type CoverageRowLike = {
  readonly id?: unknown;
  readonly proofStatus?: unknown;
  readonly proofGaps?: unknown;
  readonly proofStages?: {
    readonly productionSymbols?: {
      readonly uncoveredSymbols?: unknown;
      readonly explanations?: unknown;
    };
  };
};

export type FingerprintChange = {
  readonly id: string;
  readonly kind: "added" | "removed" | "changed";
  readonly before?: RequirementFingerprint;
  readonly after?: RequirementFingerprint;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item : String(item)))
    .sort();
}

// implements REQ-kibi-verification-evidence-contract
export function fingerprintRequirements(
  rows: readonly CoverageRowLike[],
): RequirementFingerprints {
  const requirements: Record<string, RequirementFingerprint> = {};
  for (const row of rows) {
    const id = typeof row.id === "string" ? row.id : "";
    const proofStatus =
      typeof row.proofStatus === "string" ? row.proofStatus : "";
    if (id === "" || proofStatus === "not_applicable") continue;
    requirements[id] = {
      proofStatus,
      gaps: asStringArray(row.proofGaps),
      uncoveredSymbols: asStringArray(
        row.proofStages?.productionSymbols?.uncoveredSymbols,
      ),
    };
  }
  return requirements;
}

// implements REQ-kibi-verification-evidence-contract
export function diffFingerprints(
  baseline: RequirementFingerprints | undefined,
  current: RequirementFingerprints,
): FingerprintChange[] {
  const before = baseline ?? {};
  const ids = [
    ...new Set([...Object.keys(before), ...Object.keys(current)]),
  ].sort();
  const changes: FingerprintChange[] = [];
  for (const id of ids) {
    const left = before[id];
    const right = current[id];
    if (left === undefined && right !== undefined) {
      changes.push({ id, kind: "added", after: right });
      continue;
    }
    if (left !== undefined && right === undefined) {
      changes.push({ id, kind: "removed", before: left });
      continue;
    }
    if (left === undefined || right === undefined) continue;
    if (
      left.proofStatus !== right.proofStatus ||
      JSON.stringify(left.gaps) !== JSON.stringify(right.gaps) ||
      JSON.stringify(left.uncoveredSymbols) !==
        JSON.stringify(right.uncoveredSymbols)
    ) {
      changes.push({ id, kind: "changed", before: left, after: right });
    }
  }
  return changes;
}

type CandidateLike = {
  readonly testId?: unknown;
  readonly qualifies?: unknown;
  readonly reason?: unknown;
  readonly secondaryReasons?: unknown;
};

type ExplanationLike = {
  readonly symbolId?: unknown;
  readonly reason?: unknown;
  readonly coverageCandidates?: unknown;
};

export function explanationsForRequirement(
  rows: readonly CoverageRowLike[],
  requirementId: string,
): readonly ExplanationLike[] {
  const row = rows.find((item) => item.id === requirementId);
  const explanations = row?.proofStages?.productionSymbols?.explanations;
  return Array.isArray(explanations)
    ? (explanations as readonly ExplanationLike[])
    : [];
}

function renderCandidate(candidate: CandidateLike): string {
  const testId = typeof candidate.testId === "string" ? candidate.testId : "?";
  const reason = typeof candidate.reason === "string" ? candidate.reason : "";
  const secondaries = Array.isArray(candidate.secondaryReasons)
    ? candidate.secondaryReasons.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  const secondaryText =
    secondaries.length > 0 ? ` secondary=${secondaries.join(",")}` : "";
  return `      covered_by ${testId}: ${reason}${secondaryText}`;
}

// implements REQ-kibi-verification-evidence-contract
export function renderRequirementDiffs(
  changes: readonly FingerprintChange[],
  rows: readonly CoverageRowLike[] = [],
): string {
  if (changes.length === 0) return "";
  const lines = [
    "Requirement fingerprint diffs vs committed proof/baseline.json:",
  ];
  for (const change of changes) {
    if (change.kind === "added" && change.after) {
      lines.push(
        `  ${change.id}: added (${change.after.proofStatus}; gaps=${change.after.gaps.join(",") || "none"})`,
      );
    } else if (change.kind === "removed" && change.before) {
      lines.push(`  ${change.id}: removed (was ${change.before.proofStatus})`);
    } else if (change.kind === "changed" && change.before && change.after) {
      if (change.before.proofStatus !== change.after.proofStatus) {
        lines.push(
          `  ${change.id}: ${change.before.proofStatus} -> ${change.after.proofStatus}`,
        );
      } else {
        lines.push(`  ${change.id}: fingerprint changed`);
      }
      const beforeGaps = new Set(change.before.gaps);
      const afterGaps = new Set(change.after.gaps);
      for (const gap of change.after.gaps) {
        if (!beforeGaps.has(gap)) lines.push(`    gap added: ${gap}`);
      }
      for (const gap of change.before.gaps) {
        if (!afterGaps.has(gap)) lines.push(`    gap removed: ${gap}`);
      }
      const beforeSymbols = new Set(change.before.uncoveredSymbols);
      const afterSymbols = new Set(change.after.uncoveredSymbols);
      for (const symbol of change.after.uncoveredSymbols) {
        if (!beforeSymbols.has(symbol))
          lines.push(`    uncovered symbol added: ${symbol}`);
      }
      for (const symbol of change.before.uncoveredSymbols) {
        if (!afterSymbols.has(symbol))
          lines.push(`    uncovered symbol removed: ${symbol}`);
      }
    }
    const explanations = explanationsForRequirement(rows, change.id);
    for (const explanation of explanations) {
      const symbolId =
        typeof explanation.symbolId === "string" ? explanation.symbolId : "";
      const reason =
        typeof explanation.reason === "string" ? explanation.reason : "";
      if (symbolId !== "") lines.push(`    ${symbolId}: ${reason}`);
      const candidates = Array.isArray(explanation.coverageCandidates)
        ? explanation.coverageCandidates
        : [];
      for (const candidate of candidates) {
        if (candidate && typeof candidate === "object")
          lines.push(renderCandidate(candidate as CandidateLike));
      }
    }
  }
  return `${lines.join("\n")}\n`;
}

export function parseSpawnJson(result: {
  readonly error?: unknown;
  readonly status?: number | null;
  readonly stdout?: string | null;
  readonly stderr?: string | null;
}): unknown {
  if (result.error) throw result.error;
  const text = `${result.stdout ?? ""}`.trim();
  try {
    return JSON.parse(text);
  } catch (error) {
    const detail = `${result.stderr || result.stdout || ""}`.trim();
    if (result.status !== 0 && result.status !== null) {
      throw new Error(detail || String(error));
    }
    throw error;
  }
}
