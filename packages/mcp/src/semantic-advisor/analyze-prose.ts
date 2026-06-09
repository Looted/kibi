import { createHash } from "node:crypto";
import type {
  SemanticAdvisorInput,
  SemanticAdvisorLane,
  SemanticAdvisorReadiness,
  SemanticAdvisorReceipt,
  SemanticAdvisorResult,
  SemanticModelingSuggestion,
  SemanticSignal,
  SemanticSignalKind,
  SemanticStrictPropertyClaim,
} from "./types.js";

export const SEMANTIC_ADVISOR_VERSION = "semantic-advisor-v1";

interface SignalPattern {
  kind: SemanticSignalKind;
  candidateLane: SemanticAdvisorLane;
  confidence: number;
  pattern: RegExp;
}

const SIGNAL_PATTERNS: SignalPattern[] = [
  {
    kind: "numeric_cardinality",
    candidateLane: "strict_property",
    confidence: 0.92,
    pattern:
      /\b(?:(?:at\s+most|at\s+least|exactly|no\s+more\s+than|up\s+to|cap(?:ped)?\s+at)\s+)?(?:\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\b/i,
  },
  {
    kind: "numeric_threshold",
    candidateLane: "strict_property",
    confidence: 0.86,
    pattern:
      /\b(?:maximum|minimum|under|within|below|above|expires?|retained\s+for)\s+(?:\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\b/i,
  },
  {
    kind: "conditional",
    candidateLane: "predicate",
    confidence: 0.82,
    pattern: /\b(?:if|when|unless|except|only\s+if|provided\s+that)\b/i,
  },
  {
    kind: "permission",
    candidateLane: "predicate",
    confidence: 0.8,
    pattern:
      /\b(?:only|may|can|allowed|denied|forbidden|must\s+not|cannot|can't)\b/i,
  },
  {
    kind: "state_or_default",
    candidateLane: "predicate",
    confidence: 0.74,
    pattern:
      /\b(?:state|mode|defaults?\s+to|ready|disabled|enabled|terminal)\b/i,
  },
  {
    kind: "normative_modal",
    candidateLane: "observation_review",
    confidence: 0.65,
    pattern: /\b(?:must|shall|should|may|must\s+not|cannot|can't)\b/i,
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function payloadHash(payload: Record<string, unknown>): string {
  const stable = Object.fromEntries(
    Object.entries(payload).filter(([key]) => !key.startsWith("_")),
  );
  return createHash("sha256").update(canonicalize(stable)).digest("hex");
}

function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function extractProse(payload: Record<string, unknown>): string {
  const properties = isRecord(payload.properties) ? payload.properties : {};
  return [properties.title, properties.text_ref, properties.description]
    .map(stringValue)
    .filter((value) => value.length > 0)
    .join("\n");
}

function extractStatement(payload: Record<string, unknown>): string {
  const properties = isRecord(payload.properties) ? payload.properties : {};
  const textRef = stringValue(properties.text_ref);
  if (textRef) return textRef;
  return stringValue(properties.title);
}

function extractSource(payload: Record<string, unknown>): string {
  const properties = isRecord(payload.properties) ? payload.properties : {};
  return stringValue(properties.source) || "mcp://kibi/semantic-advisor";
}

function relationshipTypes(payload: Record<string, unknown>): Set<string> {
  const relationships = Array.isArray(payload.relationships)
    ? payload.relationships
    : [];
  const types = new Set<string>();
  for (const relationship of relationships) {
    if (!isRecord(relationship)) continue;
    const type = stringValue(relationship.type);
    if (type) types.add(type);
  }
  return types;
}

function isRequirementPayload(payload: Record<string, unknown>): boolean {
  return stringValue(payload.type) === "req";
}

function hasModeledRelationships(payload: Record<string, unknown>): boolean {
  const types = relationshipTypes(payload);
  return (
    (types.has("constrains") && types.has("requires_property")) ||
    types.has("requires_predicate")
  );
}

function detectSignals(prose: string): SemanticSignal[] {
  const signals: SemanticSignal[] = [];
  const seen = new Set<SemanticSignalKind>();

  for (const signalPattern of SIGNAL_PATTERNS) {
    const match = prose.match(signalPattern.pattern);
    if (!match?.[0] || seen.has(signalPattern.kind)) continue;
    seen.add(signalPattern.kind);
    signals.push({
      kind: signalPattern.kind,
      evidence: match[0],
      candidate_lane: signalPattern.candidateLane,
      confidence: signalPattern.confidence,
    });
  }

  return signals;
}

function chooseLane(signals: SemanticSignal[]): SemanticAdvisorLane {
  if (
    signals.some(
      (signal) =>
        signal.kind === "numeric_cardinality" ||
        signal.kind === "numeric_threshold",
    )
  ) {
    return "strict_property";
  }
  if (
    signals.some(
      (signal) =>
        signal.kind === "conditional" ||
        signal.kind === "permission" ||
        signal.kind === "state_or_default",
    )
  ) {
    return "predicate";
  }
  if (signals.some((signal) => signal.kind === "normative_modal")) {
    return "observation_review";
  }
  return "none";
}

function suggestedTools(lane: SemanticAdvisorLane): string[] {
  if (lane === "strict_property") return ["kb_model_requirement"];
  if (lane === "predicate") return ["kb_suggest_predicates"];
  if (lane === "observation_review") {
    return ["kb_model_requirement", "kb_suggest_predicates"];
  }
  return [];
}

function ambiguityWitnesses(signals: SemanticSignal[]) {
  return signals
    .filter((signal) => signal.kind === "numeric_cardinality")
    .map((signal) => ({
      signal_kind: signal.kind,
      evidence: signal.evidence,
      interpretations: [
        "exactly",
        "at_most",
        "at_least",
        "named_membership",
        "illustrative_example",
      ],
      message:
        "Numeric cardinality prose can mean an exact count, an upper/lower bound, named membership, or an example; model it explicitly before relying on contradiction checks.",
    }));
}

const NUMBER_WORDS = new Map<string, number>([
  ["zero", 0],
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10],
]);

function parseNumberToken(value: string): number | null {
  const normalized = value.toLowerCase();
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return NUMBER_WORDS.get(normalized) ?? null;
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizePredicateToken(value: string): string {
  return value
    .trim()
    .replace(/\b(?:a|an|the)\b\s*/gi, "")
    .replace(/['’]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function singularize(value: string): string {
  if (["status", "results"].includes(value)) return value;
  return value.endsWith("s") && value.length > 3 ? value.slice(0, -1) : value;
}

function normalizeSubjectKey(value: string): string {
  return normalizeKey(value).split("_").map(singularize).join(".");
}

function titleFor(payload: Record<string, unknown>, fallback: string): string {
  const properties = isRecord(payload.properties) ? payload.properties : {};
  return stringValue(properties.title) || fallback;
}

function relationshipPlan(
  requirementId: string,
  factId: string,
  type: "requires_property" | "requires_predicate" | "constrains",
): Record<string, unknown> {
  return { type, from: requirementId, to: factId };
}

function buildStrictApplyPlan(
  payload: Record<string, unknown>,
  claim: SemanticStrictPropertyClaim,
): Array<Record<string, unknown>> {
  const reqId =
    stringValue(payload.id) || `REQ-SEMANTIC-${shortHash(claim.subject_key)}`;
  const source = extractSource(payload);
  const subjectId = `FACT-SUBJECT-${shortHash(claim.subject_key)}`;
  const propertyId = `FACT-PROP-${shortHash(`${claim.subject_key}.${claim.property_key}.${claim.operator}.${canonicalize(claim)}`)}`;
  return [
    {
      type: "fact",
      id: subjectId,
      properties: {
        title: `${claim.subject_key} subject`,
        status: "active",
        source,
        fact_kind: "subject",
        subject_key: claim.subject_key,
        canonical_key: claim.subject_key,
        tags: ["lane:strict", "semantic-advisor-suggestion"],
      },
      relationships: [],
    },
    {
      type: "fact",
      id: propertyId,
      properties: {
        title: `${claim.subject_key} ${claim.property_key}`,
        status: "active",
        source,
        fact_kind: "property_value",
        subject_key: claim.subject_key,
        property_key: claim.property_key,
        operator: claim.operator,
        value_type: claim.value_type,
        ...(claim.value_string !== undefined
          ? { value_string: claim.value_string }
          : {}),
        ...(claim.value_int !== undefined
          ? { value_int: claim.value_int }
          : {}),
        ...(claim.value_number !== undefined
          ? { value_number: claim.value_number }
          : {}),
        ...(claim.value_bool !== undefined
          ? { value_bool: claim.value_bool }
          : {}),
        ...(claim.unit ? { unit: claim.unit } : {}),
        canonical_key: `${claim.subject_key}.${claim.property_key}.${claim.operator}.${claim.value_string ?? claim.value_int ?? claim.value_number ?? claim.value_bool}`,
        tags: ["lane:strict", "semantic-advisor-suggestion"],
      },
      relationships: [],
    },
    {
      type: "req",
      id: reqId,
      properties: {
        title: titleFor(payload, "Semantic advisor requirement suggestion"),
        status: "open",
        source,
        text_ref: extractStatement(payload),
        tags: ["semantic-advisor-suggestion"],
      },
      relationships: [
        relationshipPlan(reqId, subjectId, "constrains"),
        relationshipPlan(reqId, propertyId, "requires_property"),
      ],
    },
  ];
}

function strictSuggestion(
  payload: Record<string, unknown>,
  evidence: string,
  claim: SemanticStrictPropertyClaim,
  rationale: string,
  confidence = 0.9,
): SemanticModelingSuggestion {
  return {
    kind: "strict_property",
    confidence,
    evidence,
    rationale,
    suggested_next_tool: "kb_model_requirement",
    claim,
    rejected_alternatives: ["predicate", "observation_review"],
    applyPlan: buildStrictApplyPlan(payload, claim),
  };
}

function buildPredicateApplyPlan(
  payload: Record<string, unknown>,
  predicate: {
    predicate_name: string;
    predicate_args: string[];
    canonical_key: string;
    polarity: "assert" | "deny";
  },
): Array<Record<string, unknown>> {
  const source = extractSource(payload);
  return [
    {
      type: "fact",
      id: `FACT-PRED-${shortHash(predicate.canonical_key)}`,
      properties: {
        title: `${predicate.predicate_name} suggestion`,
        status: "active",
        source,
        fact_kind: "predicate",
        predicate_name: predicate.predicate_name,
        predicate_args: predicate.predicate_args,
        canonical_key: predicate.canonical_key,
        polarity: predicate.polarity,
        tags: ["lane:ontology", "semantic-advisor-suggestion"],
      },
      relationships: [],
    },
  ];
}

function predicateSuggestion(
  payload: Record<string, unknown>,
  evidence: string,
  predicate: {
    predicate_name: string;
    predicate_args: string[];
    canonical_key: string;
    polarity: "assert" | "deny";
  },
  rationale: string,
): SemanticModelingSuggestion {
  const applyPlan = buildPredicateApplyPlan(payload, predicate);
  const reqId = stringValue(payload.id);
  const factId = stringValue(applyPlan[0]?.id);
  return {
    kind: "predicate",
    confidence: 0.84,
    evidence,
    rationale,
    suggested_next_tool: "kb_suggest_predicates",
    predicate,
    rejected_alternatives: ["strict_property"],
    applyPlan,
    relationshipPlan:
      reqId && factId
        ? {
            applyAfter: factId,
            requiresExistingReq: reqId,
            relationship: relationshipPlan(reqId, factId, "requires_predicate"),
          }
        : null,
  };
}

function observationApplyPlan(
  payload: Record<string, unknown>,
  title: string,
  tags: string[],
): Array<Record<string, unknown>> {
  const source = extractSource(payload);
  return [
    {
      type: "fact",
      id: `FACT-OBS-${shortHash(`${stringValue(payload.id)}.${title}.${extractStatement(payload)}`)}`,
      properties: {
        title,
        status: "active",
        source,
        fact_kind: "observation",
        text_ref: extractStatement(payload),
        tags,
      },
      relationships: [],
    },
  ];
}

function detectStrictPropertySuggestion(
  payload: Record<string, unknown>,
  statement: string,
): SemanticModelingSuggestion | null {
  const expiry = statement.match(
    /^(?<subject>.+?)\s+expir(?:e|es)\s+after\s+(?<value>\d+)\s+(?<unit>days?|months?|years?|hours?|minutes?)\.?$/i,
  );
  if (expiry?.groups?.subject && expiry.groups.value && expiry.groups.unit) {
    const unit = expiry.groups.unit.toLowerCase().replace(/s?$/, "s");
    return strictSuggestion(
      payload,
      `expire after ${expiry.groups.value} ${expiry.groups.unit}`,
      {
        subject_key: normalizeSubjectKey(expiry.groups.subject),
        property_key: `expiry_${unit}`,
        operator: "eq",
        value_type: "int",
        value_int: Number(expiry.groups.value),
        unit,
      },
      "Expiry duration is a scalar strict property and should be explicit.",
      0.88,
    );
  }

  const comparative = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<operator>less\s+than|greater\s+than|below|above|minimum|maximum|at\s+least|at\s+most)\s+(?<value>\d+)\.?$/i,
  );
  if (
    comparative?.groups?.subject &&
    comparative.groups.operator &&
    comparative.groups.value
  ) {
    const operatorText = comparative.groups.operator.toLowerCase();
    const operator = /less|below/.test(operatorText)
      ? "lt"
      : /greater|above/.test(operatorText)
        ? "gt"
        : /minimum|least/.test(operatorText)
          ? "gte"
          : "lte";
    return strictSuggestion(
      payload,
      `${comparative.groups.operator} ${comparative.groups.value}`,
      {
        subject_key: normalizeSubjectKey(comparative.groups.subject),
        property_key: "value",
        operator,
        value_type: "int",
        value_int: Number(comparative.groups.value),
      },
      "Comparative numeric prose is a strict property constraint.",
      0.86,
    );
  }

  const threshold = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+return\s+within\s+(?<value>\d+)\s+(?<unit>ms|milliseconds?|s|sec|secs|seconds?)\.?$/i,
  );
  if (
    threshold?.groups?.subject &&
    threshold.groups.value &&
    threshold.groups.unit
  ) {
    const unit = threshold.groups.unit.toLowerCase().startsWith("m")
      ? "ms"
      : "seconds";
    return strictSuggestion(
      payload,
      `within ${threshold.groups.value} ${threshold.groups.unit}`,
      {
        subject_key: normalizeSubjectKey(threshold.groups.subject),
        property_key: unit === "ms" ? "latency_ms" : "latency_seconds",
        operator: "lte",
        value_type: "int",
        value_int: Number(threshold.groups.value),
        unit,
      },
      "Response-time thresholds are bounded numeric properties and should be modeled explicitly.",
      0.88,
    );
  }

  const booleanState = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<state>enabled|disabled)\.?$/i,
  );
  if (booleanState?.groups?.subject && booleanState.groups.state) {
    const enabled = booleanState.groups.state.toLowerCase() === "enabled";
    return strictSuggestion(
      payload,
      `be ${booleanState.groups.state}`,
      {
        subject_key: normalizeSubjectKey(booleanState.groups.subject),
        property_key: "enabled",
        operator: "eq",
        value_type: "bool",
        value_bool: enabled,
      },
      "Enabled/disabled requirements are boolean properties and can participate in strict checks.",
      0.88,
    );
  }

  const retention = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+retained\s+for\s+(?<value>\d+)\s+(?<unit>days?|months?|years?)\.?$/i,
  );
  if (retention?.groups) {
    const subject = retention.groups.subject;
    const value = retention.groups.value;
    const unit = retention.groups.unit;
    if (subject && value && unit) {
      const normalizedUnit = unit.toLowerCase().replace(/s$/, "s");
      return strictSuggestion(
        payload,
        `retained for ${value} ${unit}`,
        {
          subject_key: normalizeSubjectKey(subject),
          property_key: `retention_${normalizedUnit}`,
          operator: "eq",
          value_type: "int",
          value_int: Number(value),
          unit: normalizedUnit,
        },
        "Retention duration is a scalar strict property and can participate in contradiction checks.",
        0.92,
      );
    }
  }

  const enumSet = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+one\s+of\s+(?<values>.+?)\.?$/i,
  );
  if (enumSet?.groups?.subject && enumSet.groups.values) {
    const values = enumSet.groups.values
      .split(/,|\bor\b/i)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (values.length > 1) {
      return strictSuggestion(
        payload,
        `one of ${enumSet.groups.values}`,
        {
          subject_key: normalizeSubjectKey(enumSet.groups.subject),
          property_key: "allowed_values",
          operator: "eq",
          value_type: "string",
          value_string: values.join("|"),
        },
        "Allowed enum sets are explicit property values and should not remain prose-only.",
        0.86,
      );
    }
  }

  const cardinality = statement.match(
    /\b(?<operator>at\s+most|at\s+least|exactly|no\s+more\s+than|up\s+to)\s+(?<value>\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<resource>[a-z][a-z\s_-]*?)\.?$/i,
  );
  if (cardinality?.groups) {
    const value = parseNumberToken(cardinality.groups.value ?? "");
    const resource = cardinality.groups.resource;
    const operatorText = cardinality.groups.operator;
    if (value !== null && resource && operatorText) {
      const operator = /at\s+least/i.test(operatorText)
        ? "gte"
        : /exactly/i.test(operatorText)
          ? "eq"
          : "lte";
      const normalizedResource = normalizeKey(resource);
      return strictSuggestion(
        payload,
        `${operatorText} ${cardinality.groups.value}`,
        {
          subject_key:
            singularize(
              normalizedResource.split("_").slice(-1)[0] ?? normalizedResource,
            ) === "session"
              ? "user.session"
              : normalizedResource.replace(/_/g, "."),
          property_key: normalizedResource.includes("active_session")
            ? "active_count"
            : "count",
          operator,
          value_type: "int",
          value_int: value,
        },
        "Bounded cardinality is a strict numeric property and should be modeled explicitly.",
        0.9,
      );
    }
  }

  const capped = statement.match(
    /^(?<subject>.+?)\s+cap(?:s|ped)?\s+at\s+(?:(?<property>[a-z][a-z\s_-]*?)\s+)?(?<value>\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\.?$/i,
  );
  if (capped?.groups?.subject && capped.groups.value) {
    const value = parseNumberToken(capped.groups.value);
    if (value !== null) {
      const propertyKey = capped.groups.property
        ? `${normalizeKey(capped.groups.property)}_cap`
        : "count";
      return strictSuggestion(
        payload,
        `cap at ${capped.groups.value}`,
        {
          subject_key: normalizeSubjectKey(capped.groups.subject),
          property_key: propertyKey,
          operator: "lte",
          value_type: "int",
          value_int: value,
        },
        "Cap-at prose is an upper-bound strict property and should be modeled explicitly.",
        0.9,
      );
    }
  }

  return null;
}

function detectPredicateSuggestion(
  payload: Record<string, unknown>,
  statement: string,
): SemanticModelingSuggestion | null {
  const disabledUntil = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)?\s*(?:stay|remain)?\s*disabled\s+until\s+(?<condition>.+?)\.?$/i,
  );
  if (disabledUntil?.groups?.subject && disabledUntil.groups.condition) {
    const subject = normalizeKey(disabledUntil.groups.subject);
    const condition = normalizePredicateToken(disabledUntil.groups.condition);
    const predicate = {
      predicate_name: "guard",
      predicate_args: [subject, condition, "disabled"],
      canonical_key: `guard(${subject},${condition},disabled)`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      disabledUntil[0],
      predicate,
      "Disabled-until prose defines a condition that guards behavior availability and should be queryable as a predicate.",
    );
  }

  const temporal = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<before>[a-z][a-z\s_-]*?)\s+before\s+(?<after>.+?)\.?$/i,
  );
  if (
    temporal?.groups?.subject &&
    temporal.groups.before &&
    temporal.groups.after
  ) {
    const subject = normalizeKey(temporal.groups.subject).replace(/_/g, ".");
    const beforeEvent = normalizePredicateToken(temporal.groups.before);
    const afterEvent = normalizePredicateToken(temporal.groups.after);
    const predicate = {
      predicate_name: "temporal_order",
      predicate_args: [subject, beforeEvent, afterEvent],
      canonical_key: `temporal_order(${subject},${beforeEvent},${afterEvent})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      temporal[0],
      predicate,
      "Before/after ordering is relational temporal logic and should be modeled as a predicate.",
    );
  }

  const conditional = statement.match(
    /^if\s+(?:(?:a|an|the)\s+)?(?<conditionSubject>[a-z][a-z_-]*)\s+(?<condition>.+?),\s*(?:it|they|the\s+[a-z][a-z\s_-]*?)\s+(?<behavior>.+?)\.?$/i,
  );
  if (
    conditional?.groups?.conditionSubject &&
    conditional.groups.condition &&
    conditional.groups.behavior
  ) {
    const subject = singularize(
      normalizeKey(conditional.groups.conditionSubject),
    );
    const condition = normalizePredicateToken(conditional.groups.condition);
    const behavior = normalizePredicateToken(conditional.groups.behavior);
    const predicate = {
      predicate_name: "conditional_behavior",
      predicate_args: [subject, condition, behavior],
      canonical_key: `conditional_behavior(${subject},${condition},${behavior})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      conditional[0],
      predicate,
      "If/then requirement prose is conditional behavior and should be queryable as a predicate.",
    );
  }

  const whenMust = statement.match(
    /^when\s+(?<condition>.+?),\s*(?:the\s+)?(?<subject>.+?)\s+(?:must|shall|should)\s+(?<behavior>.+?)\.?$/i,
  );
  if (whenMust?.groups?.condition && whenMust.groups.subject) {
    const subject = normalizeKey(whenMust.groups.subject);
    const condition = normalizePredicateToken(whenMust.groups.condition);
    const behavior = normalizePredicateToken(
      whenMust.groups.behavior ?? "behavior",
    );
    const predicate = {
      predicate_name: "conditional_behavior",
      predicate_args: [subject, condition, behavior],
      canonical_key: `conditional_behavior(${subject},${condition},${behavior})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      whenMust[0],
      predicate,
      "When/must prose is conditional behavior and should be queryable as a predicate.",
    );
  }

  const exception = statement.match(
    /^(?:the\s+)?(?<subject>[a-z][a-z\s_-]*?)\s+(?:must|shall|should)\s+(?<behavior>.+?)\s+unless\s+(?:the\s+)?(?<exception>.+?)\.?$/i,
  );
  if (
    exception?.groups?.subject &&
    exception.groups.behavior &&
    exception.groups.exception
  ) {
    const subject = normalizeSubjectKey(exception.groups.subject);
    const behavior = normalizePredicateToken(exception.groups.behavior);
    const exceptionCondition = normalizePredicateToken(
      exception.groups.exception,
    );
    const predicate = {
      predicate_name: "exception_rule",
      predicate_args: [subject, behavior, exceptionCondition],
      canonical_key: `exception_rule(${subject},${behavior},${exceptionCondition})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      exception[0],
      predicate,
      "Unless/except prose defines an explicit exception to required behavior and should be queryable as a predicate.",
    );
  }

  const mutualExclusion = statement.match(
    /^(?<left>.+?)\s+and\s+(?<right>.+?)\s+(?:must|shall|should)\s+be\s+mutually\s+exclusive\.?$/i,
  );
  if (mutualExclusion?.groups?.left && mutualExclusion.groups.right) {
    const left = normalizeKey(mutualExclusion.groups.left);
    const right = normalizeKey(mutualExclusion.groups.right);
    const predicate = {
      predicate_name: "mutual_exclusion",
      predicate_args: [left, right],
      canonical_key: `mutual_exclusion(${left},${right})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      mutualExclusion[0],
      predicate,
      "Mutual-exclusion prose is a relational constraint and should be queryable as a predicate.",
    );
  }

  const dependency = statement.match(
    /^(?<subject>.+?)\s+requires\s+(?<prerequisite>.+?)\s+before\s+(?<dependent>.+?)\.?$/i,
  );
  if (
    dependency?.groups?.subject &&
    dependency.groups.prerequisite &&
    dependency.groups.dependent
  ) {
    const subject = normalizeKey(dependency.groups.subject);
    const prerequisite = normalizePredicateToken(
      dependency.groups.prerequisite,
    );
    const dependent = normalizePredicateToken(dependency.groups.dependent);
    const predicate = {
      predicate_name: "dependency_rule",
      predicate_args: [subject, prerequisite, dependent],
      canonical_key: `dependency_rule(${subject},${prerequisite},${dependent})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      dependency[0],
      predicate,
      "Requires-before prose defines a prerequisite relationship and should be queryable as a predicate.",
    );
  }

  const ownership = statement.match(
    /^(?<resource>.+?)\s+(?:is|are)\s+owned\s+by\s+(?:the\s+)?(?<owner>.+?)\.?$/i,
  );
  if (ownership?.groups?.resource && ownership.groups.owner) {
    const resource = normalizeKey(ownership.groups.resource);
    const owner = normalizeKey(ownership.groups.owner);
    const predicate = {
      predicate_name: "ownership_rule",
      predicate_args: [resource, owner],
      canonical_key: `ownership_rule(${resource},${owner})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      ownership[0],
      predicate,
      "Ownership prose assigns responsibility for a resource or behavior and should be queryable as a predicate.",
    );
  }

  const retryPolicy = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+retry\s+up\s+to\s+(?<count>\d+)\s+(?<unit>times|attempts?)\.?$/i,
  );
  if (
    retryPolicy?.groups?.subject &&
    retryPolicy.groups.count &&
    retryPolicy.groups.unit
  ) {
    const subject = normalizeKey(retryPolicy.groups.subject);
    const count = retryPolicy.groups.count;
    const unit = normalizeKey(retryPolicy.groups.unit);
    const predicate = {
      predicate_name: "retry_policy",
      predicate_args: [subject, count, unit],
      canonical_key: `retry_policy(${subject},${count},${unit})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      retryPolicy[0],
      predicate,
      "Retry prose defines bounded recovery behavior and should be queryable as a predicate.",
    );
  }

  const escalationRule = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+escalate\s+to\s+(?<target>.+?)\s+after\s+(?<delay>\d+)\s+(?<unit>[a-z]+)\.?$/i,
  );
  if (
    escalationRule?.groups?.subject &&
    escalationRule.groups.target &&
    escalationRule.groups.delay &&
    escalationRule.groups.unit
  ) {
    const subject = normalizeKey(escalationRule.groups.subject);
    const target = normalizeKey(escalationRule.groups.target);
    const delay = escalationRule.groups.delay;
    const unit = normalizeKey(escalationRule.groups.unit);
    const predicate = {
      predicate_name: "escalation_rule",
      predicate_args: [subject, target, delay, unit],
      canonical_key: `escalation_rule(${subject},${target},${delay},${unit})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      escalationRule[0],
      predicate,
      "Escalation prose defines delayed handoff behavior and should be queryable as a predicate.",
    );
  }

  const availabilitySla = statement.match(
    /^(?<subject>.+?)\s+availability\s+(?:must|shall|should)\s+be\s+at\s+least\s+(?<threshold>\d+(?:\.\d+)?)\s+(?<unit>percent|%)\s+(?<window>[a-z]+)\.?$/i,
  );
  if (
    availabilitySla?.groups?.subject &&
    availabilitySla.groups.threshold &&
    availabilitySla.groups.unit &&
    availabilitySla.groups.window
  ) {
    const subject = normalizeKey(availabilitySla.groups.subject);
    const threshold = availabilitySla.groups.threshold;
    const unit =
      availabilitySla.groups.unit === "%"
        ? "percent"
        : normalizeKey(availabilitySla.groups.unit);
    const window = normalizeKey(availabilitySla.groups.window);
    const predicate = {
      predicate_name: "availability_sla",
      predicate_args: [subject, threshold, unit, window],
      canonical_key: `availability_sla(${subject},${threshold},${unit},${window})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      availabilitySla[0],
      predicate,
      "Availability SLA prose defines a service target over a window and should be queryable as a predicate.",
    );
  }

  const notificationRoute = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+notify\s+(?<recipient>.+?)\s+by\s+(?<channel>[a-z]+)\.?$/i,
  );
  if (
    notificationRoute?.groups?.subject &&
    notificationRoute.groups.recipient &&
    notificationRoute.groups.channel
  ) {
    const subject = normalizeKey(notificationRoute.groups.subject);
    const recipient = normalizeKey(notificationRoute.groups.recipient);
    const channel = normalizeKey(notificationRoute.groups.channel);
    const predicate = {
      predicate_name: "notification_route",
      predicate_args: [subject, recipient, channel],
      canonical_key: `notification_route(${subject},${recipient},${channel})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      notificationRoute[0],
      predicate,
      "Notification routing prose defines a recipient and channel and should be queryable as a predicate.",
    );
  }

  const idempotencyRule = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+idempotent\s+by\s+(?<key>.+?)\.?$/i,
  );
  if (idempotencyRule?.groups?.subject && idempotencyRule.groups.key) {
    const subject = normalizeKey(idempotencyRule.groups.subject);
    const key = normalizeKey(idempotencyRule.groups.key);
    const predicate = {
      predicate_name: "idempotency_rule",
      predicate_args: [subject, key],
      canonical_key: `idempotency_rule(${subject},${key})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      idempotencyRule[0],
      predicate,
      "Idempotency prose defines deduplication behavior and should be queryable as a predicate.",
    );
  }

  const deduplicated = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+deduplicated\s+to\s+prevent\s+redundant\s+requests\s+during\s+(?<key>.+?)\.?$/i,
  );
  if (deduplicated?.groups?.subject && deduplicated.groups.key) {
    const subject = normalizeKey(deduplicated.groups.subject);
    const key = normalizeKey(deduplicated.groups.key);
    const predicate = {
      predicate_name: "idempotency_rule",
      predicate_args: [subject, key],
      canonical_key: `idempotency_rule(${subject},${key})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      deduplicated[0],
      predicate,
      "Deduplication prose defines idempotent handling of repeated or concurrent operations and should be queryable as a predicate.",
    );
  }

  const dataResidencyRule = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?:stored|processed|kept)\s+in\s+(?:the\s+)?(?<region>.+?\b(?:region|jurisdiction|country|zone|area))\.?$/i,
  );
  if (dataResidencyRule?.groups?.subject && dataResidencyRule.groups.region) {
    const subject = normalizeKey(dataResidencyRule.groups.subject);
    const region = normalizeKey(dataResidencyRule.groups.region);
    const predicate = {
      predicate_name: "data_residency_rule",
      predicate_args: [subject, region],
      canonical_key: `data_residency_rule(${subject},${region})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      dataResidencyRule[0],
      predicate,
      "Data residency prose defines regional storage or processing constraints and should be queryable as a predicate.",
    );
  }

  const auditEventRule = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?:recorded|logged|audited)\s+in\s+(?:the\s+)?(?<log>audit\s+(?:log|trail))\.?$/i,
  );
  if (auditEventRule?.groups?.subject && auditEventRule.groups.log) {
    const subject = normalizeKey(auditEventRule.groups.subject);
    const log = normalizeKey(auditEventRule.groups.log);
    const predicate = {
      predicate_name: "audit_event_rule",
      predicate_args: [subject, log],
      canonical_key: `audit_event_rule(${subject},${log})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      auditEventRule[0],
      predicate,
      "Audit logging prose defines durable audit evidence and should be queryable as a predicate.",
    );
  }

  const consentRule = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+require\s+(?<consent>.+?consent)\s+before\s+(?<purpose>.+?)\.?$/i,
  );
  if (
    consentRule?.groups?.subject &&
    consentRule.groups.consent &&
    consentRule.groups.purpose
  ) {
    const subject = normalizeKey(consentRule.groups.subject);
    const consent = normalizeKey(consentRule.groups.consent);
    const purpose = normalizePredicateToken(consentRule.groups.purpose);
    const predicate = {
      predicate_name: "consent_rule",
      predicate_args: [subject, consent, purpose],
      canonical_key: `consent_rule(${subject},${consent},${purpose})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      consentRule[0],
      predicate,
      "Consent prose defines a privacy prerequisite and should be queryable as a predicate.",
    );
  }

  const lifecycleRule = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<action>archived|deleted|expired)\s+after\s+(?<duration>\d+)\s+(?<unit>[a-z]+)\.?$/i,
  );
  if (
    lifecycleRule?.groups?.subject &&
    lifecycleRule.groups.action &&
    lifecycleRule.groups.duration &&
    lifecycleRule.groups.unit
  ) {
    const subject = normalizeKey(lifecycleRule.groups.subject);
    const action = normalizeKey(lifecycleRule.groups.action);
    const duration = lifecycleRule.groups.duration;
    const unit = normalizeKey(lifecycleRule.groups.unit);
    const predicate = {
      predicate_name: "lifecycle_rule",
      predicate_args: [subject, action, duration, unit],
      canonical_key: `lifecycle_rule(${subject},${action},${duration},${unit})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      lifecycleRule[0],
      predicate,
      "Lifecycle prose defines archive/delete/expiry behavior over time and should be queryable as a predicate.",
    );
  }

  const conflictResolutionRule = statement.match(
    /^when\s+(?<subject>.+?)\s+conflicts?,\s+(?:the\s+)?(?<strategy>.+?)\.?$/i,
  );
  if (
    conflictResolutionRule?.groups?.subject &&
    conflictResolutionRule.groups.strategy
  ) {
    const subject = normalizeKey(conflictResolutionRule.groups.subject);
    const strategy = normalizePredicateToken(
      conflictResolutionRule.groups.strategy,
    );
    const predicate = {
      predicate_name: "conflict_resolution_rule",
      predicate_args: [subject, strategy],
      canonical_key: `conflict_resolution_rule(${subject},${strategy})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      conflictResolutionRule[0],
      predicate,
      "Conflict-resolution prose defines synchronization merge behavior and should be queryable as a predicate.",
    );
  }

  const fallbackRule = statement.match(
    /^if\s+(?<condition>.+?),\s+(?<subject>.+?)\s+(?:must|shall|should)\s+fall\s+back\s+to\s+(?<target>.+?)\.?$/i,
  );
  if (
    fallbackRule?.groups?.condition &&
    fallbackRule.groups.subject &&
    fallbackRule.groups.target
  ) {
    const condition = normalizePredicateToken(fallbackRule.groups.condition);
    const subject = normalizeKey(fallbackRule.groups.subject);
    const target = normalizePredicateToken(fallbackRule.groups.target);
    const predicate = {
      predicate_name: "fallback_rule",
      predicate_args: [condition, subject, target],
      canonical_key: `fallback_rule(${condition},${subject},${target})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      fallbackRule[0],
      predicate,
      "Fallback prose defines degraded behavior under a condition and should be queryable as a predicate.",
    );
  }

  const batchOperationRule = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+process\s+(?<resource>.+?)\s+in\s+batches\s+of\s+(?<size>\d+)\.?$/i,
  );
  if (
    batchOperationRule?.groups?.subject &&
    batchOperationRule.groups.resource &&
    batchOperationRule.groups.size
  ) {
    const subject = normalizeKey(batchOperationRule.groups.subject);
    const resource = normalizeKey(batchOperationRule.groups.resource);
    const size = batchOperationRule.groups.size;
    const predicate = {
      predicate_name: "batch_operation_rule",
      predicate_args: [subject, resource, size],
      canonical_key: `batch_operation_rule(${subject},${resource},${size})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      batchOperationRule[0],
      predicate,
      "Batching prose defines bounded bulk-processing behavior and should be queryable as a predicate.",
    );
  }

  const consistencyRule = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+reference\s+(?<target>an?\s+existing\s+.+?)\.?$/i,
  );
  if (consistencyRule?.groups?.subject && consistencyRule.groups.target) {
    const subject = normalizeKey(consistencyRule.groups.subject);
    const target = normalizePredicateToken(consistencyRule.groups.target);
    const predicate = {
      predicate_name: "consistency_rule",
      predicate_args: [subject, target],
      canonical_key: `consistency_rule(${subject},${target})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      consistencyRule[0],
      predicate,
      "Consistency prose defines reference integrity and should be queryable as a predicate.",
    );
  }

  const buildConstraint = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<property>deterministic)\s+at\s+(?<scope>build\s+time)\.?$/i,
  );
  if (buildConstraint?.groups?.subject) {
    const subject = normalizeKey(buildConstraint.groups.subject);
    const property = normalizePredicateToken(
      buildConstraint.groups.property ?? "property",
    );
    const scope = normalizePredicateToken(
      buildConstraint.groups.scope ?? "scope",
    );
    const predicate = {
      predicate_name: "build_constraint",
      predicate_args: [subject, property, scope],
      canonical_key: `build_constraint(${subject},${property},${scope})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      buildConstraint[0],
      predicate,
      "Build-time prose defines deterministic generation or deployment constraints and should be queryable as a predicate.",
    );
  }

  const environmentSafety = statement.match(
    /^(?<action>.+?)\s+(?:must|shall|should)\s+be\s+(?<decision>forbidden|read-only|allowed)\s+in\s+(?<environment>production|staging|development)\.?$/i,
  );
  if (
    environmentSafety?.groups?.action &&
    environmentSafety.groups.environment
  ) {
    const action = normalizeKey(environmentSafety.groups.action);
    const decision = normalizePredicateToken(
      environmentSafety.groups.decision ?? "decision",
    );
    const environment = normalizeKey(environmentSafety.groups.environment);
    const predicate = {
      predicate_name: "environment_safety_rule",
      predicate_args: [action, decision, environment],
      canonical_key: `environment_safety_rule(${action},${decision},${environment})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      environmentSafety[0],
      predicate,
      "Environment safety prose defines action permissions by deployment environment and should be queryable as a predicate.",
    );
  }

  const schemaInvariant = statement.match(
    /^(?<field>.+?)\s+(?:must|shall|should)\s+be\s+(?<kind>immutable)\s+after\s+(?<scope>.+?)\.?$/i,
  );
  if (schemaInvariant?.groups?.field && schemaInvariant.groups.scope) {
    const field = normalizeKey(schemaInvariant.groups.field);
    const kind = normalizePredicateToken(
      schemaInvariant.groups.kind ?? "invariant",
    );
    const scope = normalizePredicateToken(
      `after ${schemaInvariant.groups.scope}`,
    );
    const predicate = {
      predicate_name: "schema_invariant_rule",
      predicate_args: [field, kind, scope],
      canonical_key: `schema_invariant_rule(${field},${kind},${scope})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      schemaInvariant[0],
      predicate,
      "Schema invariant prose defines a field-level invariant and should be queryable as a predicate.",
    );
  }

  const codingStandard = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+(?<action>use|avoid)\s+(?<target>.+?)\.?$/i,
  );
  if (
    codingStandard?.groups?.subject &&
    codingStandard.groups.target &&
    /\b(?:api|apis|code|component|computed|framework|hook|pattern|signal|schema|type)\b/i.test(
      statement,
    )
  ) {
    const subject = normalizeKey(codingStandard.groups.subject);
    const action = normalizePredicateToken(
      codingStandard.groups.action ?? "action",
    );
    const target = normalizePredicateToken(codingStandard.groups.target);
    const predicate = {
      predicate_name: "coding_standard_rule",
      predicate_args: [subject, action, target],
      canonical_key: `coding_standard_rule(${subject},${action},${target})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      codingStandard[0],
      predicate,
      "Coding-standard prose defines developer-facing API or pattern requirements and should be queryable as a predicate.",
    );
  }

  const migrationBoundary = statement.match(
    /^(?<subject>.+?)\s+may\s+only\s+be\s+(?<action>read)\s+as\s+(?<scope>migration\s+input)(?:\s+by\s+.+?)?\.?$/i,
  );
  if (migrationBoundary?.groups?.subject && migrationBoundary.groups.scope) {
    const subject = normalizeKey(migrationBoundary.groups.subject);
    const action = normalizePredicateToken(
      migrationBoundary.groups.action ?? "action",
    );
    const scope = normalizePredicateToken(migrationBoundary.groups.scope);
    const predicate = {
      predicate_name: "migration_boundary_rule",
      predicate_args: [subject, action, scope],
      canonical_key: `migration_boundary_rule(${subject},${action},${scope})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      migrationBoundary[0],
      predicate,
      "Migration-boundary prose defines legacy input usage limits and should be queryable as a predicate.",
    );
  }

  const absenceRequirement = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<state>absent|removed)\.?$/i,
  );
  if (absenceRequirement?.groups?.subject && absenceRequirement.groups.state) {
    const subject = normalizePredicateToken(absenceRequirement.groups.subject);
    const state = normalizePredicateToken(absenceRequirement.groups.state);
    const predicate = {
      predicate_name: "absence_requirement",
      predicate_args: [subject, state],
      canonical_key: `absence_requirement(${subject},${state})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      absenceRequirement[0],
      predicate,
      "Absence prose defines negative existence requirements and should be queryable as a predicate.",
    );
  }

  const declarativeAbsence = statement.match(/^no\s+(?<subject>.+?)\.?$/i);
  if (declarativeAbsence?.groups?.subject) {
    const subject = normalizePredicateToken(declarativeAbsence.groups.subject);
    const predicate = {
      predicate_name: "absence_requirement",
      predicate_args: [subject, "absent"],
      canonical_key: `absence_requirement(${subject},absent)`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      declarativeAbsence[0],
      predicate,
      "Declarative no-X prose defines a negative existence requirement and should be queryable as a predicate.",
    );
  }

  const offlineBehavior = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<behavior>non-blocking|resilient)\s+during\s+(?<condition>offline\s+conditions)\.?$/i,
  );
  if (offlineBehavior?.groups?.subject && offlineBehavior.groups.condition) {
    const subject = normalizeKey(offlineBehavior.groups.subject);
    const behavior = normalizePredicateToken(
      offlineBehavior.groups.behavior ?? "behavior",
    );
    const condition = normalizePredicateToken(offlineBehavior.groups.condition);
    const predicate = {
      predicate_name: "offline_behavior_rule",
      predicate_args: [subject, behavior, condition],
      canonical_key: `offline_behavior_rule(${subject},${behavior},${condition})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      offlineBehavior[0],
      predicate,
      "Offline behavior prose defines resilient/non-blocking behavior under offline conditions and should be queryable as a predicate.",
    );
  }

  const releaseGate = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+pass\s+(?<gate>.+?)\s+before\s+(?<target>.+?)\.?$/i,
  );
  if (
    releaseGate?.groups?.subject &&
    releaseGate.groups.target &&
    /\b(?:app store|build|deployment|distribution|release|testflight)\b/i.test(
      statement,
    )
  ) {
    const subject = normalizeKey(releaseGate.groups.subject);
    const gate = normalizePredicateToken(releaseGate.groups.gate ?? "gate");
    const target = normalizeKey(releaseGate.groups.target);
    const predicate = {
      predicate_name: "release_gate_rule",
      predicate_args: [subject, gate, target],
      canonical_key: `release_gate_rule(${subject},${gate},${target})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      releaseGate[0],
      predicate,
      "Release-gate prose defines required gates before distribution or deployment and should be queryable as a predicate.",
    );
  }

  const platformConsistency = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+synchronize\s+across\s+(?<platforms>.+?)\.?$/i,
  );
  if (
    platformConsistency?.groups?.subject &&
    platformConsistency.groups.platforms
  ) {
    const subject = normalizeKey(platformConsistency.groups.subject);
    const platforms = platformConsistency.groups.platforms
      .split(/,|\band\b/i)
      .map((part) => normalizeKey(part.trim()))
      .filter((part) => part.length > 0)
      .join(",");
    const predicate = {
      predicate_name: "platform_consistency_rule",
      predicate_args: [subject, platforms],
      canonical_key: `platform_consistency_rule(${subject},${platforms})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      platformConsistency[0],
      predicate,
      "Platform consistency prose defines synchronization across platforms and should be queryable as a predicate.",
    );
  }

  const preservationRule = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+preserve\s+(?<preserved>.+?)\s+when\s+(?:the\s+)?(?<condition>.+?)\.?$/i,
  );
  if (preservationRule?.groups?.subject && preservationRule.groups.condition) {
    const subject = normalizeKey(preservationRule.groups.subject);
    const preserved = normalizeKey(
      preservationRule.groups.preserved ?? "preserved",
    );
    const condition = normalizePredicateToken(
      preservationRule.groups.condition,
    );
    const predicate = {
      predicate_name: "preservation_rule",
      predicate_args: [subject, preserved, condition],
      canonical_key: `preservation_rule(${subject},${preserved},${condition})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      preservationRule[0],
      predicate,
      "Preservation prose defines data preserved across deletion/removal boundaries and should be queryable as a predicate.",
    );
  }

  const abstractionBoundary = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+persisted\s+as\s+(?<contract>.+?)\.?$/i,
  );
  if (
    abstractionBoundary?.groups?.subject &&
    abstractionBoundary.groups.contract &&
    /\b(?:neutral|contract|renderer|runtime|vendor)\b/i.test(statement)
  ) {
    const subject = normalizeKey(abstractionBoundary.groups.subject);
    const contract = normalizePredicateToken(
      abstractionBoundary.groups.contract,
    );
    const predicate = {
      predicate_name: "abstraction_boundary_rule",
      predicate_args: [subject, "persisted_as", contract],
      canonical_key: `abstraction_boundary_rule(${subject},persisted_as,${contract})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      abstractionBoundary[0],
      predicate,
      "Abstraction-boundary prose defines renderer/vendor-neutral persistence or contract constraints and should be queryable as a predicate.",
    );
  }

  const securityConfiguration = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+have\s+explicit\s+(?<setting>[A-Za-z0-9_.-]+)\s+(?<value>[A-Za-z0-9_.-]+)\.?$/i,
  );
  if (
    securityConfiguration?.groups?.subject &&
    securityConfiguration.groups.setting &&
    securityConfiguration.groups.value &&
    /\b(?:database|deployment|function|rpc|search_path|security|trigger)\b/i.test(
      statement,
    )
  ) {
    const subject = normalizeKey(securityConfiguration.groups.subject);
    const setting = normalizeKey(securityConfiguration.groups.setting);
    const value = normalizeKey(securityConfiguration.groups.value);
    const predicate = {
      predicate_name: "security_configuration_rule",
      predicate_args: [subject, setting, value],
      canonical_key: `security_configuration_rule(${subject},${setting},${value})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      securityConfiguration[0],
      predicate,
      "Security-configuration prose defines explicit infrastructure or database settings and should be queryable as a predicate.",
    );
  }

  const orderedStrategy = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+use\s+(?<kind>.+?)\s+in\s+priority\s+order\s+(?<values>.+?)\.?$/i,
  );
  if (orderedStrategy?.groups?.subject && orderedStrategy.groups.values) {
    const subject = normalizeKey(orderedStrategy.groups.subject);
    const kind = normalizeKey(orderedStrategy.groups.kind ?? "strategy");
    const values = orderedStrategy.groups.values
      .split(/,|>/)
      .map((value) => normalizePredicateToken(value))
      .filter((value) => value.length > 0)
      .join(",");
    const predicate = {
      predicate_name: "ordered_strategy_rule",
      predicate_args: [subject, kind, values],
      canonical_key: `ordered_strategy_rule(${subject},${kind},${values})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      orderedStrategy[0],
      predicate,
      "Ordered-strategy prose defines a required priority order and should be queryable as a predicate.",
    );
  }

  const refreshPolicy = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+automatically\s+refresh\s+(?<target>.+?)\s+without\s+requiring\s+manual\s+page\s+reload\.?$/i,
  );
  if (refreshPolicy?.groups?.subject && refreshPolicy.groups.target) {
    const subject = normalizeKey(refreshPolicy.groups.subject);
    const target = normalizeKey(refreshPolicy.groups.target);
    const predicate = {
      predicate_name: "refresh_policy_rule",
      predicate_args: [subject, target, "automatic"],
      canonical_key: `refresh_policy_rule(${subject},${target},automatic)`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      refreshPolicy[0],
      predicate,
      "Refresh-policy prose defines automatic refresh behavior and should be queryable as a predicate.",
    );
  }

  const scopedAuthorization = statement.match(
    /^(?<actor>.+?)\s+(?:must|shall|should)\s+be\s+denied\s+(?<action>.+?)\.?$/i,
  );
  if (
    scopedAuthorization?.groups?.actor &&
    scopedAuthorization.groups.action &&
    /\b(?:assigned|unassigned|owner|member|scoped)\b/i.test(statement)
  ) {
    const actor = normalizeKey(scopedAuthorization.groups.actor);
    const action = normalizeKey(scopedAuthorization.groups.action);
    const predicate = {
      predicate_name: "scoped_authorization_rule",
      predicate_args: [actor, action, "deny"],
      canonical_key: `scoped_authorization_rule(${actor},${action},deny)`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      scopedAuthorization[0],
      predicate,
      "Scoped-authorization prose defines assignment/ownership-qualified authorization and should be queryable as a predicate.",
    );
  }

  const documentationStandard = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+documented\s+in\s+(?<artifact>.+?)\.?$/i,
  );
  if (
    documentationStandard?.groups?.subject &&
    documentationStandard.groups.artifact
  ) {
    const subject = normalizeKey(documentationStandard.groups.subject);
    const artifact = normalizeKey(documentationStandard.groups.artifact);
    const predicate = {
      predicate_name: "documentation_standard_rule",
      predicate_args: [subject, "documented_in", artifact],
      canonical_key: `documentation_standard_rule(${subject},documented_in,${artifact})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      documentationStandard[0],
      predicate,
      "Documentation-standard prose defines required documentation artifacts and should be queryable as a predicate.",
    );
  }

  const warmupPolicy = statement.match(
    /^(?:the\s+)?(?<subject>.+?)\s+(?:must|shall|should)\s+warm\s+up\s+on\s+(?<trigger>.+?)\.?$/i,
  );
  if (warmupPolicy?.groups?.subject && warmupPolicy.groups.trigger) {
    const subject = normalizeKey(warmupPolicy.groups.subject);
    const trigger = normalizeKey(warmupPolicy.groups.trigger);
    const predicate = {
      predicate_name: "warmup_policy_rule",
      predicate_args: [subject, trigger],
      canonical_key: `warmup_policy_rule(${subject},${trigger})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      warmupPolicy[0],
      predicate,
      "Warmup-policy prose defines a required warmup trigger and should be queryable as a predicate.",
    );
  }

  const visualLayout = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+remain\s+visually\s+aligned\s+with\s+(?<target>.+?)\.?$/i,
  );
  if (visualLayout?.groups?.subject && visualLayout.groups.target) {
    const subject = normalizeKey(visualLayout.groups.subject);
    const target = normalizeKey(visualLayout.groups.target);
    const predicate = {
      predicate_name: "visual_layout_rule",
      predicate_args: [subject, "aligned_with", target],
      canonical_key: `visual_layout_rule(${subject},aligned_with,${target})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      visualLayout[0],
      predicate,
      "Visual-layout prose defines UI alignment requirements and should be queryable as a predicate.",
    );
  }

  const enforcementLocation = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+enforced\s+at\s+(?<location>.+?)\.?$/i,
  );
  if (
    enforcementLocation?.groups?.subject &&
    enforcementLocation.groups.location
  ) {
    const subject = normalizeKey(enforcementLocation.groups.subject);
    const location = normalizeKey(enforcementLocation.groups.location);
    const predicate = {
      predicate_name: "enforcement_location_rule",
      predicate_args: [subject, location],
      canonical_key: `enforcement_location_rule(${subject},${location})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      enforcementLocation[0],
      predicate,
      "Enforcement-location prose defines the layer where a constraint is enforced and should be queryable as a predicate.",
    );
  }

  const reconciliation = statement.match(
    /^on\s+(?<trigger>.+?),\s*(?<subject>.+?)\s+(?:must|shall|should)\s+reconcile\s+(?<target>.+?)\s+and\s+(?<action>clear\s+stale\s+.+?)\.?$/i,
  );
  if (reconciliation?.groups?.subject && reconciliation.groups.target) {
    const subject = normalizeKey(reconciliation.groups.subject);
    const trigger = normalizeKey(reconciliation.groups.trigger ?? "trigger");
    const target = normalizeKey(reconciliation.groups.target);
    const action = normalizeKey(reconciliation.groups.action ?? "action");
    const predicate = {
      predicate_name: "reconciliation_rule",
      predicate_args: [subject, trigger, target, action],
      canonical_key: `reconciliation_rule(${subject},${trigger},${target},${action})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      reconciliation[0],
      predicate,
      "Reconciliation prose defines trigger-based cleanup of stale records and should be queryable as a predicate.",
    );
  }

  const throttlePolicy = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+throttled\s+for\s+(?<condition>.+?)\.?$/i,
  );
  if (throttlePolicy?.groups?.subject && throttlePolicy.groups.condition) {
    const subject = normalizeKey(throttlePolicy.groups.subject);
    const condition = normalizePredicateToken(throttlePolicy.groups.condition);
    const predicate = {
      predicate_name: "throttle_policy_rule",
      predicate_args: [subject, condition],
      canonical_key: `throttle_policy_rule(${subject},${condition})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      throttlePolicy[0],
      predicate,
      "Throttle-policy prose defines throttling behavior under high-frequency conditions and should be queryable as a predicate.",
    );
  }

  const initializesAfter = statement.match(
    /^(?:the\s+)?(?<subject>.+?)\s+initializes\s+after\s+(?:the\s+)?(?<ready>.+?)\s+is\s+ready\.?$/i,
  );
  if (initializesAfter?.groups?.subject && initializesAfter.groups.ready) {
    const subject = normalizeKey(initializesAfter.groups.subject);
    const ready = `${normalizeKey(initializesAfter.groups.ready)}_ready`;
    const predicate = {
      predicate_name: "temporal_order",
      predicate_args: [subject, ready, "initializes"],
      canonical_key: `temporal_order(${subject},${ready},initializes)`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      initializesAfter[0],
      predicate,
      "Initializes-after prose defines temporal readiness ordering and should be queryable as a predicate.",
    );
  }

  const transition = statement.match(
    /^when\s+(?<trigger>.+?),\s*(?:the\s+)?(?<subject>[a-z][a-z\s_-]*?)\s+transitions?\s+from\s+(?<from>[a-z][a-z0-9_-]*)\s+to\s+(?<to>[a-z][a-z0-9_-]*)\.?$/i,
  );
  if (
    transition?.groups?.subject &&
    transition.groups.from &&
    transition.groups.to &&
    transition.groups.trigger
  ) {
    const subject = normalizeSubjectKey(transition.groups.subject);
    const from = normalizePredicateToken(transition.groups.from);
    const to = normalizePredicateToken(transition.groups.to);
    const trigger = normalizePredicateToken(transition.groups.trigger);
    const predicate = {
      predicate_name: "state_transition",
      predicate_args: [subject, from, to, trigger],
      canonical_key: `state_transition(${subject},${from},${to},${trigger})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      transition[0],
      predicate,
      "State transitions have source state, target state, and trigger; model them as predicate facts.",
    );
  }

  const prohibition = statement.match(
    /^(?<actor>[a-z][a-z\s_-]*?)\s+(?:must\s+not|cannot|can't|is\s+forbidden\s+to)\s+(?<action>[a-z][a-z_-]*)\s+(?<resource>.+?)\.?$/i,
  );
  if (
    prohibition?.groups?.actor &&
    prohibition.groups.action &&
    prohibition.groups.resource
  ) {
    const actor = singularize(normalizeKey(prohibition.groups.actor));
    const action = normalizePredicateToken(prohibition.groups.action);
    const resource = normalizePredicateToken(prohibition.groups.resource);
    const predicate = {
      predicate_name: "permission_rule",
      predicate_args: [actor, action, resource, "deny"],
      canonical_key: `permission_rule(${actor},${action},${resource},deny)`,
      polarity: "deny" as const,
    };
    return predicateSuggestion(
      payload,
      prohibition[0],
      predicate,
      "Prohibitions are negative permission rules and should preserve deny polarity.",
    );
  }

  const uniqueness = statement.match(
    /^(?:there\s+)?(?:must|shall|should)\s+be\s+at\s+most\s+one\s+(?<subject>[a-z][a-z\s_-]*?)\s+per\s+(?<scope>.+?)\.?$/i,
  );
  if (uniqueness?.groups?.subject && uniqueness.groups.scope) {
    const subject = normalizeKey(uniqueness.groups.subject);
    const scope = uniqueness.groups.scope
      .split(/\s+per\s+/i)
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .join(",");
    const normalizedScope = scope
      .split(",")
      .map((part) => normalizePredicateToken(part))
      .join(",");
    const predicate = {
      predicate_name: "uniqueness_constraint",
      predicate_args: [subject, normalizedScope],
      canonical_key: `uniqueness_constraint(${subject},${normalizedScope})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      uniqueness[0],
      predicate,
      "Per-scope uniqueness is relational and should be modeled as a predicate rather than a generic count.",
    );
  }

  const defaultValue = statement.match(
    /^(?:the\s+)?(?<subject>[a-z][a-z\s_-]*?)\s+defaults?\s+to\s+(?<value>[a-z][a-z0-9\s_-]*?)(?:\s+(?<property>mode|state|status))?\.?$/i,
  );
  if (defaultValue?.groups?.subject && defaultValue.groups.value) {
    const subject = normalizeSubjectKey(defaultValue.groups.subject);
    const property = normalizeKey(defaultValue.groups.property ?? "value");
    const value = normalizeKey(defaultValue.groups.value);
    const predicate = {
      predicate_name: "default_value",
      predicate_args: [subject, property, value],
      canonical_key: `default_value(${subject},${property},${value})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      defaultValue[0],
      predicate,
      "Defaults are relational product behavior and should be explicit ontology predicates.",
    );
  }

  const stateMembership = statement.match(
    /^(?<subject>.+?)\s+(?:terminal\s+)?states\s+are\s+(?<states>.+?)\.?$/i,
  );
  if (stateMembership?.groups?.subject && stateMembership.groups.states) {
    const subject = normalizeSubjectKey(stateMembership.groups.subject);
    const states = stateMembership.groups.states
      .split(/,|\band\b|\bor\b/i)
      .map((state) => state.trim())
      .filter((state) => state.length > 0)
      .map(normalizePredicateToken)
      .join(",");
    if (states) {
      const predicate = {
        predicate_name: "state_membership",
        predicate_args: [subject, states],
        canonical_key: `state_membership(${subject},${states})`,
        polarity: "assert" as const,
      };
      return predicateSuggestion(
        payload,
        stateMembership[0],
        predicate,
        "State sets are relational workflow constraints and should be queryable as predicate facts.",
      );
    }
  }

  const rateLimit = statement.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+rate\s+limited\s+to\s+(?<count>\d+)\s+(?<action>[a-z][a-z\s_-]*?)\s+per\s+(?<window>[a-z]+)\.?$/i,
  );
  if (
    rateLimit?.groups?.subject &&
    rateLimit.groups.count &&
    rateLimit.groups.action &&
    rateLimit.groups.window
  ) {
    const subject = `${normalizeKey(rateLimit.groups.subject).replace(/_requests?$/, "")}.request`;
    const action = normalizePredicateToken(rateLimit.groups.action);
    const window = normalizePredicateToken(rateLimit.groups.window);
    const count = rateLimit.groups.count;
    const predicate = {
      predicate_name: "rate_limit",
      predicate_args: [subject, action, window, count],
      canonical_key: `rate_limit(${subject},${action},${window},${count})`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      rateLimit[0],
      predicate,
      "Rate limits are bounded action-window constraints and now map to the production rate_limit predicate.",
    );
  }

  const permission = statement.match(
    /^only\s+(?<actor>[a-z][a-z\s_-]*?)\s+can\s+(?<action>[a-z][a-z_-]*)\s+(?<resource>.+?)(?:\s+when\s+.+)?\.?$/i,
  );
  if (
    permission?.groups?.actor &&
    permission.groups.action &&
    permission.groups.resource
  ) {
    const actor = singularize(normalizeKey(permission.groups.actor));
    const action = normalizeKey(permission.groups.action);
    const resource = normalizeKey(permission.groups.resource);
    const predicate = {
      predicate_name: "permission_rule",
      predicate_args: [actor, action, resource, "assert"],
      canonical_key: `permission_rule(${actor},${action},${resource},assert)`,
      polarity: "assert" as const,
    };
    return predicateSuggestion(
      payload,
      permission[0],
      predicate,
      "Actor/action/resource permission prose is better represented as an ontology predicate than a scalar property.",
    );
  }
  return null;
}

function detectAmbiguitySuggestion(
  payload: Record<string, unknown>,
  statement: string,
): SemanticModelingSuggestion | null {
  const ambiguous = statement.match(
    /\b(?<value>\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<resource>active\s+sessions?|sessions?)\b/i,
  );
  if (
    !ambiguous?.groups?.value ||
    /at\s+most|at\s+least|exactly|no\s+more\s+than|up\s+to/i.test(statement)
  ) {
    return null;
  }
  return {
    kind: "ambiguity_observation",
    confidence: 0.78,
    evidence: `${ambiguous.groups.value} ${ambiguous.groups.resource}`,
    rationale:
      "Cardinality without an explicit operator is ambiguous and should be clarified before strict modeling.",
    ambiguity: ["exactly", "at_most", "at_least", "illustrative_example"],
    suggested_next_tool: "kb_model_requirement",
    applyPlan: observationApplyPlan(
      payload,
      "Ambiguous cardinality requirement",
      ["semantic-advisor-suggestion", "review:ambiguity"],
    ),
  };
}

function detectOntologyGapSuggestion(
  payload: Record<string, unknown>,
  statement: string,
): SemanticModelingSuggestion | null {
  const rateLimit = statement.match(
    /\brate\s+limited\s+to\s+(?<count>\d+)\s+(?<action>[a-z][a-z\s_-]*?)\s+per\s+(?<window>[a-z]+)\b/i,
  );
  if (!rateLimit?.groups) return null;
  return {
    kind: "ontology_gap",
    confidence: 0.82,
    evidence: rateLimit[0],
    rationale:
      "Rate limiting is logical and machine-checkable, but the current built-in predicate set needs a dedicated schema before grounding it safely.",
    suggested_next_tool: "kb_suggest_predicates",
    recommendedPredicateSchema: {
      predicate_name: "rate_limit",
      argument_names: ["subject", "action", "window", "count"],
      argument_types: ["entity", "action", "duration", "number"],
    },
    applyPlan: observationApplyPlan(payload, "Ontology gap: rate_limit", [
      "semantic-advisor-suggestion",
      "review:ontology-gap",
      "needs_schema_extension",
    ]),
  };
}

function modelingSuggestions(
  payload: Record<string, unknown>,
  modeled: boolean,
): SemanticModelingSuggestion[] {
  if (!isRequirementPayload(payload) || modeled) return [];
  const statement = extractStatement(payload);
  if (!statement) return [];
  const wholeStatement = statement.trim().replace(/[.]+$/g, "");
  const splitStatements = statement
    .split(
      /\s+and\s+(?=[a-z][a-z\s_-]*(?:expire|must|shall|should|default|transition|states?\s+are))/i,
    )
    .map((part) => part.trim().replace(/[.]+$/g, ""))
    .filter((part) => part.length > 0);
  const suggestionStatements = Array.from(
    new Set(
      /\bmutually\s+exclusive\b/i.test(statement)
        ? [wholeStatement, ...splitStatements]
        : splitStatements,
    ),
  );
  const detectors = [
    detectPredicateSuggestion,
    detectOntologyGapSuggestion,
    detectAmbiguitySuggestion,
    detectStrictPropertySuggestion,
  ];
  const suggestions: SemanticModelingSuggestion[] = [];
  const seen = new Set<string>();
  for (const candidateStatement of suggestionStatements) {
    for (const detector of detectors) {
      const suggestion = detector(payload, candidateStatement);
      if (!suggestion) continue;
      const key = `${suggestion.kind}:${suggestion.evidence}:${suggestion.suggested_next_tool}`;
      if (!seen.has(key)) {
        seen.add(key);
        suggestions.push(suggestion);
      }
      break;
    }
  }
  return suggestions;
}

function summaryFor(
  readiness: SemanticAdvisorReadiness,
  lane: SemanticAdvisorLane,
): string {
  if (readiness === "modeled") {
    return "Requirement already links to strict or predicate facts; semantic advisor has no repair warning.";
  }
  if (readiness === "not_applicable") {
    return "No strong machine-checkable requirement signals were detected.";
  }
  if (lane === "strict_property") {
    return "Requirement prose appears to contain scalar, threshold, or cardinality logic that should be modeled with strict facts.";
  }
  if (lane === "predicate") {
    return "Requirement prose appears to contain relational or behavioral logic that should be modeled with ontology predicates.";
  }
  return "Requirement prose appears normative but needs review before it can participate in logic checks.";
}

function laneForSuggestions(
  suggestions: SemanticModelingSuggestion[],
): SemanticAdvisorLane | null {
  if (suggestions.some((suggestion) => suggestion.kind === "strict_property")) {
    return "strict_property";
  }
  if (suggestions.some((suggestion) => suggestion.kind === "predicate")) {
    return "predicate";
  }
  return null;
}

function warningsFor(receipt: SemanticAdvisorReceipt): string[] {
  if (receipt.logic_readiness !== "needs_modeling") return [];

  const tools = receipt.suggested_next_tools.join(" or ");
  return [
    `Semantic advisor: ${receipt.summary} Next action: call ${tools} before treating this requirement as Prolog-checkable.`,
  ];
}

export function analyzeSemanticAdvisorInput(
  input: SemanticAdvisorInput,
): SemanticAdvisorResult {
  const payload = input.payload;
  const signals = isRequirementPayload(payload)
    ? detectSignals(extractProse(payload))
    : [];
  const modeled =
    isRequirementPayload(payload) && hasModeledRelationships(payload);
  const suggestions = modelingSuggestions(payload, modeled);
  const candidateLane = modeled
    ? "none"
    : (laneForSuggestions(suggestions) ?? chooseLane(signals));
  const readiness: SemanticAdvisorReadiness = modeled
    ? "modeled"
    : candidateLane === "none"
      ? "not_applicable"
      : "needs_modeling";

  const receipt: SemanticAdvisorReceipt = {
    version: SEMANTIC_ADVISOR_VERSION,
    payload_hash: payloadHash(payload),
    logic_readiness: readiness,
    candidate_lane: candidateLane,
    signals,
    ambiguity_witnesses: modeled ? [] : ambiguityWitnesses(signals),
    suggestions,
    suggested_next_tools: modeled ? [] : suggestedTools(candidateLane),
    summary: summaryFor(readiness, candidateLane),
  };

  return {
    receipt,
    warnings: warningsFor(receipt),
  };
}
