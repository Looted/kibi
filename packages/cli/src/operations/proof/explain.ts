/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 */

import { InputError, OperationError } from "../../cli-errors.js";
import {
  runOperationJsonQuery,
  toPrologAtom,
} from "../../public/operations/prolog-json.js";
import type {
  OperationContext,
  PrologPort,
} from "../../public/operations/runtime-types.js";
import {
  currentProofBindingMode,
  perContractTestBindings,
} from "../../public/operations/specs/reporting.js";
import { readWorkspaceSnapshot } from "../../public/operations/workspace-snapshot.js";
import { PROOF_RECEIPT_MAX_AGE_SECONDS } from "../../public/proof-receipt.js";

export type ProofExplainKind = "requirement" | "symbol";

export type ProofResolutionRef = {
  readonly id?: string;
  readonly sourceFile?: string;
  readonly path?: string;
  readonly role?: string;
  readonly exists?: boolean;
};

export type ProofCoverageCandidate = {
  readonly testId: string;
  readonly relationship: string;
  readonly qualifies: boolean;
  readonly reason: string;
  readonly reasonText?: string;
  readonly secondaryReasons: readonly string[];
  readonly scope?: string;
  readonly receiptState?: string;
};

export type ProofExplainTestBlock = {
  readonly testId: string;
  readonly requiredProofs: readonly ProofResolutionRef[];
  readonly executableFor: readonly ProofResolutionRef[];
};

export type ProofExplainSymbolBlock = {
  readonly symbolId: string;
  readonly classification: string;
  readonly status: string;
  readonly reason: string;
  readonly reasonText?: string;
  readonly coverageCandidates: readonly ProofCoverageCandidate[];
};

// implements REQ-kibi-claim-bound-proofs
export type ClaimSummary = Readonly<{
  applicable: number;
  proved: number;
  attested: number;
  tested: number;
  unresolved: number;
}>;

// implements REQ-kibi-claim-bound-proofs
export type ClaimExplainEntry = Readonly<{
  claimKey: string;
  status: string;
  applicable: boolean;
  level: string | null;
  blocker?: string;
  /** Why a claim with a derived binding is still not proved. */
  notProved?: string;
  bindings: readonly Readonly<{
    test: string;
    kind: string;
    binding: string;
    scope: string;
    reason?: string;
  }>[];
}>;

// implements REQ-kibi-claim-bound-proofs
export type ClaimRefutation = Readonly<{
  test: string;
  claimKey: string;
  reason: string;
}>;

export type RequirementProofExplainView = {
  readonly kind: "requirement";
  readonly id: string;
  readonly proofVersion: string;
  readonly proofStatus: string;
  readonly proofGaps: readonly string[];
  readonly evidenceLevel?: string;
  /** Tests whose receipt claimed proved but whose certificate no longer re-checks. */
  readonly certificateRejections?: readonly { test: string; reason: string }[];
  /** Claims a proof refuted: the test and what it read that breaks the claim. */
  readonly refutations?: readonly ClaimRefutation[];
  /** Proof-bearing symbols without source coordinates. */
  readonly missingCoordinateSymbols?: readonly string[];
  /** How many applicable claims reach each level, and which are not proved. */
  readonly claimSummary?: ClaimSummary;
  readonly unprovedClaims?: readonly string[];
  /** One entry per inventory claim, with the certificate bindings behind it. */
  readonly claims?: readonly ClaimExplainEntry[];
  readonly scenarios: readonly { id: string; tests: readonly string[] }[];
  /** Whether a scenario exercises the requirement's failure side. */
  readonly negativePath?: NegativePathExplain;
  /** Quantified claims grounded only on booleans or ground predicates. */
  readonly dimension?: DimensionExplain;
  /** Edge cases derived from the typed claims and the scenarios covering them. */
  readonly cases?: CasesExplain;
  readonly tests: readonly ProofExplainTestBlock[];
  readonly productionSymbols: readonly ProofExplainSymbolBlock[];
  readonly structuralSymbols: readonly ProofExplainSymbolBlock[];
};

export type NegativePathExplain = {
  readonly status: string;
  readonly negativeScenarios: readonly string[];
  readonly claims: readonly string[];
  readonly suggestedNegatives: readonly {
    readonly claimKey: string;
    readonly factId: string;
    readonly assumption: Readonly<Record<string, unknown>>;
  }[];
  /** An approved waiver carries approvedBy; a reason alone awaits approval. */
  readonly waiver?: { readonly reason: string; readonly approvedBy?: string };
};

export type DimensionClaimExplain = {
  readonly claimKey: string;
  readonly claimText: string;
  readonly quantifier: string;
  readonly factIds: readonly string[];
  /** Typed groundings that would represent the quantifier, likeliest first. */
  readonly rewrites: readonly string[];
  /** An approved waiver carries approvedBy; a reason alone awaits approval. */
  readonly waiver?: { readonly reason: string; readonly approvedBy?: string };
};

export type DimensionExplain = {
  readonly status: string;
  readonly claims: readonly DimensionClaimExplain[];
  readonly waivedClaims: readonly DimensionClaimExplain[];
};

export type CaseExplain = {
  readonly caseId: string;
  readonly claimKey: string;
  readonly factId: string;
  readonly generator: string;
  readonly constraint: string;
  /** success, rejection or unspecified */
  readonly predicted: string;
  /** covered, uncovered, unspecified or waived */
  readonly coverage: string;
  readonly scenarios: readonly string[];
  /** The assumes fact a scenario would state to land in the case. */
  readonly assumption: Readonly<Record<string, unknown>>;
  readonly waiver?: { readonly reason: string; readonly approvedBy?: string };
};

export type CasesExplain = {
  readonly status: string;
  readonly cases: readonly CaseExplain[];
  readonly summary: Readonly<Record<string, number>>;
  readonly limitReached: boolean;
};

export type SymbolProofExplainView = {
  readonly kind: "symbol";
  readonly id: string;
  readonly role: string;
  readonly executableTest: boolean;
  readonly implementingRequirements: readonly string[];
  readonly executableFor: readonly string[];
  readonly coveredBy: readonly string[];
  readonly proofs: readonly RequirementProofExplainView[];
};

export type ProofExplainView =
  | RequirementProofExplainView
  | SymbolProofExplainView;

function requireProlog(context: OperationContext): PrologPort {
  if (context.prolog === undefined) {
    throw new OperationError(
      "PROLOG_UNAVAILABLE",
      "Proof explain requires a Prolog runtime",
    );
  }
  return context.prolog;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter((item) => item !== "");
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asRef(value: unknown): ProofResolutionRef {
  const row = asRecord(value);
  return {
    ...(typeof row.id === "string" ? { id: row.id } : {}),
    ...(typeof row.sourceFile === "string"
      ? { sourceFile: row.sourceFile }
      : {}),
    ...(typeof row.path === "string" ? { path: row.path } : {}),
    ...(typeof row.role === "string" ? { role: row.role } : {}),
    ...(row.exists === true || row.exists === false
      ? { exists: row.exists }
      : {}),
  };
}

function asCandidate(value: unknown): ProofCoverageCandidate {
  const row = asRecord(value);
  return {
    testId: asString(row.testId),
    relationship: asString(row.relationship, "covered_by"),
    qualifies: asBoolean(row.qualifies),
    reason: asString(row.reason),
    ...(typeof row.reasonText === "string"
      ? { reasonText: row.reasonText }
      : {}),
    secondaryReasons: asStringArray(row.secondaryReasons),
    ...(typeof row.scope === "string" ? { scope: row.scope } : {}),
    ...(typeof row.receiptState === "string"
      ? { receiptState: row.receiptState }
      : {}),
  };
}

function asSymbolBlock(value: unknown): ProofExplainSymbolBlock {
  const row = asRecord(value);
  return {
    symbolId: asString(row.symbolId),
    classification: asString(row.classification, "unknown"),
    status: asString(row.status),
    reason: asString(row.reason),
    ...(typeof row.reasonText === "string"
      ? { reasonText: row.reasonText }
      : {}),
    coverageCandidates: Array.isArray(row.coverageCandidates)
      ? row.coverageCandidates.map(asCandidate)
      : [],
  };
}

// implements REQ-kibi-verification-evidence-contract
export function projectRequirementExplain(
  proof: Record<string, unknown>,
): RequirementProofExplainView {
  const stages = asRecord(proof.proofStages);
  const scenarioStage = asRecord(stages.scenarios);
  const scenarioTestStage = asRecord(stages.scenarioTests);
  const production = asRecord(stages.productionSymbols);
  const obligations = Array.isArray(scenarioTestStage.obligations)
    ? scenarioTestStage.obligations.map(asRecord)
    : [];
  const resolutions = Array.isArray(
    proof.testResolutions ?? scenarioTestStage.resolutions,
  )
    ? ((proof.testResolutions ?? scenarioTestStage.resolutions) as unknown[])
    : [];
  const resolutionByTest = new Map<string, ProofExplainTestBlock>();
  for (const item of resolutions) {
    const row = asRecord(item);
    const testId = asString(row.testId);
    if (testId === "") continue;
    resolutionByTest.set(testId, {
      testId,
      requiredProofs: Array.isArray(row.requiredProofs)
        ? row.requiredProofs.map(asRef)
        : [],
      executableFor: Array.isArray(row.executableFor)
        ? row.executableFor.map(asRef)
        : [],
    });
  }
  const tests = asStringArray(scenarioTestStage.tests).map((testId) => {
    return (
      resolutionByTest.get(testId) ?? {
        testId,
        requiredProofs: [],
        executableFor: [],
      }
    );
  });
  const scenarios = (
    Array.isArray(scenarioStage.scenarios)
      ? scenarioStage.scenarios
      : asStringArray(scenarioStage.scenarios)
  ).map((scenarioId) => {
    const id = asString(scenarioId);
    const obligation = obligations.find(
      (item) => asString(item.scenarioId) === id,
    );
    return {
      id,
      tests: asStringArray(obligation?.tests),
    };
  });
  const explanations = Array.isArray(production.explanations)
    ? production.explanations.map(asSymbolBlock)
    : [];
  const structuralIds = new Set(asStringArray(production.structuralSymbols));
  return {
    kind: "requirement",
    id: asString(proof.id),
    proofVersion: asString(proof.proofVersion),
    proofStatus: asString(proof.proofStatus),
    proofGaps: asStringArray(proof.proofGaps),
    ...(typeof proof.evidenceLevel === "string"
      ? { evidenceLevel: proof.evidenceLevel }
      : {}),
    ...(Array.isArray(proof.certificateRejections)
      ? {
          certificateRejections: proof.certificateRejections.map((row) => {
            const entry = asRecord(row);
            return {
              test: asString(entry.test),
              reason: asString(entry.reason),
            };
          }),
        }
      : {}),
    ...refutationFields(proof, stages),
    ...claimFields(proof),
    scenarios,
    ...negativePathField(stages.negativePath),
    ...dimensionField(stages.dimension),
    ...casesField(stages.cases),
    tests,
    productionSymbols: explanations.filter(
      (item) => !structuralIds.has(item.symbolId),
    ),
    structuralSymbols: explanations.filter((item) =>
      structuralIds.has(item.symbolId),
    ),
  };
}

// implements REQ-kibi-happy-path-gap
function negativePathField(stage: unknown): { negativePath?: NegativePathExplain } {
  if (stage === undefined) return {};
  const record = asRecord(stage);
  const suggestions = Array.isArray(record.suggestedNegatives)
    ? record.suggestedNegatives.map((item) => {
        const entry = asRecord(item);
        return {
          claimKey: asString(entry.claimKey),
          factId: asString(entry.factId),
          assumption: asRecord(entry.assumption),
        };
      })
    : [];
  return {
    negativePath: {
      status: asString(record.status),
      negativeScenarios: asStringArray(record.negativeScenarios),
      claims: asStringArray(record.claims),
      suggestedNegatives: suggestions,
      ...waiverField(record.waiver),
    },
  };
}

function waiverField(raw: unknown): {
  waiver?: { reason: string; approvedBy?: string };
} {
  const waiver = asRecord(raw);
  const reason = asString(waiver.reason);
  const approvedBy = asString(waiver.approvedBy);
  return reason === ""
    ? {}
    : { waiver: { reason, ...(approvedBy === "" ? {} : { approvedBy }) } };
}

// implements REQ-kibi-dimension-gap
function dimensionField(stage: unknown): { dimension?: DimensionExplain } {
  if (stage === undefined) return {};
  const record = asRecord(stage);
  const claims = (raw: unknown): DimensionClaimExplain[] =>
    Array.isArray(raw)
      ? raw.map((item) => {
          const entry = asRecord(item);
          return {
            claimKey: asString(entry.claimKey),
            claimText: asString(entry.claimText),
            quantifier: asString(entry.quantifier),
            factIds: asStringArray(entry.factIds),
            rewrites: asStringArray(entry.rewrites),
            ...waiverField(entry.waiver),
          };
        })
      : [];
  return {
    dimension: {
      status: asString(record.status),
      claims: claims(record.claims),
      waivedClaims: claims(record.waivedClaims),
    },
  };
}

// implements REQ-kibi-case-coverage
function casesField(stage: unknown): { cases?: CasesExplain } {
  if (stage === undefined) return {};
  const record = asRecord(stage);
  const cases = Array.isArray(record.cases)
    ? record.cases.map((item): CaseExplain => {
        const entry = asRecord(item);
        return {
          caseId: asString(entry.caseId),
          claimKey: asString(entry.claimKey),
          factId: asString(entry.factId),
          generator: asString(entry.generator),
          constraint: asString(entry.constraint),
          predicted: asString(entry.predicted),
          coverage: asString(entry.coverage),
          scenarios: asStringArray(entry.scenarios),
          assumption: asRecord(entry.assumption),
          ...waiverField(entry.waiver),
        };
      })
    : [];
  const summary = asRecord(record.summary);
  return {
    cases: {
      status: asString(record.status),
      cases,
      summary: Object.fromEntries(
        Object.entries(summary).filter(
          (entry): entry is [string, number] => typeof entry[1] === "number",
        ),
      ),
      limitReached: record.limitReached === true,
    },
  };
}

function renderCases(view: RequirementProofExplainView): string[] {
  const cases = view.cases;
  if (cases === undefined || cases.cases.length === 0) return [];
  const summary = cases.summary;
  const lines = [
    "",
    `Edge cases: ${cases.status} (${summary.covered ?? 0} covered, ${summary.uncovered ?? 0} uncovered, ${summary.unspecified ?? 0} unspecified, ${summary.waived ?? 0} waived)`,
  ];
  for (const row of cases.cases) {
    const where =
      row.coverage === "covered" ? ` by ${row.scenarios.join(", ")}` : "";
    lines.push(
      `  ${row.caseId} ${row.factId} ${row.constraint} -> ${row.predicted}: ${row.coverage}${where}`,
    );
    if (row.coverage === "uncovered" && row.predicted === "rejection")
      lines.push(
        `    add a scenario that assumes ${JSON.stringify(row.assumption)} and expects rejection`,
      );
    if (row.waiver !== undefined && row.waiver.approvedBy === undefined)
      lines.push(
        `    waiver awaiting approval (set case_waiver_approved_by to the person who accepts it, in this pull request): ${row.waiver.reason}`,
      );
  }
  if (cases.limitReached)
    lines.push("  (some facts have more cases than the per-fact limit of 12)");
  return lines;
}

const DIMENSION_REWRITES: Readonly<Record<string, string>> = {
  bound: "an integer property with the bound (lte, gte or eq)",
  rule: "a rule over a variable (every X with P must Q)",
  count: "an integer count of what varies",
  set: "a set fact over the members",
};

function renderDimension(view: RequirementProofExplainView): string[] {
  const dimension = view.dimension;
  if (dimension === undefined || dimension.status === "not_required") return [];
  const lines = ["", `Quantified claims: ${dimension.status}`];
  for (const claim of dimension.claims) {
    lines.push(
      `  ${claim.claimKey} (${claim.factIds.join(", ")}): "${claim.quantifier.replaceAll("_", " ")}" is grounded on a boolean: ${claim.claimText}`,
    );
    const rewrites = claim.rewrites
      .map((rewrite) => DIMENSION_REWRITES[rewrite] ?? rewrite)
      .join("; or ");
    if (rewrites !== "") lines.push(`    ground it on ${rewrites}`);
    if (claim.waiver !== undefined)
      lines.push(
        `    waiver awaiting approval (set dimension_waiver_approved_by to the person who accepts it, in this pull request): ${claim.waiver.reason}`,
      );
  }
  for (const claim of dimension.waivedClaims) {
    lines.push(
      `  ${claim.claimKey} waived by ${claim.waiver?.approvedBy ?? ""}: ${claim.waiver?.reason ?? ""}`,
    );
  }
  return lines;
}

function renderNegativePath(view: RequirementProofExplainView): string[] {
  const negative = view.negativePath;
  if (negative === undefined || negative.status === "not_required") return [];
  const lines = ["", `Failure side: ${negative.status}`];
  if (negative.waiver !== undefined) {
    lines.push(
      negative.waiver.approvedBy === undefined
        ? `  waiver awaiting approval (set failure_side_waiver_approved_by to the person who accepts it, in this pull request): ${negative.waiver.reason}`
        : `  waived by ${negative.waiver.approvedBy}: ${negative.waiver.reason}`,
    );
  }
  for (const scenarioId of negative.negativeScenarios) {
    lines.push(`  ${scenarioId} expects rejection or error`);
  }
  for (const suggestion of negative.suggestedNegatives) {
    lines.push(
      `  ${suggestion.claimKey} (${suggestion.factId}): assume ${JSON.stringify(suggestion.assumption)} and expect rejection`,
    );
  }
  return lines;
}

// implements REQ-kibi-claim-bound-proofs
function refutationFields(
  proof: Record<string, unknown>,
  stages: Record<string, unknown>,
): {
  refutations?: ClaimRefutation[];
  missingCoordinateSymbols?: string[];
} {
  const refutations = Array.isArray(proof.claimBindingRejections)
    ? proof.claimBindingRejections.map((row) => {
        const entry = asRecord(row);
        return {
          test: asString(entry.test),
          claimKey: asString(entry.claimKey),
          reason: asString(entry.reason),
        };
      })
    : [];
  const missing = asStringArray(
    asRecord(stages.sourceCoordinates).missingSymbols,
  );
  return {
    ...(refutations.length > 0 ? { refutations } : {}),
    ...(missing.length > 0 ? { missingCoordinateSymbols: missing } : {}),
  };
}

/** Why each gap keeps a requirement from being tested end to end. */
const GAP_REASONS: Readonly<Record<string, string>> = {
  missing_passing_e2e:
    "no scenario-backed test has a passing end-to-end receipt (a test whose verification_scope is not end_to_end does not count)",
  missing_proof_receipt: "a scenario-backed test has no proof receipt yet",
  stale_proof_receipt: "a proof receipt is older than the current code",
  failed_proof_receipt: "a proof receipt records a failed run",
  invalid_proof_receipt: "a proof receipt cannot be checked",
  proof_contract_mismatch:
    "a proof receipt was recorded for an older proof contract",
  missing_production_symbol: "no production symbol implements the requirement",
  missing_production_symbol_coverage:
    "a production symbol is not covered by a qualifying end-to-end test (a test whose verification_scope is not end_to_end does not qualify)",
  missing_executable_test_symbol:
    "a scenario test has no test code linked executable_for",
  missing_scenario: "the requirement has no scenario",
  missing_scenario_test: "a scenario has no test",
  happy_path_only: "no scenario exercises the failure side",
  uncovered_case: "an edge case of the claim has no scenario",
};

/** One plain clause per gap, naming what it is about where Kibi knows. */
// implements REQ-kibi-claim-bound-proofs
export function gapReason(
  gap: string,
  view: Pick<RequirementProofExplainView, "missingCoordinateSymbols">,
): string {
  if (gap === "missing_symbol_coordinates") {
    const symbols = view.missingCoordinateSymbols ?? [];
    const named =
      symbols.length > 0 ? `${symbols.slice(0, 3).join(", ")} ` : "a symbol ";
    return `${gap}: ${named}${symbols.length > 1 ? "have" : "has"} no source coordinates, so Kibi cannot tie the proof to its code (kibi sync --refresh-symbol-coordinates places ${symbols.length > 1 ? "them" : "it"}; kibi check says why a symbol cannot be placed)`;
  }
  const reason = GAP_REASONS[gap];
  return reason ? `${gap}: ${reason}` : gap;
}

function claimFields(proof: Record<string, unknown>): {
  claimSummary?: ClaimSummary;
  unprovedClaims?: string[];
  claims?: ClaimExplainEntry[];
} {
  const summary = asRecord(proof.claimSummary);
  const count = (key: string) =>
    typeof summary[key] === "number" ? (summary[key] as number) : 0;
  return {
    ...(proof.claimSummary !== undefined
      ? {
          claimSummary: {
            applicable: count("applicable"),
            proved: count("proved"),
            attested: count("attested"),
            tested: count("tested"),
            unresolved: count("unresolved"),
          },
        }
      : {}),
    ...(Array.isArray(proof.unprovedClaims)
      ? { unprovedClaims: asStringArray(proof.unprovedClaims) }
      : {}),
    ...(Array.isArray(proof.claimEvidence)
      ? {
          claims: proof.claimEvidence.map((item) => {
            const entry = asRecord(item);
            return {
              claimKey: asString(entry.claimKey),
              status: asString(entry.status),
              applicable: asBoolean(entry.applicable),
              level: typeof entry.level === "string" ? entry.level : null,
              ...(typeof entry.blocker === "string"
                ? { blocker: entry.blocker }
                : {}),
              ...(typeof entry.notProved === "string"
                ? { notProved: entry.notProved }
                : {}),
              bindings: (Array.isArray(entry.bindings)
                ? entry.bindings
                : []
              ).map((raw) => {
                const binding = asRecord(raw);
                return {
                  test: asString(binding.test),
                  kind: asString(binding.kind),
                  binding: asString(binding.binding),
                  scope: asString(binding.scope),
                  ...(typeof binding.reason === "string"
                    ? { reason: binding.reason }
                    : {}),
                };
              }),
            };
          }),
        }
      : {}),
  };
}

/** Gaps a refuted claim leaves that a derived proof would have covered. */
const CERTIFIED_GAPS = new Set(["happy_path_only", "uncovered_case"]);

// implements REQ-kibi-claim-bound-proofs
function renderRefutations(view: RequirementProofExplainView): string[] {
  const refutations = view.refutations ?? [];
  if (refutations.length === 0) return [];
  const lines = refutations.map(
    (row) =>
      `refuted: ${row.test} refutes ${row.claimKey}: ${row.reason}. The code breaks the claim, so it is not proved; fix the code (or, with the person who owns the rule, the requirement) and run kibi prove`,
  );
  const covered = view.proofGaps.filter((gap) => CERTIFIED_GAPS.has(gap));
  if (covered.length > 0)
    lines.push(
      `  ${covered.join(" and ")} ${covered.length > 1 ? "follow" : "follows"} from the refutation: a proof that derives the claim covers its failure side and edge cases, a refuted one covers none`,
    );
  return lines;
}

function renderClaims(view: RequirementProofExplainView): string[] {
  if (view.claims === undefined) return [];
  const summary = view.claimSummary;
  const lines = [
    "",
    summary === undefined
      ? "Claims"
      : `Claims (${summary.proved}/${summary.applicable} proved, ${summary.attested} attested, ${summary.tested} tested, ${summary.unresolved} unresolved)`,
  ];
  if (view.claims.length === 0) lines.push("  (none)");
  for (const claim of view.claims) {
    lines.push(
      claim.applicable
        ? `  ${claim.claimKey} ${claim.level ?? "unverified"} (${claim.status})${claim.blocker ? ` blocked by ${claim.blocker}` : ""}`
        : `  ${claim.claimKey} not applicable (${claim.status})`,
    );
    for (const binding of claim.bindings)
      lines.push(
        `    ${binding.test} ${binding.kind}: ${binding.binding}${binding.binding === "derived" ? ` (${binding.scope})` : ""}${binding.reason ? `: ${binding.reason}` : ""}`,
      );
    // implements REQ-kibi-claim-bound-proofs
    if (claim.notProved === "requirement_not_tested")
      lines.push(
        `    not proved: the certificate derives the claim, but a claim is proved only once the requirement is tested end to end, and it is not (proofStatus ${view.proofStatus})${view.proofGaps.length > 0 ? `: ${view.proofGaps.map((gap) => gapReason(gap, view)).join("; ")}` : ""}`,
      );
  }
  return lines;
}

// implements REQ-kibi-verification-evidence-contract
export function projectSymbolExplain(
  payload: Record<string, unknown>,
): SymbolProofExplainView {
  const proofs = Array.isArray(payload.proofs)
    ? payload.proofs.map((item) => projectRequirementExplain(asRecord(item)))
    : [];
  return {
    kind: "symbol",
    id: asString(payload.symbolId ?? payload.id),
    role: asString(payload.role, "unknown"),
    executableTest: asBoolean(payload.executableTest),
    implementingRequirements: asStringArray(payload.implementingRequirements),
    executableFor: asStringArray(payload.executableFor),
    coveredBy: asStringArray(payload.coveredBy),
    proofs,
  };
}

// implements REQ-kibi-verification-evidence-contract
export function renderProofExplain(view: ProofExplainView): string {
  if (view.kind === "symbol") return renderSymbolExplain(view);
  return renderRequirementExplain(view);
}

function renderRequirementExplain(view: RequirementProofExplainView): string {
  const lines = [
    `Proof explain for ${view.id}`,
    `proofVersion: ${view.proofVersion}`,
    `proofStatus: ${view.proofStatus}`,
    `proofGaps: ${view.proofGaps.join(", ") || "(none)"}`,
    ...(view.evidenceLevel === undefined
      ? []
      : [`evidenceLevel: ${view.evidenceLevel}`]),
    ...(view.certificateRejections ?? []).map(
      (row) => `certificate rejected for ${row.test}: ${row.reason}`,
    ),
    ...renderRefutations(view),
    ...renderClaims(view),
    "",
    "Scenarios",
  ];
  if (view.scenarios.length === 0) lines.push("  (none)");
  for (const scenario of view.scenarios) {
    lines.push(
      `  ${scenario.id} -> ${scenario.tests.join(", ") || "(no tests)"}`,
    );
  }
  lines.push(...renderNegativePath(view));
  lines.push(...renderDimension(view));
  lines.push(...renderCases(view));
  lines.push("");
  for (const test of view.tests) {
    lines.push(`TEST ${test.testId}`);
    lines.push("  required_proofs");
    if (test.requiredProofs.length === 0) lines.push("    (none)");
    for (const ref of test.requiredProofs) {
      lines.push(`    ${formatRef(ref)}`);
    }
    lines.push("  executable_for");
    if (test.executableFor.length === 0) lines.push("    (none)");
    for (const ref of test.executableFor) {
      lines.push(`    ${formatRef(ref)}`);
    }
    lines.push("");
  }
  lines.push("Production symbols");
  if (view.productionSymbols.length === 0) lines.push("  (none)");
  for (const symbol of view.productionSymbols) {
    lines.push(renderSymbolCoverage(symbol));
  }
  if (view.structuralSymbols.length > 0) {
    lines.push("");
    lines.push("Structural symbols");
    for (const symbol of view.structuralSymbols) {
      lines.push(renderSymbolCoverage(symbol));
    }
  }
  return `${lines.join("\n")}\n`;
}

function renderSymbolExplain(view: SymbolProofExplainView): string {
  const lines = [
    `Proof explain for ${view.id}`,
    `role: ${view.role}`,
    `executable_test: ${view.executableTest ? "true" : "false"}`,
    `implementing requirements: ${view.implementingRequirements.join(", ") || "(none)"}`,
    "executable_for",
    ...(view.executableFor.length === 0
      ? ["  (none)"]
      : view.executableFor.map((id) => `  ${id}`)),
    "covered_by",
    ...(view.coveredBy.length === 0
      ? ["  (none)"]
      : view.coveredBy.map((id) => `  ${id}`)),
  ];
  for (const proof of view.proofs) {
    lines.push("");
    lines.push(`Requirement ${proof.id} (${proof.proofStatus})`);
    lines.push(renderRequirementExplain(proof).trimEnd());
  }
  return `${lines.join("\n")}\n`;
}

function renderSymbolCoverage(symbol: ProofExplainSymbolBlock): string {
  const lines = [
    `  ${symbol.symbolId} [${symbol.classification}] ${symbol.status} ${symbol.reason}`,
    "    covered_by",
  ];
  if (symbol.coverageCandidates.length === 0) lines.push("      (none)");
  for (const candidate of symbol.coverageCandidates) {
    const secondaries =
      candidate.secondaryReasons.length > 0
        ? ` secondary=${candidate.secondaryReasons.join(",")}`
        : "";
    lines.push(
      `      ${candidate.testId} qualifies=${candidate.qualifies} reason=${candidate.reason}${secondaries}`,
    );
  }
  return lines.join("\n");
}

function formatRef(ref: ProofResolutionRef): string {
  const id = ref.id ?? "(unresolved)";
  const path = ref.path ?? ref.sourceFile ?? "";
  const role = ref.role ? ` role=${ref.role}` : "";
  return path === "" ? `${id}${role}` : `${id} ${path}${role}`;
}

// implements REQ-kibi-verification-evidence-contract
export function classifyExplainTarget(
  id: string | undefined,
  options: { requirement?: string; symbol?: string },
): { kind: ProofExplainKind; id: string } {
  if (options.requirement && options.symbol) {
    throw new InputError(
      "INVALID_TARGET",
      "proof explain: choose either --requirement or --symbol, not both",
    );
  }
  if (options.requirement)
    return { kind: "requirement", id: options.requirement };
  if (options.symbol) return { kind: "symbol", id: options.symbol };
  if (id?.startsWith("REQ-")) return { kind: "requirement", id };
  if (id?.startsWith("SYM-")) return { kind: "symbol", id };
  throw new InputError(
    "INVALID_TARGET",
    id === undefined
      ? "proof explain: pass a requirement or symbol id, for example kibi proof explain REQ-login (or --requirement <id> / --symbol <id>)"
      : `proof explain: ${id} is not a REQ-* or SYM-* id; pass --requirement <id> or --symbol <id> to explain an entity with another id`,
  );
}

async function proofQueryContext(context: OperationContext): Promise<{
  snapshot: string;
  checkedAt: string;
  bindingsGoal: string;
}> {
  const snapshotEvidence = await readWorkspaceSnapshot(context);
  const snapshot = snapshotEvidence.available
    ? snapshotEvidence.snapshot.hash
    : "unknown";
  const checkedAt = context.clock().toISOString();
  const bindingsDict = await perContractTestBindings(context);
  const bindingMode =
    bindingsDict !== null ? "per_contract" : currentProofBindingMode();
  const bindings = bindingsDict ?? "_{}";
  return {
    snapshot,
    checkedAt,
    bindingsGoal: `${bindingMode}, ${bindings}, ${toPrologAtom(snapshot)}, ${toPrologAtom(checkedAt)}, ${PROOF_RECEIPT_MAX_AGE_SECONDS}`,
  };
}

const TARGET_TYPE: Readonly<Record<ProofExplainKind, string>> = {
  requirement: "req",
  symbol: "symbol",
};

// implements REQ-kibi-verification-evidence-contract
/**
 * Refuse an id the branch KB does not hold as the asked-for type before the
 * proof query runs, which would otherwise fail with a bare "Query failed".
 */
export async function requireExplainTarget(
  prolog: PrologPort,
  target: { kind: ProofExplainKind; id: string },
): Promise<void> {
  const id = toPrologAtom(target.id);
  const type = TARGET_TYPE[target.kind];
  const asked = await prolog.query(`once(kb_entity(${id}, ${type}, _))`);
  if (asked.success) return;
  const other = await prolog.query(`once(kb_entity(${id}, _, _))`);
  if (other.success) {
    throw new InputError(
      "INVALID_TARGET",
      `proof explain: ${target.id} is not a ${type}; proof explain covers requirements (req) and symbols`,
    );
  }
  throw new OperationError(
    "ENTITY_NOT_FOUND",
    `proof explain: no ${TARGET_TYPE[target.kind]} ${target.id} in the KB for this branch. Check the id with kibi query ${TARGET_TYPE[target.kind]}; if its file was just written or pulled, run kibi sync first.`,
    false,
  );
}

// implements REQ-kibi-verification-evidence-contract
export async function executeProofExplain(
  target: { kind: ProofExplainKind; id: string },
  context: OperationContext,
): Promise<{ view: ProofExplainView; payload: Record<string, unknown> }> {
  const query = await proofQueryContext(context);
  await requireExplainTarget(requireProlog(context), target);
  if (target.kind === "requirement") {
    const payload = await runOperationJsonQuery<Record<string, unknown>>(
      requireProlog(context),
      "discovery.pl",
      `discovery:requirement_proof_json(${toPrologAtom(target.id)}, ${query.bindingsGoal}, JsonString)`,
      "Proof explain",
    );
    const withId = { id: target.id, ...payload };
    return { view: projectRequirementExplain(withId), payload: withId };
  }
  const payload = await runOperationJsonQuery<Record<string, unknown>>(
    requireProlog(context),
    "discovery.pl",
    `discovery:symbol_proof_json(${toPrologAtom(target.id)}, ${query.bindingsGoal}, JsonString)`,
    "Proof explain",
  );
  return { view: projectSymbolExplain(payload), payload };
}
