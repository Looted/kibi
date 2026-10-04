import type { LogicRuleIR, LogicTerm } from "../../logic/ir.js";
import { normalizeKey } from "./shared.js";

/**
 * Conditional requirement shapes routed to the rule lane.
 *
 *   "<Action> may|can|must|shall happen only when|if <condition>"
 *   "<Action> may|can only happen when|if <condition>"
 *   "<Action> must|shall|may|can not (or cannot) happen unless <condition>"
 *
 * Both say the action is forbidden unless the condition holds, so both become
 * one typed kibi.logic.v1 rule: forbid <action>(X) :- <subject>:<property>(X,
 * V) unless V <op> <value>.  A leading "In the EU," or "For EU orders," scopes
 * the rule.  A clause with one of these shapes whose action or condition this
 * reader cannot translate is reported as `unparsed`, so the caller keeps it
 * unresolved instead of downgrading it to an observation that looks modeled.
 */
export type ConditionalRuleShape = "only_when" | "unless";

export type ConditionalRuleMatch =
  | Readonly<{
      kind: "rule";
      shape: ConditionalRuleShape;
      evidence: string;
      action: string;
      subjectKey: string;
      propertyKey: string;
      scope: string | null;
      ir: LogicRuleIR;
    }>
  | Readonly<{
      kind: "unparsed";
      shape: ConditionalRuleShape;
      evidence: string;
      reason: string;
    }>;

type Comparison = Readonly<{
  operator: "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
  value: LogicTerm;
  valueType: string;
}>;

const ONLY_WHEN =
  /^(?<action>.+?)\s+(?:may|can|must|shall|should)\s+(?:only\s+(?<verbBefore>.+?)|(?<verbAfter>.+?)\s+only)\s+(?:when|if)\s+(?<condition>.+)$/i;
const ONLY_WHEN_ANYWHERE =
  /\bonly\s+(?:when|if)\b|\b(?:may|can|must|shall|should)\s+only\s+[^.;]*?\b(?:when|if)\b/i;
const UNLESS =
  /^(?<action>.+?)\s+(?:(?:may|can|must|shall|should)\s+not|cannot|can't|must\s+never|shall\s+never)\s+(?<verb>.+?)\s+unless\s+(?<condition>.+)$/i;
const NEGATED_UNLESS_ANYWHERE =
  /\b(?:not|cannot|can't|never)\b[^.;]*\bunless\b/i;
const SCOPE_PREFIX =
  /^(?:[Ii]n|[Ff]or|[Ww]ithin)\s+(?:[Tt]he\s+)?(?<scope>[A-Z]{2,})(?:\s+[a-z]+)?\s*,\s*/;
// Verbs that only say the action takes place: the action is the subject.
const OCCURRENCE_VERB =
  /^(?:happen|occur|proceed|start|begin|run|complete|take\s+place|be\s+(?:performed|placed|submitted|started|completed|processed|executed))$/i;
const NUMBER_WORDS: Readonly<Record<string, number>> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};
const DURATION_UNITS: Readonly<
  Record<string, "ms" | "s" | "m" | "h" | "d" | "w">
> = {
  ms: "ms",
  millisecond: "ms",
  milliseconds: "ms",
  s: "s",
  sec: "s",
  second: "s",
  seconds: "s",
  min: "m",
  minute: "m",
  minutes: "m",
  h: "h",
  hour: "h",
  hours: "h",
  d: "d",
  day: "d",
  days: "d",
  w: "w",
  week: "w",
  weeks: "w",
};

function identifier(text: string): string {
  return normalizeKey(text.replace(/\b(?:a|an|the)\b/gi, " "));
}

function numberValue(text: string): number | null {
  const trimmed = text.trim().toLowerCase();
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return NUMBER_WORDS[trimmed] ?? null;
}

// "5", "five", "30 minutes", "2.5"
function quantity(text: string): Readonly<{
  value: LogicTerm;
  valueType: string;
}> | null {
  const match = text
    .trim()
    .match(/^(?<amount>-?\d+(?:\.\d+)?|[a-z]+)(?:\s+(?<unit>[a-z]+))?$/i);
  if (!match?.groups?.amount) return null;
  const amount = numberValue(match.groups.amount);
  if (amount === null) return null;
  const unitText = match.groups.unit?.toLowerCase();
  if (unitText === undefined)
    return { value: { kind: "number", value: amount }, valueType: "number" };
  const unit = DURATION_UNITS[unitText];
  if (unit === undefined || amount < 0) return null;
  return {
    value: { kind: "duration", value: amount, unit },
    valueType: "duration",
  };
}

const ZERO: LogicTerm = { kind: "number", value: 0 };

function comparison(predicate: string): Comparison | null {
  const text = predicate
    .trim()
    .replace(/[.!?]+$/, "")
    .toLowerCase();
  const fixed: Readonly<Record<string, Comparison>> = {
    positive: { operator: "gt", value: ZERO, valueType: "number" },
    "greater than zero": { operator: "gt", value: ZERO, valueType: "number" },
    "above zero": { operator: "gt", value: ZERO, valueType: "number" },
    "more than zero": { operator: "gt", value: ZERO, valueType: "number" },
    negative: { operator: "lt", value: ZERO, valueType: "number" },
    "below zero": { operator: "lt", value: ZERO, valueType: "number" },
    "less than zero": { operator: "lt", value: ZERO, valueType: "number" },
    zero: { operator: "eq", value: ZERO, valueType: "number" },
    "non-negative": { operator: "gte", value: ZERO, valueType: "number" },
    nonnegative: { operator: "gte", value: ZERO, valueType: "number" },
    "not negative": { operator: "gte", value: ZERO, valueType: "number" },
    "non-zero": { operator: "neq", value: ZERO, valueType: "number" },
    "not zero": { operator: "neq", value: ZERO, valueType: "number" },
  };
  const known = fixed[text];
  if (known) return known;
  const comparators: ReadonlyArray<readonly [RegExp, Comparison["operator"]]> =
    [
      [/^(?:greater|more|higher)\s+than\s+(?<q>.+)$/, "gt"],
      [/^(?:above|over|exceeds?)\s+(?<q>.+)$/, "gt"],
      [/^(?:at\s+least|no\s+less\s+than|not\s+less\s+than)\s+(?<q>.+)$/, "gte"],
      [/^(?<q>.+?)\s+or\s+more$/, "gte"],
      [/^(?:less|fewer|lower)\s+than\s+(?<q>.+)$/, "lt"],
      [/^(?:below|under)\s+(?<q>.+)$/, "lt"],
      [
        /^(?:at\s+most|no\s+more\s+than|not\s+more\s+than|up\s+to)\s+(?<q>.+)$/,
        "lte",
      ],
      [/^(?<q>.+?)\s+or\s+(?:less|fewer)$/, "lte"],
      [/^(?:not\s+equal\s+to|different\s+from|not)\s+(?<q>.+)$/, "neq"],
      [/^(?:equal\s+to|exactly)\s+(?<q>.+)$/, "eq"],
    ];
  for (const [pattern, operator] of comparators) {
    const match = text.match(pattern);
    const parsed = match?.groups?.q ? quantity(match.groups.q) : null;
    if (parsed) return { operator, ...parsed };
  }
  const bare = quantity(text);
  if (bare) return { operator: "eq", ...bare };
  // A single word state ("active", "verified") is a symbolic value.
  if (/^[a-z][a-z_-]*$/.test(text) && !/^(?:not|no|any|some)$/.test(text))
    return {
      operator: "eq",
      value: { kind: "const", value: text.replace(/-/g, "_"), type: "string" },
      valueType: "string",
    };
  return null;
}

// "the cart total is positive", "the cart's total is at least 5"
function condition(text: string): Readonly<{
  subjectKey: string;
  propertyKey: string;
  comparison: Comparison;
}> | null {
  if (/\b(?:and|or|but)\b|,/i.test(text)) return null;
  const match = text
    .trim()
    .replace(/[.!?]+$/, "")
    .match(
      /^(?<subject>.+?)\s+(?<verb>is|are|stays|remains|equals)\s+(?<predicate>.+)$/i,
    );
  if (!match?.groups?.subject || !match.groups.verb || !match.groups.predicate)
    return null;
  const parsed = comparison(
    match.groups.verb.toLowerCase() === "equals"
      ? `equal to ${match.groups.predicate}`
      : match.groups.predicate,
  );
  if (!parsed) return null;
  const subjectText = match.groups.subject.replace(/\b(?:a|an|the)\b/gi, " ");
  let subjectPart: string;
  let propertyPart: string;
  const possessive = subjectText.match(/^(?<owner>.+?)['’]s\s+(?<prop>.+)$/);
  const ofForm = subjectText.match(/^(?<prop>.+?)\s+of\s+(?<owner>.+)$/i);
  if (possessive?.groups?.owner && possessive.groups.prop) {
    subjectPart = possessive.groups.owner;
    propertyPart = possessive.groups.prop;
  } else if (ofForm?.groups?.owner && ofForm.groups.prop) {
    subjectPart = ofForm.groups.owner;
    propertyPart = ofForm.groups.prop;
  } else {
    const words = subjectText.trim().split(/\s+/);
    if (words.length < 2) return null;
    propertyPart = words.slice(-1).join(" ");
    subjectPart = words.slice(0, -1).join(" ");
  }
  const subjectKey = identifier(subjectPart);
  const propertyKey = identifier(propertyPart);
  if (!/^[a-z]/.test(subjectKey) || !/^[a-z]/.test(propertyKey)) return null;
  return { subjectKey, propertyKey, comparison: parsed };
}

function actionName(subject: string, verb: string): string {
  const verbText = verb.trim();
  return OCCURRENCE_VERB.test(verbText)
    ? identifier(subject)
    : identifier(`${subject} ${verbText.replace(/^be\s+/i, "")}`);
}

// implements REQ-kibi-truthful-consistency
export function detectConditionalRule(
  statement: string,
): ConditionalRuleMatch | null {
  const text = statement.trim().replace(/[.!?]+$/, "");
  const shape: ConditionalRuleShape | null = ONLY_WHEN_ANYWHERE.test(text)
    ? "only_when"
    : NEGATED_UNLESS_ANYWHERE.test(text)
      ? "unless"
      : null;
  if (shape === null) return null;
  const scopeMatch = text.match(SCOPE_PREFIX);
  const scope = scopeMatch?.groups?.scope
    ? scopeMatch.groups.scope.toLowerCase()
    : null;
  const body = scopeMatch ? text.slice(scopeMatch[0].length) : text;
  const unparsed = (reason: string): ConditionalRuleMatch => ({
    kind: "unparsed",
    shape,
    evidence: text,
    reason,
  });
  let action: string;
  let conditionText: string;
  if (shape === "only_when") {
    const match = body.match(ONLY_WHEN);
    const verb = match?.groups?.verbBefore ?? match?.groups?.verbAfter;
    if (!match?.groups?.action || !verb || !match.groups.condition)
      return unparsed(
        "The clause says an action happens only under a condition, but its action could not be read.",
      );
    action = actionName(match.groups.action, verb);
    conditionText = match.groups.condition;
  } else {
    const match = body.match(UNLESS);
    if (!match?.groups?.action || !match.groups.verb || !match.groups.condition)
      return unparsed(
        "The clause forbids an action unless a condition holds, but its action could not be read.",
      );
    action = actionName(match.groups.action, match.groups.verb);
    conditionText = match.groups.condition;
  }
  if (!/^[a-z]/.test(action))
    return unparsed(
      "The conditional clause names no action that can become a rule head.",
    );
  const parsed = condition(conditionText);
  if (!parsed)
    return unparsed(
      "The condition is not a single comparison of one subject property (for example 'the cart total is positive'); define its terms before grounding it.",
    );
  const instanceType = parsed.subjectKey;
  const instance: LogicTerm = { kind: "var", name: "X", type: instanceType };
  const value: LogicTerm = {
    kind: "var",
    name: "V",
    type: parsed.comparison.valueType,
  };
  const ir: LogicRuleIR = {
    version: "kibi.logic.v1",
    kind: "rule",
    modality: "forbid",
    head: { kind: "atom", name: action, args: [instance] },
    body: {
      kind: "atom",
      namespace: parsed.subjectKey,
      name: parsed.propertyKey,
      args: [instance, value],
    },
    exceptions: [
      {
        kind: "compare",
        operator: parsed.comparison.operator,
        left: value,
        right: parsed.comparison.value,
      },
    ],
    variables: [
      { name: "X", type: instanceType },
      { name: "V", type: parsed.comparison.valueType },
    ],
    ...(scope ? { scope: { name: scope } } : {}),
  };
  return {
    kind: "rule",
    shape,
    evidence: text,
    action,
    subjectKey: parsed.subjectKey,
    propertyKey: parsed.propertyKey,
    scope,
    ir,
  };
}
