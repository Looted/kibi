import { inferArgs } from "./predicate-inference.js";
import { schemaForCandidate } from "./predicate-loader.js";
import type { PredicateSchemaCandidate, PredicateSuggestion, SuggestPredicatesArgs } from "./predicate-types.js";
import { hashId } from "./predicate-utils.js";

// implements REQ-mcp-suggest-predicates
export function buildSuggestion(
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

// implements REQ-mcp-suggest-predicates
export function buildPredicateApplyPlan(
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

// implements REQ-mcp-suggest-predicates
export function buildRelationshipPlan(
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

// implements REQ-mcp-suggest-predicates
export function buildGapApplyPlan(
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
