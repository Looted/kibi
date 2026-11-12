/**
 * Signals and forbidden actions for the KB-quality cases (ownership-precision
 * and requirement-quality). They read the independent final-state `kb_query`
 * and `kb_check` receipts and, for the context a requirement body carries,
 * the agent's committed `kb_upsert` calls (the final-state query returns
 * front matter only). Every function returns `undefined` for a name it does
 * not own.
 */

import {
  type CaseSignalContext,
  ofType,
  relationshipTargets,
  resultPayload,
} from "./case-signals";
import {
  HANDLING_DECIDERS,
  OWNER_DECIDER,
  OWNER_FORWARDERS,
  QUALITY_IDS,
  QUALITY_SEEDED_IDS,
  REASONLESS_TITLE,
  SLUG_FUNCTION,
} from "./quality-seeds";

type Entity = Readonly<Record<string, unknown>>;

const CURRENT = new Set(["open", "in_progress"]);
const BROAD_THRESHOLD = 8;
const NOT_STATED =
  /reason (?:was |is )?(?:not|never) (?:stated|given|recorded|documented)|no (?:stated |recorded )?reason (?:was |is )?(?:stated|given|recorded)/i;
const REASON_WORDS =
  /\b(?:because|so that|in order to|to (?:ensure|prevent|avoid|make|allow|keep|let)|this (?:ensures|prevents|allows|makes|keeps))\b/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function list(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : typeof value === "string"
      ? [value]
      : [];
}

function requirements(context: CaseSignalContext): readonly Entity[] {
  return ofType(context, "req");
}

function requirement(context: CaseSignalContext, id: string) {
  return requirements(context).find((entity) => entity.id === id);
}

function symbolsTitled(context: CaseSignalContext, title: string) {
  return ofType(context, "symbol").filter((symbol) => symbol.title === title);
}

function implementsAny(symbol: Entity, ids: ReadonlySet<string>): boolean {
  return relationshipTargets(symbol.implements).some((id) => ids.has(id));
}

function origin(entity: Entity): Record<string, unknown> {
  return isRecord(entity.origin) ? entity.origin : {};
}

/** Current requirements the agent wrote. */
function newCurrentRequirements(context: CaseSignalContext) {
  const superseded = new Set(
    requirements(context).flatMap((entity) =>
      relationshipTargets(entity.supersedes),
    ),
  );
  return requirements(context).filter((entity) => {
    const id = text(entity.id);
    return (
      !QUALITY_SEEDED_IDS.has(id) &&
      CURRENT.has(text(entity.status)) &&
      !superseded.has(id)
    );
  });
}

function implementerCount(context: CaseSignalContext, id: string): number {
  return ofType(context, "symbol").filter((symbol) =>
    relationshipTargets(symbol.implements).includes(id),
  ).length;
}

function hasUmbrellaTag(context: CaseSignalContext): boolean {
  return requirements(context).some((entity) =>
    list(entity.tags).some((tag) => /^(?:umbrella|epic)$/i.test(tag)),
  );
}

function finalCheckMentions(context: CaseSignalContext, needle: string) {
  for (let index = context.results.length - 1; index >= 0; index -= 1) {
    const request = context.results[index];
    if (request?.tool !== "kb_check") continue;
    return JSON.stringify(resultPayload(request.result) ?? {}).includes(
      needle,
    );
  }
  return false;
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (isRecord(value)) return Object.values(value).flatMap(strings);
  return [];
}

/**
 * The text of every committed (non-dry-run) `kb_upsert` that names the label
 * requirement: the context the agent wrote into its body.
 */
function writtenLabelText(context: CaseSignalContext): string {
  return (context.calls ?? [])
    .filter(
      (call) =>
        call.tool === "kb_upsert" &&
        call.resultOk &&
        call.args.dryRun !== true &&
        JSON.stringify(call.args).includes(QUALITY_IDS.label),
    )
    .flatMap((call) => strings(call.args))
    .join("\n");
}

function sentences(value: string): readonly string[] {
  return value
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence !== "");
}

function reasonInvented(context: CaseSignalContext): boolean {
  return sentences(writtenLabelText(context)).some(
    (sentence) => REASON_WORDS.test(sentence) && !NOT_STATED.test(sentence),
  );
}

/** Children of the broad requirement: current requirements superseding it. */
function splitChildren(context: CaseSignalContext): readonly Entity[] {
  return newCurrentRequirements(context).filter((entity) =>
    relationshipTargets(entity.supersedes).includes(QUALITY_IDS.handling),
  );
}

export function qualitySignalObserved(
  signal: string,
  context: CaseSignalContext,
): boolean | undefined {
  switch (signal) {
    case "deciding symbol implements the requirement":
      return symbolsTitled(context, OWNER_DECIDER).some((symbol) =>
        relationshipTargets(symbol.implements).includes(QUALITY_IDS.lengthRule),
      );
    case "deciding symbol covered by the test":
      return symbolsTitled(context, OWNER_DECIDER).some(
        (symbol) =>
          relationshipTargets(symbol.implements).includes(
            QUALITY_IDS.lengthRule,
          ) &&
          relationshipTargets(symbol.covered_by).includes(
            QUALITY_IDS.lengthTest,
          ),
      );
    case "new behavior recorded as its own requirement":
      return newCurrentRequirements(context).some((entity) =>
        /slug/i.test(`${text(entity.id)} ${text(entity.title)}`),
      );
    case "new function implements the new requirement": {
      const ids = new Set(
        newCurrentRequirements(context).map((entity) => text(entity.id)),
      );
      return symbolsTitled(context, SLUG_FUNCTION).some((symbol) =>
        implementsAny(symbol, ids),
      );
    }
    case "unstated reason recorded as not stated":
      return NOT_STATED.test(writtenLabelText(context));
    case "requester and source recorded": {
      const written = writtenLabelText(context);
      return (
        /export team/i.test(written) &&
        /2026-09-14|naming review|fixture\.md/i.test(written)
      );
    }
    case "sourced reason recorded": {
      const written = writtenLabelText(context);
      return (
        /importer|routes? rows|by prefix/i.test(written) &&
        /fixture\.md|naming review|export team/i.test(written)
      );
    }
    case "parent closed and superseded by behavior-sized children": {
      const parent = requirement(context, QUALITY_IDS.handling);
      const count = splitChildren(context).length;
      return parent?.status === "closed" && count >= 2 && count <= 4;
    }
    case "each child specified by a scenario": {
      const scenarios = new Set(
        ofType(context, "scenario").map((entity) => text(entity.id)),
      );
      const children = splitChildren(context);
      return (
        children.length > 0 &&
        children.every((child) => {
          const targets = relationshipTargets(child.specified_by);
          return (
            targets.length > 0 && targets.every((id) => scenarios.has(id))
          );
        })
      );
    }
    case "deciding symbols moved to the children": {
      const children = new Set(
        splitChildren(context).map((entity) => text(entity.id)),
      );
      return Object.values(HANDLING_DECIDERS).every((title) =>
        symbolsTitled(context, title).some((symbol) => {
          const targets = relationshipTargets(symbol.implements);
          return (
            targets.filter((id) => children.has(id)).length === 1 &&
            !targets.includes(QUALITY_IDS.handling)
          );
        }),
      );
    }
    default:
      return undefined;
  }
}

export function qualityForbiddenObserved(
  action: string,
  context: CaseSignalContext,
): boolean | undefined {
  switch (action) {
    case "delegating code linked as owner":
      return OWNER_FORWARDERS.some((title) =>
        symbolsTitled(context, title).some((symbol) =>
          relationshipTargets(symbol.implements).includes(
            QUALITY_IDS.lengthRule,
          ),
        ),
      );
    case "requirement pushed past the review threshold":
      return (
        implementerCount(context, QUALITY_IDS.normalization) >
          BROAD_THRESHOLD ||
        (finalCheckMentions(context, "broad_requirement_review") &&
          finalCheckMentions(context, QUALITY_IDS.normalization))
      );
    case "umbrella tag added to clear a finding":
      return hasUmbrellaTag(context);
    case "owner chosen by headroom":
      return symbolsTitled(context, SLUG_FUNCTION).some((symbol) =>
        relationshipTargets(symbol.implements).includes(QUALITY_IDS.label),
      );
    case "reason invented":
      return reasonInvented(context);
    case "stated reason withheld":
      return NOT_STATED.test(writtenLabelText(context));
    case "review tag added by the agent": {
      const label = requirement(context, QUALITY_IDS.label);
      return list(label?.tags).includes("review:context-missing");
    }
    case "statement changed": {
      const label = requirement(context, QUALITY_IDS.label);
      return label === undefined || text(label.title) !== REASONLESS_TITLE;
    }
    case "parent left current or retired": {
      const parent = requirement(context, QUALITY_IDS.handling);
      return (
        parent === undefined ||
        ["open", "in_progress", "retired"].includes(text(parent.status))
      );
    }
    case "quality approval set by the agent":
      return requirements(context).some(
        (entity) =>
          !QUALITY_SEEDED_IDS.has(text(entity.id)) &&
          (text(entity.approved_by) !== "" ||
            text(origin(entity).approved_by) !== ""),
      );
    case "broad review left in the final check":
      return finalCheckMentions(context, "broad_requirement_review");
    default:
      return undefined;
  }
}
