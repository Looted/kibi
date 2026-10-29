/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 */

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
  bindings: readonly Readonly<{
    test: string;
    kind: string;
    binding: string;
    scope: string;
    reason?: string;
  }>[];
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
  /** How many applicable claims reach each level, and which are not proved. */
  readonly claimSummary?: ClaimSummary;
  readonly unprovedClaims?: readonly string[];
  /** One entry per inventory claim, with the certificate bindings behind it. */
  readonly claims?: readonly ClaimExplainEntry[];
  readonly scenarios: readonly { id: string; tests: readonly string[] }[];
  /** Whether a scenario exercises the requirement's failure side. */
  readonly negativePath?: NegativePathExplain;
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
    throw new Error("Proof explain requires a Prolog runtime");
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
    ...claimFields(proof),
    scenarios,
    ...negativePathField(stages.negativePath),
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
  const waiver = asRecord(record.waiver);
  const reason = asString(waiver.reason);
  const approvedBy = asString(waiver.approvedBy);
  return {
    negativePath: {
      status: asString(record.status),
      negativeScenarios: asStringArray(record.negativeScenarios),
      claims: asStringArray(record.claims),
      suggestedNegatives: suggestions,
      ...(reason === ""
        ? {}
        : { waiver: { reason, ...(approvedBy === "" ? {} : { approvedBy }) } }),
    },
  };
}

function renderNegativePath(view: RequirementProofExplainView): string[] {
  const negative = view.negativePath;
  if (negative === undefined || negative.status === "not_required") return [];
  const lines = ["", `Failure side: ${negative.status}`];
  if (negative.waiver !== undefined) {
    lines.push(
      negative.waiver.approvedBy === undefined
        ? `  waiver awaiting approval (set failure_side_waiver_approved_by): ${negative.waiver.reason}`
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
    throw new Error(
      "proof explain: choose either --requirement or --symbol, not both",
    );
  }
  if (options.requirement)
    return { kind: "requirement", id: options.requirement };
  if (options.symbol) return { kind: "symbol", id: options.symbol };
  if (id?.startsWith("REQ-")) return { kind: "requirement", id };
  if (id?.startsWith("SYM-")) return { kind: "symbol", id };
  throw new Error(
    "proof explain: pass REQ-* or SYM-* (or --requirement / --symbol)",
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

// implements REQ-kibi-verification-evidence-contract
export async function executeProofExplain(
  target: { kind: ProofExplainKind; id: string },
  context: OperationContext,
): Promise<{ view: ProofExplainView; payload: Record<string, unknown> }> {
  const query = await proofQueryContext(context);
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
