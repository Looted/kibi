import { createHash } from "node:crypto";
import type { PrologProcess } from "kibi-cli/prolog";
import { parseEntityFromList, parseListOfLists } from "kibi-cli/prolog/codec";

type PredicatePolarity = "assert" | "deny";

interface PredicateSchemaCandidate {
  id: string;
  predicate_name: string;
  title: string;
  description: string;
  argument_names: string[];
  argument_types: string[];
  keywords: string[];
  examples: string[];
  tags: string[];
}

// implements REQ-mcp-suggest-predicates
export interface SuggestPredicatesArgs {
  text: string;
  requirementId?: string;
  source?: string;
  subjectHint?: string;
  maxCandidates?: number;
  minScore?: number;
  includeExistingSchemas?: boolean;
}

interface PredicateSuggestion {
  id: string;
  predicate_name: string;
  predicate_args: string[];
  canonical_key: string;
  polarity: PredicatePolarity;
  score: number;
  rationale: string;
  schema: Omit<PredicateSchemaCandidate, "keywords">;
}

// implements REQ-mcp-suggest-predicates
export interface SuggestPredicatesResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: {
    text: string;
    source: string | null;
    requirementId: string | null;
    subject: string;
    candidates: PredicateSuggestion[];
    recommendedAction: "apply_requires_predicate" | "record_ontology_gap";
    applyPlan: Array<Record<string, unknown>>;
    relationshipPlan: Record<string, unknown> | null;
    warnings: string[];
  };
  applyPlan: Array<Record<string, unknown>>;
}

const DEFAULT_MIN_SCORE = 0.35;
const DEFAULT_MAX_CANDIDATES = 5;

const BUILT_IN_PREDICATE_SCHEMAS: PredicateSchemaCandidate[] = [
  {
    id: "FACT-SCHEMA-STATE",
    predicate_name: "state",
    title: "State assertion",
    description: "A subject has or enters a named state.",
    argument_names: ["subject", "state"],
    argument_types: ["entity", "state"],
    keywords: ["state", "mode", "idle", "active", "draft", "edit"],
    examples: ["state(editor.annotation, idle)"],
    tags: ["state", "workflow"],
  },
  {
    id: "FACT-SCHEMA-TRANSITION",
    predicate_name: "transition",
    title: "State transition",
    description: "A subject transitions between states because of a trigger.",
    argument_names: ["subject", "from_state", "to_state", "trigger"],
    argument_types: ["entity", "state", "state", "trigger"],
    keywords: [
      "transition",
      "enter",
      "leave",
      "idle",
      "navigate",
      "cancel",
      "escape",
    ],
    examples: ["transition(editor.annotation, draft, idle, navigation)"],
    tags: ["state", "workflow"],
  },
  {
    id: "FACT-SCHEMA-GUARD",
    predicate_name: "guard",
    title: "Behavior guard",
    description: "A condition gates or forbids behavior for a subject.",
    argument_names: ["subject", "condition", "expected"],
    argument_types: ["entity", "condition", "boolean"],
    keywords: ["guard", "unless", "readonly", "scrubbing"],
    examples: ["guard(editor.annotation, isReadOnly, false)"],
    tags: ["guard", "workflow"],
  },
  {
    id: "FACT-SCHEMA-HAS-UNSAVED-CHANGES",
    predicate_name: "has_unsaved_changes",
    title: "Unsaved change state",
    description: "A subject has unsaved or dirty local edits.",
    argument_names: ["subject", "expected"],
    argument_types: ["entity", "boolean"],
    keywords: ["unsaved", "dirty", "draft", "edits", "changes"],
    examples: ["has_unsaved_changes(editor.annotation, true)"],
    tags: ["state", "persistence"],
  },
  {
    id: "FACT-SCHEMA-COMMIT-ACTION",
    predicate_name: "commit_action",
    title: "Commit or save action",
    description:
      "A trigger commits, saves, or persists a subject within a scope.",
    argument_names: ["subject", "trigger", "scope"],
    argument_types: ["entity", "trigger", "scope"],
    keywords: [
      "save",
      "saves",
      "saved",
      "auto-save",
      "autosave",
      "commit",
      "persist",
      "navigation",
      "navigates",
      "draft",
    ],
    examples: ["commit_action(editor.annotation, navigation, draft)"],
    tags: ["persistence", "workflow"],
  },
  {
    id: "FACT-SCHEMA-DISCARD-ACTION",
    predicate_name: "discard_action",
    title: "Discard action",
    description:
      "A trigger discards or cancels changes for a subject within a scope.",
    argument_names: ["subject", "trigger", "scope"],
    argument_types: ["entity", "trigger", "scope"],
    keywords: ["discard", "cancel", "escape", "revert", "without save"],
    examples: ["discard_action(editor.annotation, escape, active_annotation)"],
    tags: ["persistence", "workflow"],
  },
  {
    id: "FACT-SCHEMA-ACCESSIBILITY",
    predicate_name: "accessibility_requirement",
    title: "Accessibility requirement",
    description:
      "A subject must satisfy an accessibility standard or severity target.",
    argument_names: ["subject", "standard", "severity"],
    argument_types: ["entity", "standard", "severity"],
    keywords: ["accessibility", "a11y", "wcag", "keyboard", "screen reader"],
    examples: ["accessibility_requirement(game.flow, WCAG, high)"],
    tags: ["accessibility", "quality"],
  },
  {
    id: "FACT-SCHEMA-RETENTION-POLICY",
    predicate_name: "retention_policy",
    title: "Retention policy",
    description: "A subject is retained for a bounded duration.",
    argument_names: ["subject", "duration", "unit"],
    argument_types: ["entity", "number", "unit"],
    keywords: ["retain", "retained", "retention", "days", "months", "years"],
    examples: ["retention_policy(customer.data, 7, years)"],
    tags: ["data", "policy"],
  },
  {
    id: "FACT-SCHEMA-RESOURCE-CONSTRAINT",
    predicate_name: "resource_constraint",
    title: "Resource constraint",
    description:
      "A subject constrains a resource by operator, threshold, and unit.",
    argument_names: ["subject", "resource", "operator", "threshold", "unit"],
    argument_types: ["entity", "resource", "operator", "number", "unit"],
    keywords: ["limit", "maximum", "minimum", "latency", "timeout", "size"],
    examples: ["resource_constraint(api.search, latency, lte, 200, ms)"],
    tags: ["performance", "constraint"],
  },
  {
    id: "FACT-SCHEMA-FEATURE-GATE",
    predicate_name: "feature_gate",
    title: "Feature gate",
    description: "A subject is controlled by a runtime or configuration gate.",
    argument_names: ["subject", "gate", "expected"],
    argument_types: ["entity", "flag", "boolean"],
    keywords: ["flag", "feature gate", "enabled", "disabled", "kill switch"],
    examples: ["feature_gate(checkout.v2, checkoutV2Enabled, true)"],
    tags: ["flag", "runtime"],
  },
  {
    id: "FACT-SCHEMA-EVENT-PUBLISH",
    predicate_name: "publishes_event",
    title: "Event publication",
    description: "A subject publishes a domain or system event.",
    argument_names: ["subject", "event"],
    argument_types: ["entity", "event"],
    keywords: ["publish", "publishes", "emit", "emits", "event"],
    examples: ["publishes_event(order.checkout, OrderSubmitted)"],
    tags: ["event", "architecture"],
  },
  {
    id: "FACT-SCHEMA-ACCEPTANCE-RULE",
    predicate_name: "acceptance_rule",
    title: "Acceptance rule",
    description: "A subject has an observable acceptance outcome.",
    argument_names: ["subject", "outcome"],
    argument_types: ["entity", "outcome"],
    keywords: [
      "acceptance",
      "observable",
      "outcome",
      "must show",
      "must display",
    ],
    examples: ["acceptance_rule(search.results, shows_empty_state)"],
    tags: ["acceptance", "quality"],
  },
];

function normalizeText(text: string): string {
  const normalized = String(text ?? "").trim();
  if (!normalized) {
    throw new Error(
      "Predicate suggestion failed: text must be a non-empty string",
    );
  }
  return normalized;
}

function normalizeOptionalString(
  value: string | undefined,
): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

function clampInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const numeric =
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, Math.trunc(numeric)));
}

function clampScore(value: number | undefined): number {
  const numeric =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : DEFAULT_MIN_SCORE;
  return Math.min(1, Math.max(0, numeric));
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function hashId(prefix: string, parts: string[]): string {
  const digest = createHash("sha256")
    .update(parts.join("\u0000"))
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  return `${prefix}-${digest}`;
}

function inferSubject(text: string, subjectHint: string | undefined): string {
  const explicit = normalizeOptionalString(subjectHint);
  if (explicit) return explicit;

  const lower = text.toLowerCase();
  if (lower.includes("annotation")) return "editor.annotation";
  if (lower.includes("editor")) return "editor";
  if (lower.includes("session")) return "session";
  if (lower.includes("customer data")) return "customer.data";
  if (lower.includes("user")) return "user";
  return "requirement.subject";
}

function inferTrigger(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("navigate")) return "navigation";
  if (lower.includes("escape")) return "escape";
  if (lower.includes("cancel")) return "cancel";
  if (lower.includes("submit")) return "submit";
  return "unspecified_trigger";
}

function inferScope(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("draft")) return "draft";
  if (lower.includes("annotation")) return "active_annotation";
  if (lower.includes("session")) return "session";
  return "subject";
}

function inferArgs(
  schema: PredicateSchemaCandidate,
  text: string,
  subject: string,
): string[] {
  const lower = text.toLowerCase();
  switch (schema.predicate_name) {
    case "state":
      return [subject, lower.includes("idle") ? "idle" : "active"];
    case "transition":
      return [
        subject,
        lower.includes("edit") ? "edit" : "draft",
        lower.includes("idle") ? "idle" : "active",
        inferTrigger(text),
      ];
    case "guard":
      return [
        subject,
        lower.includes("readonly") ? "isReadOnly" : "condition",
        "true",
      ];
    case "has_unsaved_changes":
      return [subject, lower.includes("no unsaved") ? "false" : "true"];
    case "commit_action":
    case "discard_action":
      return [subject, inferTrigger(text), inferScope(text)];
    case "accessibility_requirement":
      return [
        subject,
        lower.includes("wcag") ? "WCAG" : "accessibility",
        "required",
      ];
    case "retention_policy":
      return [subject, inferDuration(text), inferDurationUnit(text)];
    case "resource_constraint":
      return [
        subject,
        inferResource(text),
        inferOperator(text),
        inferNumber(text),
        inferUnit(text),
      ];
    case "feature_gate":
      return [
        subject,
        inferGate(text),
        lower.includes("disabled") ? "false" : "true",
      ];
    case "publishes_event":
      return [subject, inferEvent(text)];
    case "acceptance_rule":
      return [subject, slug(text).slice(0, 64) || "observable_outcome"];
    default:
      return schema.argument_names.map((name) =>
        name === "subject" ? subject : "unknown",
      );
  }
}

function inferDuration(text: string): string {
  return text.match(/\b\d+\b/)?.[0] ?? "1";
}

function inferDurationUnit(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("year")) return "years";
  if (lower.includes("month")) return "months";
  if (lower.includes("day")) return "days";
  return "unit";
}

function inferResource(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("latency")) return "latency";
  if (lower.includes("timeout")) return "timeout";
  if (lower.includes("size")) return "size";
  return "resource";
}

function inferOperator(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("minimum") || lower.includes("at least")) return "gte";
  if (
    lower.includes("not exceed") ||
    lower.includes("not be more than") ||
    lower.includes("no more than") ||
    lower.includes("at most") ||
    lower.includes("maximum")
  ) {
    return "lte";
  }
  if (lower.includes("not")) return "neq";
  return "lte";
}

function inferNumber(text: string): string {
  return text.match(/\b\d+(?:\.\d+)?\b/)?.[0] ?? "0";
}

function inferUnit(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("ms")) return "ms";
  if (lower.includes("seconds")) return "seconds";
  if (lower.includes("mb")) return "mb";
  return "unit";
}

function inferGate(text: string): string {
  const quoted = text.match(/[`'"](?<gate>[A-Za-z0-9_.:-]+)[`'"]/)?.groups
    ?.gate;
  return quoted ?? "feature_gate";
}

function inferEvent(text: string): string {
  const eventName = text.match(/\b[A-Z][A-Za-z0-9]+Event\b/)?.[0];
  return eventName ?? "domain_event";
}

function scoreSchema(schema: PredicateSchemaCandidate, text: string): number {
  const lower = text.toLowerCase();
  const keywordHits = schema.keywords.filter((keyword) =>
    lower.includes(keyword.toLowerCase()),
  ).length;
  if (keywordHits === 0) return 0;

  const normalized = keywordHits / Math.max(3, schema.keywords.length / 2);
  const score = Math.min(0.98, 0.24 + normalized * 0.5 + keywordHits * 0.06);
  return Math.round(score * 100) / 100;
}

function schemaForCandidate(
  schema: PredicateSchemaCandidate,
): Omit<PredicateSchemaCandidate, "keywords"> {
  return {
    id: schema.id,
    predicate_name: schema.predicate_name,
    title: schema.title,
    description: schema.description,
    argument_names: schema.argument_names,
    argument_types: schema.argument_types,
    examples: schema.examples,
    tags: schema.tags,
  };
}

async function loadExistingPredicateSchemas(
  prolog: PrologProcess | null,
  includeExistingSchemas: boolean,
  warnings: string[],
): Promise<PredicateSchemaCandidate[]> {
  if (!includeExistingSchemas || prolog === null) {
    return [];
  }

  try {
    const queryResult = await prolog.query(
      "findall([Id,'fact',Props], (kb_entity(Id, 'fact', Props), member(fact_kind=predicate_schema, Props)), Results)",
    );
    if (!queryResult.success) {
      throw new Error(queryResult.error || "Query failed with unknown error");
    }

    const facts = queryResult.bindings.Results
      ? parseListOfLists(queryResult.bindings.Results).map(parseEntityFromList)
      : [];
    return facts.flatMap((fact) => predicateSchemaFromEntity(fact));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(
      `Existing predicate_schema facts could not be loaded: ${message}`,
    );
    return [];
  }
}

function predicateSchemaFromEntity(
  entity: Record<string, unknown>,
): PredicateSchemaCandidate[] {
  if (entity.fact_kind !== "predicate_schema") return [];
  const predicateName = normalizeOptionalString(
    typeof entity.predicate_name === "string"
      ? entity.predicate_name
      : undefined,
  );
  if (!predicateName) return [];

  return [
    {
      id: String(entity.id ?? hashId("FACT-SCHEMA", [predicateName])),
      predicate_name: predicateName,
      title: String(entity.title ?? predicateName),
      description: String(
        entity.description ??
          `Project-local ${predicateName} predicate schema.`,
      ),
      argument_names: stringArray(entity.argument_names),
      argument_types: stringArray(entity.argument_types),
      keywords: [
        predicateName,
        ...stringArray(entity.aliases),
        ...stringArray(entity.tags),
      ],
      examples: stringArray(entity.examples),
      tags: stringArray(entity.tags),
    },
  ];
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const normalized = normalizeOptionalString(
      typeof item === "string" ? item : undefined,
    );
    return normalized ? [normalized] : [];
  });
}

function buildSuggestion(
  schema: PredicateSchemaCandidate,
  text: string,
  subject: string,
  score: number,
): PredicateSuggestion {
  const predicateArgs = inferArgs(schema, text, subject);
  const canonicalKey = `${schema.predicate_name}(${predicateArgs.join(",")})`;
  return {
    id: hashId("SUGGEST", [schema.id, canonicalKey, text]),
    predicate_name: schema.predicate_name,
    predicate_args: predicateArgs,
    canonical_key: canonicalKey,
    polarity: "assert",
    score,
    rationale: `Matched ${schema.predicate_name} because the prose overlaps with ${schema.tags.join(", ")} cues.`,
    schema: schemaForCandidate(schema),
  };
}

function buildPredicateApplyPlan(
  suggestion: PredicateSuggestion,
  args: SuggestPredicatesArgs,
): Array<Record<string, unknown>> {
  const factId = hashId("FACT-PRED", [
    args.requirementId ?? "",
    args.source ?? "",
    suggestion.canonical_key,
  ]);
  return [
    {
      type: "fact",
      id: factId,
      properties: {
        title: `Predicate: ${suggestion.canonical_key}`,
        status: "active",
        source: args.source ?? "mcp://kibi/suggest-predicates",
        text_ref: args.source,
        tags: [
          "lane:ontology",
          "predicate-suggestion",
          ...suggestion.schema.tags.map((tag) => `predicate:${tag}`),
        ],
        fact_kind: "predicate",
        predicate_name: suggestion.predicate_name,
        predicate_args: suggestion.predicate_args,
        canonical_key: suggestion.canonical_key,
        polarity: suggestion.polarity,
      },
      relationships: [],
    },
  ];
}

function buildRelationshipPlan(
  factId: string | undefined,
  requirementId: string | undefined,
): Record<string, unknown> | null {
  if (!factId || !requirementId) return null;
  return {
    applyAfter: factId,
    requiresExistingReq: requirementId,
    relationship: {
      type: "requires_predicate",
      from: requirementId,
      to: factId,
    },
    instructions:
      "Apply the predicate fact first, then attach this relationship from the existing requirement without overwriting requirement metadata.",
  };
}

function buildGapApplyPlan(
  text: string,
  args: SuggestPredicatesArgs,
): Array<Record<string, unknown>> {
  const factId = hashId("FACT-ONTOLOGY-GAP", [
    args.requirementId ?? "",
    args.source ?? "",
    text,
  ]);
  return [
    {
      type: "fact",
      id: factId,
      properties: {
        title: "Ontology gap: predicate schema needed",
        status: "active",
        source: args.source ?? "mcp://kibi/suggest-predicates",
        text_ref: args.source,
        tags: ["review:ontology-gap", "needs_schema_extension"],
        fact_kind: "observation",
        value_string: text,
      },
      relationships: [],
    },
  ];
}

// implements REQ-mcp-suggest-predicates
export async function handleKbSuggestPredicates(
  prolog: PrologProcess | null,
  args: SuggestPredicatesArgs,
): Promise<SuggestPredicatesResult> {
  const text = normalizeText(args.text);
  const maxCandidates = clampInteger(
    args.maxCandidates,
    DEFAULT_MAX_CANDIDATES,
    1,
    20,
  );
  const minScore = clampScore(args.minScore);
  const warnings: string[] = [];
  const subject = inferSubject(text, args.subjectHint);
  const existingSchemas = await loadExistingPredicateSchemas(
    prolog,
    args.includeExistingSchemas ?? true,
    warnings,
  );
  const schemas = [...existingSchemas, ...BUILT_IN_PREDICATE_SCHEMAS];
  const candidates = schemas
    .map((schema) => ({ schema, score: scoreSchema(schema, text) }))
    .filter((scored) => scored.score >= minScore)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.schema.predicate_name.localeCompare(
        right.schema.predicate_name,
      );
    })
    .slice(0, maxCandidates)
    .map((scored) =>
      buildSuggestion(scored.schema, text, subject, scored.score),
    );

  const recommendedAction =
    candidates.length > 0 ? "apply_requires_predicate" : "record_ontology_gap";
  const firstCandidate = candidates[0];
  const applyPlan = firstCandidate
    ? buildPredicateApplyPlan(firstCandidate, args)
    : buildGapApplyPlan(text, args);
  const relationshipPlan = firstCandidate
    ? buildRelationshipPlan(String(applyPlan[0]?.id ?? ""), args.requirementId)
    : null;
  const textSummary =
    candidates.length > 0
      ? `Suggested ${candidates.length} predicate candidate(s). Top match: ${candidates[0]?.predicate_name}. Apply structured predicate facts before falling back to prose.`
      : "No predicate candidate met the confidence threshold; record an ontology gap instead of silently writing prose.";

  return {
    content: [{ type: "text", text: textSummary }],
    structuredContent: {
      text,
      source: args.source ?? null,
      requirementId: args.requirementId ?? null,
      subject,
      candidates,
      recommendedAction,
      applyPlan,
      relationshipPlan,
      warnings,
    },
    applyPlan,
  };
}
