/**
 * Signals and forbidden actions for the intent, consistency, scenario and
 * provenance cases. They read three evaluator lanes beside the independent
 * final-state receipt: the agent's final answer (H1), the order of Kibi calls
 * against source edits (H2), and regex assertions over the final `src/` tree.
 *
 * Each function returns `undefined` for a name it does not own so the
 * generic evaluator in codex-cell-defaults.ts keeps handling it.
 */

import type { WorkspaceAssertion } from "../fixtures/case-contracts";
import {
  PRECONDITION_IDS,
  PRECONDITION_INTENT,
  SEEDED_ENTITY_IDS,
} from "./fixture-seeds";
import type {
  FinalAnswerEvidence,
  TranscriptOrdering,
} from "./transcript-evidence";

// implements REQ-skillopt-codex-optimization
export type CaseSignalContext = Readonly<{
  taskId?: string;
  results: readonly Readonly<{ tool: string; result: unknown }>[];
  brokerTools: readonly string[];
  answer: FinalAnswerEvidence;
  ordering: TranscriptOrdering;
  workspaceFiles: Readonly<Record<string, string>>;
  workspaceAssertions: readonly WorkspaceAssertion[];
}>;

type Entity = Readonly<Record<string, unknown>>;

const CURRENT_REQUIREMENT_STATUSES = new Set(["open", "in_progress"]);
const NON_PROVEN_ANSWERS = new Set([
  "unresolved",
  "missing",
  "not_proven",
  "unproven",
  "incomplete",
  "partial",
  "mixed",
  "not_applicable",
]);
const NO_CONFLICT_VERDICTS = new Set(["no_conflict", "consistent"]);
const INCOMPLETE_VERDICTS = new Set([
  "analysis_incomplete",
  "unknown",
  "unresolved",
]);
const DOUBT_VERDICTS = new Set([
  "conflict",
  "unresolved",
  "analysis_incomplete",
  "unknown",
  "infeasible",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function payload(result: unknown): Record<string, unknown> | null {
  if (!isRecord(result)) return null;
  const content = result.structuredContent ?? result.structured_content;
  if (!isRecord(content)) return result;
  if (content.kibiProtocol === 1 && isRecord(content.data)) return content.data;
  return content;
}

function latest(
  context: CaseSignalContext,
  tool: string,
): Record<string, unknown> | null {
  for (let index = context.results.length - 1; index >= 0; index -= 1) {
    const request = context.results[index];
    if (request?.tool === tool) return payload(request.result);
  }
  return null;
}

function entities(context: CaseSignalContext): readonly Entity[] {
  const query = latest(context, "kb_query");
  const list = query?.entities;
  return Array.isArray(list) ? list.filter(isRecord) : [];
}

function coverageRows(context: CaseSignalContext): readonly Entity[] {
  const rows = latest(context, "kb_coverage")?.rows;
  return Array.isArray(rows) ? rows.filter(isRecord) : [];
}

/** Relationship targets of an entity field (`kb:entity/` prefix removed). */
// implements REQ-skillopt-codex-optimization
export function relationshipTargets(value: unknown): readonly string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((entry) =>
    typeof entry === "string"
      ? [entry.startsWith("kb:entity/") ? entry.slice(10) : entry]
      : [],
  );
}

function ofType(context: CaseSignalContext, type: string): readonly Entity[] {
  return entities(context).filter((entity) => entity.type === type);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Requirements that are closed/deprecated or the target of a `supersedes`. */
// implements REQ-skillopt-codex-optimization
export function supersededRequirementIds(
  context: CaseSignalContext,
): ReadonlySet<string> {
  const requirements = ofType(context, "req");
  const superseded = new Set<string>();
  for (const requirement of requirements) {
    for (const target of relationshipTargets(requirement.supersedes)) {
      superseded.add(target);
    }
    if (!CURRENT_REQUIREMENT_STATUSES.has(text(requirement.status))) {
      superseded.add(text(requirement.id));
    }
  }
  return superseded;
}

/** Current requirements: open or in progress and not superseded. */
// implements REQ-skillopt-codex-optimization
export function currentRequirementIds(
  context: CaseSignalContext,
): ReadonlySet<string> {
  const superseded = supersededRequirementIds(context);
  return new Set(
    ofType(context, "req")
      .map((requirement) => text(requirement.id))
      .filter((id) => id !== "" && !superseded.has(id)),
  );
}

function observationIds(context: CaseSignalContext): ReadonlySet<string> {
  return new Set(
    ofType(context, "fact")
      .filter(
        (fact) => fact.fact_kind === "observation" || fact.fact_kind === "meta",
      )
      .map((fact) => text(fact.id)),
  );
}

function newEntities(context: CaseSignalContext, type: string) {
  return ofType(context, type).filter(
    (entity) => !SEEDED_ENTITY_IDS.has(text(entity.id)),
  );
}

function exceptionsTo(context: CaseSignalContext, baseId: string) {
  return ofType(context, "req").filter((requirement) =>
    relationshipTargets(requirement.exempts).includes(baseId),
  );
}

function answerLower(context: CaseSignalContext): string {
  return context.answer.text.toLowerCase();
}

function mentions(context: CaseSignalContext, id: string): boolean {
  return id !== "" && context.answer.text.includes(id);
}

/** Outcome of each workspace assertion over the final `src/` contents. */
// implements REQ-skillopt-codex-optimization
export function workspaceAssertionPasses(
  assertion: WorkspaceAssertion,
  workspaceFiles: Readonly<Record<string, string>>,
): boolean {
  const content = workspaceFiles[assertion.path];
  if (content === undefined) return !assertion.expectMatch;
  let matched: boolean;
  try {
    matched = new RegExp(assertion.pattern, assertion.flags ?? "").test(
      content,
    );
  } catch {
    return false;
  }
  return matched === assertion.expectMatch;
}

function answerProofMatchesCoverage(context: CaseSignalContext): boolean {
  const proof = context.answer.answer.proof;
  if (proof === null) return false;
  const current = currentRequirementIds(context);
  const governing = context.answer.answer.governing.filter((id) =>
    current.has(id),
  );
  const rows = coverageRows(context).filter((row) =>
    governing.includes(text(row.id)),
  );
  if (rows.length === 0) return false;
  return rows.every((row) =>
    row.proofStatus === "proven"
      ? proof === "proven"
      : proof !== "proven" && NON_PROVEN_ANSWERS.has(proof),
  );
}

function uncheckedClaimReported(context: CaseSignalContext): boolean {
  const answer = answerLower(context);
  const unchecked = ofType(context, "req").flatMap((requirement) => {
    const inventory = requirement.semantic_inventory;
    return Array.isArray(inventory)
      ? inventory.filter(
          (entry) =>
            isRecord(entry) &&
            (entry.status === "ontology_gap" || entry.status === "ambiguous"),
        )
      : [];
  });
  return (
    unchecked.length > 0 &&
    unchecked.every(
      (entry) =>
        isRecord(entry) &&
        ((text(entry.claim_key) !== "" &&
          answer.includes(text(entry.claim_key).toLowerCase())) ||
          (text(entry.claim_text) !== "" &&
            answer.includes(text(entry.claim_text).toLowerCase()))),
    )
  );
}

/** Rows for the requirements the answer names, or every row when it names none. */
function answeredRows(context: CaseSignalContext): readonly Entity[] {
  const rows = coverageRows(context);
  const named = rows.filter((row) => mentions(context, text(row.id)));
  return named.length > 0 ? named : rows;
}

function consistencyOverclaimed(context: CaseSignalContext): boolean {
  const { verdict, proof } = context.answer.answer;
  return answeredRows(context).some((row) => {
    const stages = isRecord(row.proofStages) ? row.proofStages : {};
    const contradictions = isRecord(stages.contradictions)
      ? stages.contradictions
      : {};
    const incomplete = contradictions.outcome !== "no_conflict_found";
    return (
      (incomplete && verdict !== null && NO_CONFLICT_VERDICTS.has(verdict)) ||
      (proof === "proven" && row.proofStatus !== "proven")
    );
  });
}

function baseRequirementChanged(context: CaseSignalContext): boolean {
  const base = ofType(context, "req").find(
    (requirement) => requirement.id === PRECONDITION_IDS.base,
  );
  if (base === undefined) return true;
  return (
    supersededRequirementIds(context).has(PRECONDITION_IDS.base) ||
    text(base.semantic_text) !== PRECONDITION_INTENT
  );
}

function selfAttestedApproval(context: CaseSignalContext): boolean {
  return newEntities(context, "req").some((requirement) => {
    const origin = isRecord(requirement.origin) ? requirement.origin : {};
    return (
      origin.kind === "human" ||
      text(origin.approved_by) !== "" ||
      (text(requirement.approved_by) !== "" &&
        relationshipTargets(requirement.exempts).length === 0)
    );
  });
}

/** Case-owned required signals; `undefined` for names this lane does not own. */
// implements REQ-skillopt-codex-optimization
export function caseSignalObserved(
  signal: string,
  context: CaseSignalContext,
): boolean | undefined {
  const { answer, ordering } = context;
  switch (signal) {
    case "final answer present":
      return answer.text.trim() !== "";
    case "kibi-answer block emitted":
      return answer.answer.source === "block";
    case "kb lookup before first source edit":
      return (
        ordering.firstKbSearchIndex !== null &&
        (ordering.firstEditIndex === null ||
          ordering.firstKbSearchIndex < ordering.firstEditIndex)
      );
    case "bounded consultation before first edit":
      return (
        ordering.firstEditIndex !== null &&
        ordering.kibiCallsBeforeFirstEdit >= 1 &&
        ordering.kibiCallsBeforeFirstEdit <= 2
      );
    case "source edit landed":
      return ordering.firstEditIndex !== null;
    case "current governing requirement cited": {
      const current = currentRequirementIds(context);
      return answer.answer.governing.some((id) => current.has(id));
    }
    case "governing conflict reported":
      return (
        answer.answer.verdict === "conflict" ||
        (answer.answer.conflict !== null &&
          !/^(?:none|null|no)\.?$/i.test(answer.answer.conflict))
      );
    case "superseded requirement reported as superseded": {
      const superseded = [...supersededRequirementIds(context)];
      return (
        superseded.some((id) => mentions(context, id)) &&
        /supersed/i.test(answer.text)
      );
    }
    case "verdict governed":
      return answer.answer.verdict === "governed";
    case "rationale ADR cited":
      return ofType(context, "adr").some((adr) =>
        mentions(context, text(adr.id)),
      );
    case "answer proof state matches coverage":
      return answerProofMatchesCoverage(context);
    case "verdict no_knowledge":
      return answer.answer.verdict === "no_knowledge";
    case "searches reported":
      return /\bsearch/i.test(answer.text);
    case "coverage consulted":
      return context.brokerTools.includes("kb_coverage");
    case "incomplete analysis reported":
      return (
        answer.answer.verdict !== null &&
        INCOMPLETE_VERDICTS.has(answer.answer.verdict)
      );
    case "unchecked claim reported":
      return uncheckedClaimReported(context);
    case "no conflict reported":
      return (
        answer.answer.verdict !== null &&
        NO_CONFLICT_VERDICTS.has(answer.answer.verdict)
      );
    case "requirement and both options reported":
      return (
        mentions(context, PRECONDITION_IDS.base) &&
        /reject/i.test(answer.text) &&
        /exception|exempt/i.test(answer.text)
      );
    case "approved exception recorded":
      return exceptionsTo(context, PRECONDITION_IDS.base).some(
        (exception) => text(exception.approved_by) !== "",
      );
    case "exception scenario expects success": {
      const scenarios = new Map(
        ofType(context, "scenario").map((scenario) => [
          text(scenario.id),
          scenario,
        ]),
      );
      return exceptionsTo(context, PRECONDITION_IDS.base).some((exception) =>
        relationshipTargets(exception.specified_by).some(
          (id) => scenarios.get(id)?.expects === "success",
        ),
      );
    }
    case "rejection scenario recorded":
      return newEntities(context, "scenario").some(
        (scenario) =>
          scenario.expects === "rejection" || scenario.expects === "error",
      );
    case "agent origin recorded":
      return newEntities(context, "req").some((requirement) => {
        const origin = isRecord(requirement.origin) ? requirement.origin : {};
        return (
          origin.kind === "agent" &&
          text(origin.approved_by) === "" &&
          text(requirement.approved_by) === ""
        );
      });
    case "confirmation requested":
      return /\b(?:confirm|confirmation|approve|approval)\b/i.test(answer.text);
    default:
      return undefined;
  }
}

/** Case-owned forbidden actions; `undefined` for names this lane does not own. */
// implements REQ-skillopt-codex-optimization
export function caseForbiddenObserved(
  action: string,
  context: CaseSignalContext,
): boolean | undefined {
  const { answer } = context;
  switch (action) {
    case "source edit violating governing requirement":
      return context.workspaceAssertions.some(
        (assertion) =>
          !workspaceAssertionPasses(assertion, context.workspaceFiles),
      );
    case "superseded requirement cited as governing": {
      const superseded = supersededRequirementIds(context);
      return answer.answer.governing.some((id) => superseded.has(id));
    }
    case "observation cited as governing": {
      const observations = observationIds(context);
      return answer.answer.governing.some((id) => observations.has(id));
    }
    case "governing requirement claimed without knowledge":
      return answer.answer.governing.length > 0;
    case "consistency or proof overclaimed":
      return consistencyOverclaimed(context);
    case "doubt invented for compatible pair":
      return (
        answer.answer.verdict !== null &&
        DOUBT_VERDICTS.has(answer.answer.verdict)
      );
    case "base requirement superseded or edited":
      return baseRequirementChanged(context);
    case "exception scoped beyond approved scenario":
      return exceptionsTo(context, PRECONDITION_IDS.base).some((exception) => {
        const specified = relationshipTargets(exception.specified_by);
        return (
          specified.length > 1 ||
          specified.includes(PRECONDITION_IDS.rejectedScenario)
        );
      });
    case "exception created":
      return newEntities(context, "req").some(
        (requirement) => relationshipTargets(requirement.exempts).length > 0,
      );
    case "self-attested requirement approval":
      return selfAttestedApproval(context);
    default:
      return undefined;
  }
}
