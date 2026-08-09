import { semanticClaimKey } from "../semantic-advisor/clauses.js";
import { inferArgs } from "./predicate-inference.js";
import { schemaForCandidate } from "./predicate-loader.js";
import type {
  PredicateSchemaCandidate,
  PredicateSuggestion,
  SuggestPredicatesArgs,
} from "./predicate-types.js";
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
  // Permission-style inference carries the deontic decision as its final
  // argument. Preserve that polarity in the typed suggestion instead of
  // silently turning a prohibition into an assertion.
  const polarity =
    predicateArgs.at(-1) === "deny" ||
    /\b(?:must\s+not|shall\s+not|never|cannot|can't|forbidden|prohibited)\b/i.test(
      text,
    )
      ? "deny"
      : "assert";
  return {
    id: hashId("SUGGEST", [schema.id, canonicalKey, text]),
    predicate_name: schema.predicate_name,
    predicate_args: predicateArgs,
    canonical_key: canonicalKey,
    polarity,
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
  const claimKey = semanticClaimKey(args.text);
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
        claim_key: claimKey,
        claim_text: args.text.trim(),
      },
      relationships: [],
    },
  ];
}

// implements REQ-mcp-suggest-predicates
export function buildRelationshipPlan(
  factId: string | undefined,
  requirementId: string | undefined,
  claimText?: string,
  existingLogicClaims: readonly string[] = [],
): Record<string, unknown> | null {
  if (!factId || !requirementId) return null;
  const claimKey = claimText ? semanticClaimKey(claimText) : null;
  const logicClaims = Array.from(
    new Set([...existingLogicClaims, ...(claimKey === null ? [] : [claimKey])]),
  );
  return {
    applyAfter: factId,
    requiresExistingReq: requirementId,
    relationship: {
      type: "requires_predicate",
      from: requirementId,
      to: factId,
    },
    ...(claimText
      ? {
          claimKey,
          claimText: claimText.trim(),
          logicClaims,
        }
      : {}),
    instructions:
      "Apply the predicate fact first, update the requirement with the returned merged logicClaims manifest, then attach this relationship without overwriting other requirement metadata.",
  };
}

// implements REQ-mcp-suggest-predicates
export function buildGapApplyPlan(
  text: string,
  args: SuggestPredicatesArgs,
): Array<Record<string, unknown>> {
  const claimKey = semanticClaimKey(text);
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
        claim_key: claimKey,
        claim_text: text,
      },
      relationships: [
        {
          type: "relates_to",
          from: factId,
          to: "review:ontology-gap",
        },
      ],
    },
  ];
}
