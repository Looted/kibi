import { PREDICATE_HELD_OUT_CASE_IDS } from "../../fixtures/predicate-corpus";
import type { GateCell, HeldOutPredicateGateCell } from "../../scoring/gates";

// executable_for TEST-skillopt-codex-optimization
export const FAMILIES = [
  "discovery",
  "mutation",
  "quality",
  "resilience",
] as const;
export function cells(
  count: number,
  scoreAt: (index: number) => number,
  hardAt: (index: number) => 0 | 1,
): readonly GateCell[] {
  return Array.from({ length: count }, (_, index) => {
    const hard = hardAt(index);
    return {
      taskId: `task-${String(index + 1).padStart(2, "0")}`,
      family: FAMILIES[index % FAMILIES.length] ?? "discovery",
      score: scoreAt(index),
      hard,
      outcome: hard === 1 ? "pass" : "fail",
      terminalCategory: hard === 1 ? null : "behavioral_failure",
      criticalFailureCount: 0,
    };
  });
}
export function passingSkillMatrix() {
  return {
    candidate: cells(
      16,
      (index) => (index < 13 ? 90 : 84),
      (index) => (index < 13 ? 1 : 0),
    ),
    baseline: cells(
      16,
      (index) => (index < 11 ? 85 : 70),
      (index) => (index < 11 ? 1 : 0),
    ),
    oneShot: cells(
      16,
      (index) => (index < 12 ? 85 : 80),
      (index) => (index < 12 ? 1 : 0),
    ),
  } as const;
}
export function passingHeldOutPredicateCells(): readonly HeldOutPredicateGateCell[] {
  const variants = ["baseline", "one-shot", "skillopt"] as const;
  return PREDICATE_HELD_OUT_CASE_IDS.flatMap((caseId) =>
    variants.map((variant) => ({
      taskId: `${caseId}:${variant}`,
      family: "fact-predicate-modeling",
      score: 100,
      hard: 1,
      outcome: "pass",
      terminalCategory: null,
      criticalFailureCount: 0,
      caseId,
      variant,
      predicateEvidence: { outcome: "pass", caseId },
    })),
  );
}

type ScoringGateFixtureMatrix = Readonly<{
  candidate: readonly GateCell[];
  baseline: readonly GateCell[];
  oneShot: readonly GateCell[];
}>;
