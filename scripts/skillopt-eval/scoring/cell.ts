import { EvidenceBindingError } from "../contracts/evidence";
import type { parsePrivateEvaluatorManifest } from "../fixtures/private";
import { evidenceConflictKeys } from "./evidence-utils";
import type { EvidenceSource } from "./evidence-utils";
import {
  evaluatePredicateCase,
  predicateBindingFailure,
} from "./predicate-evidence";
import type { PredicateCaseEvidence } from "./predicate-evidence";

export { redactEvidence } from "./evidence-utils";
export type { EvidenceClaim } from "./evidence-utils";
export type {
  PredicateCaseEvidence,
  PredicateCaseFailure,
} from "./predicate-evidence";

type Manifest = ReturnType<typeof parsePrivateEvaluatorManifest>;

export type BrokerRawCall = Readonly<{
  tool: string;
  args: Record<string, unknown>;
  resultOk: boolean;
}>;

export type CellEvidence = Readonly<{
  finalState: EvidenceSource;
  broker: EvidenceSource & {
    readonly orderedCalls: readonly Readonly<{
      tool: string;
      predicate: string;
    }>[];
    readonly rawCalls?: readonly BrokerRawCall[];
  };
  diagnostic: EvidenceSource;
  codex: EvidenceSource;
  isolation: Readonly<{
    observedSentinels: readonly string[];
    violations: readonly string[];
  }>;
}>;

export type TerminalCategory =
  | "behavioral_failure"
  | "critical_security_failure"
  | "pre_action_infrastructure_failure"
  | "incomplete_evidence"
  | "budget_stop"
  | "evidence_conflict";

export type CellReceipt = Readonly<{
  outcome: "pass" | "fail" | "ambiguous";
  terminalCategory: TerminalCategory | null;
  score: number;
  soft: number;
  hard: 0 | 1;
  retryable: boolean;
  adoptionEligible: boolean;
  components: Readonly<{
    finalState: number;
    protocol: number;
    isolation: number;
  }>;
  criticalFailures: readonly string[];
  conflictKeys: readonly string[];
  predicateEvidence?: PredicateCaseEvidence;
}>;

const ZERO_COMPONENTS = {
  finalState: 0,
  protocol: 0,
  isolation: 0,
} as const;

function terminalReceipt(input: {
  readonly outcome: CellReceipt["outcome"];
  readonly terminalCategory: TerminalCategory;
  readonly retryable?: boolean;
  readonly criticalFailures?: readonly string[];
  readonly conflictKeys?: readonly string[];
  readonly predicateEvidence?: PredicateCaseEvidence;
}): CellReceipt {
  return {
    outcome: input.outcome,
    terminalCategory: input.terminalCategory,
    score: 0,
    soft: 0,
    hard: 0,
    retryable: input.retryable ?? false,
    adoptionEligible: false,
    components: ZERO_COMPONENTS,
    criticalFailures: input.criticalFailures ?? [],
    conflictKeys: input.conflictKeys ?? [],
    ...(input.predicateEvidence === undefined
      ? {}
      : { predicateEvidence: input.predicateEvidence }),
  };
}

type ProtocolContract = NonNullable<
  ReturnType<typeof parsePrivateEvaluatorManifest>["protocolContract"]
>;

export function coverageResultFromPriorCalls(
  rawCalls: readonly RawCallView[],
  firstApplyIndex: number,
): Record<string, unknown> | null {
  for (let index = firstApplyIndex - 1; index >= 0; index -= 1) {
    const call = rawCalls[index];
    if (call?.tool === "kb_coverage") return call.result ?? null;
  }
  return null;
}

interface RawCallView {
  readonly tool: string;
  readonly args: Record<string, unknown>;
  readonly resultOk: boolean;
  readonly result?: Record<string, unknown>;
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resultData(
  result: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  if (result === undefined) return null;
  const content = result.structuredContent ?? result.structured_content;
  if (!isRecordLike(content)) {
    return isRecordLike(result.data) ? result.data : null;
  }
  if (content.kibiProtocol === 1 && isRecordLike(content.data)) {
    return content.data;
  }
  return content;
}

function actionRecords(value: unknown): readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecordLike);
}

function deepEquals(left: unknown, right: unknown): boolean {
  try {
    return (
      JSON.stringify(sortKeysDeep(left)) === JSON.stringify(sortKeysDeep(right))
    );
  } catch {
    return false;
  }
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (isRecordLike(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeysDeep(value[key])]),
    );
  }
  return value;
}

/**
 * Typed verification of the exact migration apply contract over sealed broker
 * payloads. Proves, without any prose matching: exactly one apply attempt; a
 * preceding coverage response exposing exactly one ready automatic coordinate
 * action; the applied plan body identical to the previewed one; the approved
 * hash equal to that plan's hash; exactly the selected automatic action ID
 * approved; a successful typed apply result; and zero forbidden attempts.
 */
// implements REQ-skillopt-codex-optimization
export function migrationApplyContractViolations(
  contract: ProtocolContract,
  evidence: CellEvidence,
): readonly string[] {
  const violations: string[] = [];
  const rawCalls: readonly RawCallView[] = evidence.broker.rawCalls ?? [];
  const applyIndexes = rawCalls.flatMap((call, index) =>
    call.tool === "kb_apply_plan" ? [index] : [],
  );
  if (applyIndexes.length === 0) return ["no kb_apply_plan attempt"];
  if (applyIndexes.length > 1) {
    violations.push("kb_apply_plan attempted more than once");
  }
  const firstApplyIndex = applyIndexes[0];
  const apply =
    firstApplyIndex === undefined ? undefined : rawCalls[firstApplyIndex];
  if (apply === undefined) return ["no kb_apply_plan attempt"];

  const coverageResult = coverageResultFromPriorCalls(
    rawCalls,
    firstApplyIndex,
  );
  if (coverageResult === null) {
    violations.push("no kb_coverage before kb_apply_plan");
  }

  const expectedCode = contract.exactMigrationApply?.actionCode;
  if (expectedCode !== undefined) {
    const coverageData =
      coverageResult === null ? null : resultData(coverageResult);
    const planBodyCandidate = coverageData?.migrationPlan;
    const actions = actionRecords(
      isRecordLike(planBodyCandidate) ? planBodyCandidate.actions : undefined,
    );
    const readyAutomatic = actions.filter(
      (action) =>
        action.state === "ready" &&
        action.safety === "automatic" &&
        action.autoApplicable === true &&
        (expectedCode === undefined || action.code === expectedCode),
    );
    if (readyAutomatic.length !== 1) {
      violations.push(
        `coverage must expose exactly one ready automatic ${expectedCode} action (found ${readyAutomatic.length})`,
      );
    }
    const actionId = readyAutomatic[0]?.id;
    const expectedInvocationCommandArgv =
      contract.exactMigrationApply?.invocationCommandArgv;
    if (
      expectedInvocationCommandArgv !== undefined &&
      readyAutomatic.length === 1
    ) {
      const invocation = readyAutomatic[0]?.invocation;
      const commandArgv = isRecordLike(invocation)
        ? invocation.command_argv
        : undefined;
      if (!deepEquals(commandArgv, expectedInvocationCommandArgv)) {
        violations.push(
          "selected action invocation.command_argv must equal exactMigrationApply.invocationCommandArgv",
        );
      }
    }
    const planHash = isRecordLike(planBodyCandidate)
      ? planBodyCandidate.planHash
      : undefined;
    const planBody = planBodyCandidate;

    if (typeof actionId !== "string" || actionId.length === 0) {
      violations.push("coverage action id missing");
    } else if (!deepEquals(apply.args.approvedActionIds, [actionId])) {
      violations.push(
        "approvedActionIds must equal exactly the selected action id",
      );
    }
    if (typeof planHash !== "string" || planHash.length === 0) {
      violations.push("coverage planHash missing");
    } else if (apply.args.approvedPlanHash !== planHash) {
      violations.push("approvedPlanHash must equal the coverage planHash");
    }
    if (planBody === undefined || planBody === null) {
      violations.push("coverage plan body missing");
    } else if (!deepEquals(apply.args.plan, planBody)) {
      violations.push(
        "applied plan must be unchanged from the coverage preview",
      );
    }

    const applyData = resultData(apply.result);
    if (applyData === null) {
      violations.push("kb_apply_plan returned no typed result");
    } else if (applyData.outcome !== "applied") {
      violations.push(
        `apply outcome must be applied (got ${String(applyData.outcome)})`,
      );
    }
    if (!apply.resultOk) {
      violations.push("kb_apply_plan response was an error");
    }
  }

  for (const call of rawCalls) {
    if (contract.forbiddenTools.includes(call.tool)) {
      violations.push(`forbidden tool attempted: ${call.tool}`);
    }
  }
  return [...new Set(violations)];
}

function protocolPasses(manifest: Manifest, evidence: CellEvidence): boolean {
  if (
    manifest.protocolContract !== undefined &&
    manifest.protocolContract !== null &&
    migrationApplyContractViolations(manifest.protocolContract, evidence)
      .length > 0
  ) {
    return false;
  }
  let cursor = 0;
  for (const required of manifest.orderedMcpPredicates.required) {
    const found = evidence.broker.orderedCalls.findIndex(
      (call, index) =>
        index >= cursor &&
        call.tool === required.tool &&
        (required.predicate.startsWith("sequence=") ||
          call.predicate === required.predicate),
    );
    if (found < 0) return false;
    cursor = found + 1;
  }
  return !manifest.orderedMcpPredicates.forbidden.some((forbidden) => {
    const matching = evidence.broker.orderedCalls
      .map((call, index) => ({ call, index }))
      .filter(({ call }) => call.tool === forbidden.tool);
    if (matching.length === 0) return false;
    if (forbidden.predicate.startsWith("unless ")) return true;
    if (!forbidden.predicate.startsWith("before ")) {
      return matching.some(
        ({ call }) => call.predicate === forbidden.predicate,
      );
    }
    const requiredIndex = manifest.orderedMcpPredicates.required.findIndex(
      ({ tool }) => tool === forbidden.tool,
    );
    if (requiredIndex < 0) return true;
    let requiredCursor = 0;
    for (const required of manifest.orderedMcpPredicates.required.slice(
      0,
      requiredIndex,
    )) {
      const found = evidence.broker.orderedCalls.findIndex(
        (call, index) => index >= requiredCursor && call.tool === required.tool,
      );
      if (found < 0) return true;
      requiredCursor = found + 1;
    }
    return matching.some(({ index }) => index < requiredCursor);
  });
}

export function scoreCell(
  manifest: Manifest,
  evidence: CellEvidence,
): CellReceipt {
  const sources = [
    evidence.finalState,
    evidence.broker,
    evidence.diagnostic,
    evidence.codex,
  ] as const;
  if (sources.some((source) => !source.integrityValid)) {
    return terminalReceipt({
      outcome: "ambiguous",
      terminalCategory: "evidence_conflict",
    });
  }
  if (sources.some((source) => !source.complete)) {
    return terminalReceipt({
      outcome: "ambiguous",
      terminalCategory: "incomplete_evidence",
    });
  }
  let predicateEvidence: PredicateCaseEvidence | undefined;
  let predicateFailureCodes: readonly string[] = [];
  try {
    const predicateCase = evaluatePredicateCase(manifest, evidence);
    predicateEvidence = predicateCase.predicateEvidence;
    predicateFailureCodes = predicateCase.failureCodes;
  } catch (error) {
    if (error instanceof EvidenceBindingError) {
      return terminalReceipt({
        outcome: "ambiguous",
        terminalCategory: "evidence_conflict",
        predicateEvidence: predicateBindingFailure(manifest, error),
      });
    }
    throw error;
  }
  const conflictKeys = evidenceConflictKeys(sources);
  if (conflictKeys.length > 0) {
    return terminalReceipt({
      outcome: "ambiguous",
      terminalCategory: "evidence_conflict",
      conflictKeys,
    });
  }

  const finalClaims = new Map(
    evidence.finalState.claims.map((claim) => [claim.key, claim.value]),
  );
  if (
    manifest.expectedFinalState.some(
      (assertion) => !finalClaims.has(assertion.key),
    )
  ) {
    return terminalReceipt({
      outcome: "ambiguous",
      terminalCategory: "incomplete_evidence",
    });
  }
  const failedAssertions = manifest.expectedFinalState.filter(
    (assertion) =>
      !Object.is(finalClaims.get(assertion.key), assertion.expected),
  );
  const criticalFailures = [
    ...failedAssertions
      .filter((assertion) => assertion.critical)
      .map((assertion) => assertion.key)
      .sort(),
    ...predicateFailureCodes,
  ].sort();
  const securityFailures = [
    ...evidence.isolation.violations.map(
      (_, index) => `isolation-${index + 1}`,
    ),
    ...evidence.isolation.observedSentinels.map(
      (_, index) => `sentinel-${index + 1}`,
    ),
  ];
  if (securityFailures.length > 0) {
    return terminalReceipt({
      outcome: "fail",
      terminalCategory: "critical_security_failure",
      criticalFailures: securityFailures,
    });
  }

  const components = {
    finalState: criticalFailures.length === 0 ? manifest.rubric[0].points : 0,
    protocol: protocolPasses(manifest, evidence)
      ? manifest.rubric[1].points
      : 0,
    isolation: manifest.rubric[2].points,
  } as const;
  const score = Math.min(
    100,
    Math.max(
      0,
      components.finalState + components.protocol + components.isolation,
    ),
  );
  const hard = score >= 85 && criticalFailures.length === 0 ? 1 : 0;
  return {
    outcome: hard === 1 ? "pass" : "fail",
    terminalCategory: hard === 1 ? null : "behavioral_failure",
    score,
    soft: score / 100,
    hard,
    retryable: false,
    adoptionEligible: hard === 1,
    components,
    criticalFailures,
    conflictKeys: [],
    ...(predicateEvidence === undefined ? {} : { predicateEvidence }),
  };
}

export function classifyPreActionInfrastructureFailure(
  attempt: 1 | 2,
): CellReceipt {
  return terminalReceipt({
    outcome: "ambiguous",
    terminalCategory:
      attempt === 1
        ? "pre_action_infrastructure_failure"
        : "incomplete_evidence",
    retryable: attempt === 1,
  });
}

export function classifyBudgetStop(): CellReceipt {
  return terminalReceipt({
    outcome: "ambiguous",
    terminalCategory: "budget_stop",
  });
}
