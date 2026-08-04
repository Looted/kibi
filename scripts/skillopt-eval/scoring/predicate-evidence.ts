import {
  EvidenceBindingError,
  type PredicateCaseSnapshot,
  decodePredicateCaseSnapshot,
} from "../contracts/evidence";
import type { parsePrivateEvaluatorManifest } from "../fixtures/private";
import { decodeFinalStatePredicateSnapshot } from "../runtime/final-state";
import type { CellEvidence } from "./cell";

type Manifest = ReturnType<typeof parsePrivateEvaluatorManifest>;

export type PredicateCaseFailure =
  | "predicate-lane"
  | "predicate-name"
  | "predicate-args"
  | "predicate-polarity"
  | "predicate-edges"
  | "logical-fact-lanes"
  | "logic-claim-manifest"
  | "logic-claim-grounding"
  | "wrong-graph"
  | "replayed-evidence"
  | "mixed-snapshot"
  | "malformed-snapshot";

export type PredicateCaseEvidence =
  | Readonly<{
      outcome: "pass";
      caseId: string;
    }>
  | Readonly<{
      outcome: "fail";
      caseId: string;
      failure: PredicateCaseFailure;
    }>;

export type PredicateCaseEvaluation = Readonly<{
  predicateEvidence?: PredicateCaseEvidence;
  failureCodes: readonly PredicateCaseFailure[];
}>;

function predicateFailures(
  manifest: Manifest,
  snapshot: PredicateCaseSnapshot,
): readonly PredicateCaseFailure[] {
  const expectation = manifest.predicateExpectation;
  if (expectation === null) return [];
  const failures: PredicateCaseFailure[] = [];
  const laneMatches = (() => {
    switch (expectation.expectedLane) {
      case "predicate":
        return snapshot.facts.some((fact) => fact.factKind === "predicate");
      case "strict_property":
        return (
          snapshot.facts.some((fact) => fact.factKind === "subject") &&
          snapshot.facts.some((fact) => fact.factKind === "property_value")
        );
      case "observation":
      case "ontology_gap_observation":
        return snapshot.facts.some((fact) => fact.factKind === "observation");
      default:
        return expectation.expectedLane satisfies never;
    }
  })();
  if (!laneMatches) failures.push("predicate-lane");
  if (
    expectation.expectedGroundFactKinds.some(
      (expectedKind) =>
        !snapshot.facts.some((fact) => fact.factKind === expectedKind),
    )
  ) {
    failures.push("logical-fact-lanes");
  }
  const manifestClaims = new Set(snapshot.logicClaims);
  if (manifestClaims.size !== expectation.expectedLogicClaimCount) {
    failures.push("logic-claim-manifest");
  }
  const groundClaims = new Set(
    snapshot.facts.flatMap((fact) =>
      (fact.factKind === "predicate" || fact.factKind === "property_value") &&
      fact.claimKey !== undefined &&
      fact.claimText !== undefined
        ? [fact.claimKey]
        : [],
    ),
  );
  if (
    expectation.expectedLogicClaimCount > 0 &&
    (groundClaims.size !== expectation.expectedLogicClaimCount ||
      [...manifestClaims].some((claimKey) => !groundClaims.has(claimKey)) ||
      [...groundClaims].some((claimKey) => !manifestClaims.has(claimKey)))
  ) {
    failures.push("logic-claim-grounding");
  }
  if (expectation.expectedPredicateName !== null) {
    const fact = snapshot.facts.find(
      (entry) =>
        entry.factKind === "predicate" &&
        entry.predicateName === expectation.expectedPredicateName,
    );
    if (fact === undefined) {
      failures.push("predicate-name");
    } else {
      if (
        expectation.expectedPredicateArgs !== null &&
        JSON.stringify(fact.predicateArgs) !==
          JSON.stringify(expectation.expectedPredicateArgs)
      ) {
        failures.push("predicate-args");
      }
      if (fact.polarity !== expectation.expectedPolarity) {
        failures.push("predicate-polarity");
      }
    }
  }
  for (const edge of expectation.expectedEdges) {
    if (
      !snapshot.relationships.some(
        (observed) =>
          observed.relationship === edge.relationship &&
          observed.target === edge.target,
      )
    ) {
      failures.push("predicate-edges");
      break;
    }
  }
  return failures;
}

function predicateSnapshot(
  manifest: Manifest,
  evidence: CellEvidence,
): PredicateCaseSnapshot | null {
  if (manifest.predicateExpectation === null) return null;
  if (evidence.finalState.snapshot === undefined) {
    throw new EvidenceBindingError("malformed-snapshot");
  }
  const binding = {
    caseId: manifest.taskId,
    roots: {
      publicManifestHash: manifest.publicManifestHash,
      workspaceHash: manifest.workspaceHash,
      fixtureSeedHash: manifest.fixtureSeedHash,
    },
    sequence: 1,
  } as const;
  if (typeof evidence.finalState.snapshot === "string") {
    return decodeFinalStatePredicateSnapshot(
      evidence.finalState.snapshot,
      binding,
    );
  }
  return decodePredicateCaseSnapshot(evidence.finalState.snapshot, binding);
}

function predicateEvidenceFor(
  manifest: Manifest,
  failures: readonly PredicateCaseFailure[],
): PredicateCaseEvidence {
  const failure = failures[0];
  return failure === undefined
    ? { outcome: "pass", caseId: manifest.taskId }
    : { outcome: "fail", caseId: manifest.taskId, failure };
}

export function evaluatePredicateCase(
  manifest: Manifest,
  evidence: CellEvidence,
): PredicateCaseEvaluation {
  const snapshot = predicateSnapshot(manifest, evidence);
  if (snapshot === null) return { failureCodes: [] };
  const failureCodes = predicateFailures(manifest, snapshot);
  return {
    predicateEvidence: predicateEvidenceFor(manifest, failureCodes),
    failureCodes,
  };
}

export function predicateBindingFailure(
  manifest: Manifest,
  error: EvidenceBindingError,
): PredicateCaseEvidence | undefined {
  if (manifest.predicateExpectation === null) return undefined;
  switch (error.reason) {
    case "roots":
      return {
        outcome: "fail",
        caseId: manifest.taskId,
        failure: "wrong-graph",
      };
    case "case-id":
    case "sequence":
      return {
        outcome: "fail",
        caseId: manifest.taskId,
        failure: "replayed-evidence",
      };
    case "snapshot-hash":
      return {
        outcome: "fail",
        caseId: manifest.taskId,
        failure: "mixed-snapshot",
      };
    case "malformed-snapshot":
      return {
        outcome: "fail",
        caseId: manifest.taskId,
        failure: "malformed-snapshot",
      };
    default:
      return error.reason satisfies never;
  }
}
