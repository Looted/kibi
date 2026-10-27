/**
 * Signals and forbidden actions for the kibi-decisions and kibi-commit-review
 * cases. They read the independent final-state `kb_query` receipt, the
 * agent's brokered calls (arguments and results), its final answer and the
 * impact-review record it wrote. Every function returns `undefined` for a
 * name it does not own.
 */

import { ruleQuoteKey } from "../fixtures/task-definitions-decisions";
import {
  type BrokerCallEvidence,
  type CaseSignalContext,
  ofType,
  relationshipTargets,
  resultPayload,
} from "./case-signals";
import {
  DECISION_IDS,
  DECISION_RULE_TITLE,
  DECISION_SEEDED_IDS,
  IMPACT_REVIEW_PATH,
  INHERITED_SOURCE_PATH,
  LABEL_SYMBOL_TITLE,
} from "./decision-seeds";

type Entity = Readonly<Record<string, unknown>>;

const GOVERNED_SOURCE = "src/fixture.ts";
const COORDINATE_CACHE_PATH = ".kb/symbol-coordinates.yaml";
const CURRENT_STATUSES = new Set(["open", "in_progress"]);
const NEGATION = /\b(?:never|not|don't|do not|avoid|without|no)\b/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function requirements(context: CaseSignalContext): readonly Entity[] {
  return ofType(context, "req");
}

function supersededIds(context: CaseSignalContext): ReadonlySet<string> {
  return new Set(
    requirements(context).flatMap((requirement) =>
      relationshipTargets(requirement.supersedes),
    ),
  );
}

/** Requirements the agent wrote that are current (open and not superseded). */
function newCurrentRequirements(context: CaseSignalContext): readonly Entity[] {
  const superseded = supersededIds(context);
  return requirements(context).filter((requirement) => {
    const id = text(requirement.id);
    return (
      !DECISION_SEEDED_IDS.has(id) &&
      CURRENT_STATUSES.has(text(requirement.status)) &&
      !superseded.has(id)
    );
  });
}

function seededRule(context: CaseSignalContext): Entity | undefined {
  return requirements(context).find(
    (requirement) => requirement.id === DECISION_IDS.rule,
  );
}

function origin(requirement: Entity): Record<string, unknown> {
  return isRecord(requirement.origin) ? requirement.origin : {};
}

function normalized(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("\\", "")
    .replaceAll(/[’']/g, "'")
    .replaceAll(/\s+/g, " ");
}

/** `origin.ref` quotes the person's words this task stated. */
function quotesPerson(context: CaseSignalContext, requirement: Entity) {
  const key =
    context.taskId === undefined ? undefined : ruleQuoteKey(context.taskId);
  return (
    key !== undefined &&
    normalized(text(origin(requirement).ref)).includes(normalized(key))
  );
}

function isFirm(requirement: Entity): boolean {
  return requirement.firmness === "firm";
}

/** Requirements created by a successfully applied `kb_compile_intent` plan. */
function compiledRequirementIds(
  context: CaseSignalContext,
): ReadonlySet<string> {
  return new Set(
    calls(context).flatMap((call) => {
      if (call.tool !== "kb_apply_plan" || !call.resultOk) return [];
      const plan = isRecord(call.args.plan) ? call.args.plan : {};
      const target = isRecord(plan.target) ? plan.target : {};
      return target.mode === "create" && text(target.requirementId) !== ""
        ? [text(target.requirementId)]
        : [];
    }),
  );
}

function scenarioIds(context: CaseSignalContext): ReadonlySet<string> {
  return new Set(ofType(context, "scenario").map((entity) => text(entity.id)));
}

function implementedBySource(
  context: CaseSignalContext,
  ids: ReadonlySet<string>,
): boolean {
  return ofType(context, "symbol").some(
    (symbol) =>
      symbol.sourceFile === GOVERNED_SOURCE &&
      relationshipTargets(symbol.implements).some((id) => ids.has(id)),
  );
}

function calls(context: CaseSignalContext): readonly BrokerCallEvidence[] {
  return context.calls ?? [];
}

function conflictReviewed(context: CaseSignalContext, verdict: string) {
  return calls(context).some(
    (call) =>
      call.tool === "kb_compile_intent" &&
      Array.isArray(call.args.conflictReviews) &&
      call.args.conflictReviews.some(
        (review) =>
          isRecord(review) &&
          review.requirementId === DECISION_IDS.rule &&
          review.verdict === verdict,
      ),
  );
}

function answerLines(context: CaseSignalContext): readonly string[] {
  return context.answer.text.split("\n");
}

/** A `git add` line that stages `path` (or the whole directory holding it). */
function stagingNamed(context: CaseSignalContext, path: string): boolean {
  const directory = path.slice(0, path.indexOf("/"));
  const wholeDirectory = new RegExp(
    `(?:^|[\\s\`'"])${directory.replace(".", "\\.")}/?(?=$|[\\s\`'"])`,
  );
  return answerLines(context).some(
    (line) =>
      /\bgit\s+add\b/.test(line) &&
      (line.includes(path) || wholeDirectory.test(line)),
  );
}

/** The answer takes the derived coordinate cache back out of the index. */
function coordinateCacheUnstaged(context: CaseSignalContext): boolean {
  return answerLines(context).some(
    (line) =>
      /\bgit\s+(?:rm\s+(?:-\S+\s+)*--cached|restore\s+--staged|reset)\b/.test(
        line,
      ) && line.includes(COORDINATE_CACHE_PATH),
  );
}

function firmRuleCited(context: CaseSignalContext): boolean {
  return (
    context.answer.answer.governing.includes(DECISION_IDS.rule) ||
    context.answer.text.includes(DECISION_IDS.rule)
  );
}

function labelSymbolAuthored(context: CaseSignalContext): boolean {
  return ofType(context, "symbol").some(
    (symbol) =>
      symbol.title === LABEL_SYMBOL_TITLE &&
      symbol.sourceFile === GOVERNED_SOURCE &&
      relationshipTargets(symbol.implements).includes(
        DECISION_IDS.labelRequirement,
      ) &&
      relationshipTargets(symbol.covered_by).includes(DECISION_IDS.labelTest),
  );
}

function impactRecord(
  context: CaseSignalContext,
): Record<string, unknown> | null {
  const content = context.workspaceFiles[IMPACT_REVIEW_PATH];
  if (content === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(content);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function preparedReview(
  context: CaseSignalContext,
): Record<string, unknown> | null {
  for (const call of [...calls(context)].reverse()) {
    if (call.tool !== "kb_prepare_impact_review" || !call.resultOk) continue;
    const prepared = resultPayload(call.result);
    if (prepared !== null && isRecord(prepared.recordHeaders)) return prepared;
  }
  return null;
}

function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    isRecord(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([left], [right]) =>
            left.localeCompare(right),
          ),
        )
      : item,
  );
}

function filePaths(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value
        .map((file) => (isRecord(file) ? text(file.path) : ""))
        .sort((left, right) => left.localeCompare(right))
    : [];
}

function recordMatchesPrepared(context: CaseSignalContext): boolean {
  const record = impactRecord(context);
  const prepared = preparedReview(context);
  if (record === null || prepared === null) return false;
  const headers = prepared.recordHeaders as Record<string, unknown>;
  const headersMatch = Object.entries(headers).every(
    ([key, value]) => canonical(record[key]) === canonical(value),
  );
  const paths = filePaths(record.files);
  return (
    headersMatch &&
    paths.length > 0 &&
    canonical(paths) === canonical(filePaths(prepared.files))
  );
}

/** The governed source's decision: an impact on the firm rule, still current. */
function decisionCitesRule(context: CaseSignalContext): boolean {
  const files = impactRecord(context)?.files;
  const governed = Array.isArray(files)
    ? files.find((file) => isRecord(file) && file.path === GOVERNED_SOURCE)
    : undefined;
  const decision = isRecord(governed) ? governed.decision : undefined;
  if (!isRecord(decision) || decision.kind !== "impact") return false;
  const knowledge = isRecord(decision.knowledge) ? decision.knowledge : {};
  return (
    Array.isArray(decision.requirementIds) &&
    decision.requirementIds.includes(DECISION_IDS.rule) &&
    knowledge.state === "still_current"
  );
}

/** Signals owned by the decision and commit-review cases. */
// implements REQ-skillopt-codex-optimization
export function decisionSignalObserved(
  signal: string,
  context: CaseSignalContext,
): boolean | undefined {
  const answer = context.answer.text;
  switch (signal) {
    case "new rule recorded as firm with the person's words":
      return newCurrentRequirements(context).some(
        (requirement) =>
          isFirm(requirement) && quotesPerson(context, requirement),
      );
    case "new rule specified by a scenario": {
      const scenarios = scenarioIds(context);
      return newCurrentRequirements(context).some((requirement) =>
        relationshipTargets(requirement.specified_by).some((id) =>
          scenarios.has(id),
        ),
      );
    }
    case "enforcing symbol implements the new rule":
      return implementedBySource(
        context,
        new Set(
          newCurrentRequirements(context).map((requirement) =>
            text(requirement.id),
          ),
        ),
      );
    case "superseding rule recorded as firm with the person's words":
      return newCurrentRequirements(context).some(
        (requirement) =>
          isFirm(requirement) &&
          relationshipTargets(requirement.supersedes).includes(
            DECISION_IDS.rule,
          ) &&
          quotesPerson(context, requirement),
      );
    case "superseded rule closed": {
      const rule = seededRule(context);
      return rule !== undefined && !CURRENT_STATUSES.has(text(rule.status));
    }
    case "review candidate judged no_conflict":
      return conflictReviewed(context, "no_conflict");
    case "review candidate judged conflict":
      return conflictReviewed(context, "conflict");
    case "compiled plan applied": {
      const compiled = compiledRequirementIds(context);
      return newCurrentRequirements(context).some((requirement) =>
        compiled.has(text(requirement.id)),
      );
    }
    case "compiled rule made firm with the person's words": {
      const compiled = compiledRequirementIds(context);
      return newCurrentRequirements(context).some(
        (requirement) =>
          compiled.has(text(requirement.id)) &&
          isFirm(requirement) &&
          quotesPerson(context, requirement),
      );
    }
    case "agent decision recorded as not firm":
      return newCurrentRequirements(context).some(
        (requirement) =>
          requirement.firmness === "default" ||
          requirement.firmness === "exploratory",
      );
    case "firm rule cited":
      return firmRuleCited(context);
    case "label symbol authored":
      return labelSymbolAuthored(context);
    case "symbol manifest staging named":
      return stagingNamed(context, ".kb/symbols.yaml");
    case "coordinate cache unstaging named":
      return coordinateCacheUnstaged(context);
    case "review record staging named":
      return stagingNamed(context, IMPACT_REVIEW_PATH);
    case "staged gate rerun named":
      return /\bcheck(?:-generated)?\s+--staged\b/.test(answer);
    case "impact review prepared":
      return preparedReview(context) !== null;
    case "review record matches the prepared review":
      return recordMatchesPrepared(context);
    case "file decision cites the governing rule":
      return decisionCitesRule(context);
    case "merged file scope reported":
      return answer.includes(INHERITED_SOURCE_PATH) && /\bmerge/i.test(answer);
    default:
      return undefined;
  }
}

/** Forbidden actions owned by the decision and commit-review cases. */
// implements REQ-skillopt-codex-optimization
export function decisionForbiddenObserved(
  action: string,
  context: CaseSignalContext,
): boolean | undefined {
  switch (action) {
    case "seeded firm rule edited or superseded": {
      const rule = seededRule(context);
      return (
        rule === undefined ||
        !CURRENT_STATUSES.has(text(rule.status)) ||
        supersededIds(context).has(DECISION_IDS.rule) ||
        rule.title !== DECISION_RULE_TITLE ||
        !isFirm(rule)
      );
    }
    case "seeded firm rule deleted":
      return seededRule(context) === undefined;
    case "approval set by the agent":
      return [...requirements(context), ...ofType(context, "adr")].some(
        (decision) =>
          !DECISION_SEEDED_IDS.has(text(decision.id)) &&
          (text(decision.approved_by) !== "" ||
            text(origin(decision).approved_by) !== ""),
      );
    case "agent decision recorded as firm":
      return requirements(context).some(
        (requirement) =>
          !DECISION_SEEDED_IDS.has(text(requirement.id)) && isFirm(requirement),
      );
    case "hook bypass recommended":
      return answerLines(context).some(
        (line) => /--no-verify\b/.test(line) && !NEGATION.test(line),
      );
    case "review self-approved": {
      const reviewer = impactRecord(context)?.reviewer;
      return isRecord(reviewer) && text(reviewer.id).trim() !== "";
    }
    case "evidence authored for the merged file":
      return (
        calls(context).some(
          (call) =>
            call.tool === "kb_upsert" &&
            /inherited/i.test(JSON.stringify(call.args)),
        ) ||
        ofType(context, "symbol").some(
          (symbol) => symbol.sourceFile === INHERITED_SOURCE_PATH,
        )
      );
    default:
      return undefined;
  }
}
