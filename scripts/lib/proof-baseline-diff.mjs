/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk
 */

export const PROOF_BASELINE_VERSION = "kibi.proof-baseline.v2";

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item : String(item)))
    .sort();
}

export function fingerprintRequirements(rows) {
  const requirements = {};
  for (const row of rows ?? []) {
    const id = typeof row?.id === "string" ? row.id : "";
    const proofStatus =
      typeof row?.proofStatus === "string" ? row.proofStatus : "";
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

/**
 * Gaps that only say the recorded evidence is older than the code. `kibi prove`
 * clears them without any KB change, which is what CI does before it enforces
 * the baseline.
 */
const EVIDENCE_FRESHNESS_GAPS = Object.freeze([
  "stale_proof_receipt",
  "proof_contract_mismatch",
]);

function explanationHasCoverageLink(explanation) {
  return (
    Array.isArray(explanation?.coverageCandidates) &&
    explanation.coverageCandidates.length > 0
  );
}

/**
 * Production coverage is judged against tests with fresh passing receipts, so
 * stale receipts leave every symbol "uncovered". That gap is freshness-only
 * when each uncovered symbol still has a covered_by link; a symbol with no link
 * is a real traceability gap that re-proving cannot fix.
 */
function productionCoverageIsFreshnessOnly(row) {
  const stage = row?.proofStages?.productionSymbols;
  const uncovered = asStringArray(stage?.uncoveredSymbols);
  const explanations = Array.isArray(stage?.explanations)
    ? stage.explanations
    : [];
  return uncovered.every((symbolId) =>
    explanations.some(
      (explanation) =>
        explanation?.symbolId === symbolId &&
        explanationHasCoverageLink(explanation),
    ),
  );
}

/** Proof gaps of a coverage row that remain after fresh evidence is recorded. */
export function semanticGaps(row) {
  const gaps = asStringArray(row?.proofGaps).filter(
    (gap) => !EVIDENCE_FRESHNESS_GAPS.includes(gap),
  );
  const hasFreshnessGap = asStringArray(row?.proofGaps).some((gap) =>
    EVIDENCE_FRESHNESS_GAPS.includes(gap),
  );
  if (hasFreshnessGap && productionCoverageIsFreshnessOnly(row)) {
    return gaps.filter((gap) => gap !== "missing_production_symbol_coverage");
  }
  return gaps;
}

/**
 * Compare coverage rows with the committed baseline while setting aside gaps
 * that only reflect stale evidence. A local run can then catch semantic
 * regressions (grounding, contradictions, missing links) without re-proving
 * every test first.
 */
export function evaluateSemanticBaseline(baseline, rows) {
  const current = (rows ?? []).filter(
    (row) =>
      typeof row?.id === "string" && row.proofStatus !== "not_applicable",
  );
  const failures = [];
  const regressions = [];
  if (current.length !== baseline.currentRequirements) {
    failures.push(
      `current requirement count changed from ${baseline.currentRequirements} to ${current.length}`,
    );
  }
  const byId = new Map(current.map((row) => [row.id, row]));
  for (const [id, expected] of Object.entries(baseline.requirements ?? {})) {
    const row = byId.get(id);
    if (row === undefined) {
      regressions.push({ id, gaps: [], reason: "not a current requirement" });
      continue;
    }
    const allowed = new Set(asStringArray(expected?.gaps));
    const gaps = semanticGaps(row).filter((gap) => !allowed.has(gap));
    if (gaps.length > 0) regressions.push({ id, gaps });
  }
  for (const row of current) {
    if (!(row.id in (baseline.requirements ?? {}))) {
      regressions.push({
        id: row.id,
        gaps: semanticGaps(row),
        reason: "missing from proof/baseline.json",
      });
    }
  }
  for (const regression of regressions) {
    const detail =
      regression.reason ??
      `semantic gaps ${regression.gaps.join(", ")} (stale evidence ignored)`;
    failures.push(`${regression.id}: ${detail}`);
  }
  return { failures, regressions };
}

export function diffFingerprints(baseline, current) {
  const before = baseline ?? {};
  const ids = [
    ...new Set([...Object.keys(before), ...Object.keys(current)]),
  ].sort();
  const changes = [];
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

export function explanationsForRequirement(rows, requirementId) {
  const row = (rows ?? []).find((item) => item.id === requirementId);
  const explanations = row?.proofStages?.productionSymbols?.explanations;
  return Array.isArray(explanations) ? explanations : [];
}

function renderCandidate(candidate) {
  const testId = typeof candidate.testId === "string" ? candidate.testId : "?";
  const reason = typeof candidate.reason === "string" ? candidate.reason : "";
  const secondaries = Array.isArray(candidate.secondaryReasons)
    ? candidate.secondaryReasons.filter((item) => typeof item === "string")
    : [];
  const secondaryText =
    secondaries.length > 0 ? ` secondary=${secondaries.join(",")}` : "";
  return `      covered_by ${testId}: ${reason}${secondaryText}`;
}

export function renderRequirementDiffs(changes, rows = []) {
  if (!changes || changes.length === 0) return "";
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
    for (const explanation of explanationsForRequirement(rows, change.id)) {
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
          lines.push(renderCandidate(candidate));
      }
    }
  }
  return `${lines.join("\n")}\n`;
}

export function parseSpawnJson(result) {
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
