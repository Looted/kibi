import { semanticClaimKey } from "../semantic-advisor/clauses.js";
import { exactLauncherPredicateArgs } from "../semantic-advisor/predicate-rules-launcher.js";
import {
  aggregateBindingProvenance,
  bindingCanBeApplied,
  classifyBinding,
  isGenericPlaceholder,
} from "./predicate-bindings.js";
import { inferArgs } from "./predicate-inference.js";
import { schemaForCandidate } from "./predicate-loader.js";
import type {
  BindingProvenance,
  PredicateSchemaCandidate,
  PredicateScoreComponents,
  PredicateSuggestion,
  RecommendedPredicateSchema,
  SuggestPredicatesArgs,
} from "./predicate-types.js";
import { hashId } from "./predicate-utils.js";

// implements REQ-mcp-suggest-predicates
export function buildSuggestion(
  schema: PredicateSchemaCandidate,
  text: string,
  subject: string,
  score: number,
  argumentBindings: Readonly<Record<string, string>> = {},
  polarityHint?: "assert" | "deny",
  diagnostics?: {
    eligibility?: "eligible" | "rejected";
    rejectionReasons?: readonly string[];
    applicabilityScore?: number;
    scoreComponents?: PredicateScoreComponents;
    explicitSubject?: boolean;
  },
): PredicateSuggestion {
  const inferredArgs = inferArgs(schema, text, subject);
  const canonicalLauncherArgs = exactLauncherPredicateArgs(
    schema.predicate_name,
    text,
  );
  const predicateArgs = schema.argument_names.map((name, index) => {
    const exactBinding = argumentBindings[name];
    return typeof exactBinding === "string" && exactBinding.trim().length > 0
      ? exactBinding.trim()
      : (inferredArgs[index] ?? "unknown");
  });
  const bindingProvenanceByArgument = Object.fromEntries(
    schema.argument_names.map((name, index) => [
      name,
      classifyBinding(
        predicateArgs[index] ?? "unknown",
        text,
        (typeof argumentBindings[name] === "string" &&
          argumentBindings[name].trim().length > 0) ||
          (diagnostics?.explicitSubject === true && index === 0),
        canonicalLauncherArgs?.[index] === predicateArgs[index] &&
          !(
            index === 0 &&
            predicateArgs[index] === "launcher" &&
            diagnostics?.explicitSubject !== true &&
            typeof argumentBindings[name] !== "string"
          ),
      ),
    ]),
  ) as Record<string, BindingProvenance>;
  const bindingProvenance = aggregateBindingProvenance(
    Object.values(bindingProvenanceByArgument),
  );
  const unboundArguments = schema.argument_names.filter(
    (name) =>
      !bindingCanBeApplied(bindingProvenanceByArgument[name] ?? "placeholder"),
  );
  const canonicalKey = `${schema.predicate_name}(${predicateArgs.join(",")})`;
  // Permission-style inference carries the deontic decision as its final
  // argument. Preserve that polarity in the typed suggestion instead of
  // silently turning a prohibition into an assertion.
  const polarity =
    polarityHint ??
    (predicateArgs.at(-1) === "deny" ||
    /\b(?:must\s+not|shall\s+not|never|cannot|can't|forbidden|prohibited)\b/i.test(
      text,
    )
      ? "deny"
      : "assert");
  return {
    id: hashId("SUGGEST", [schema.id, canonicalKey, text]),
    predicate_name: schema.predicate_name,
    predicate_args: predicateArgs,
    canonical_key: canonicalKey,
    polarity,
    binding_status: unboundArguments.length === 0 ? "complete" : "incomplete",
    unbound_arguments: unboundArguments,
    binding_provenance: bindingProvenance,
    binding_provenance_by_argument: bindingProvenanceByArgument,
    eligibility: diagnostics?.eligibility ?? "eligible",
    rejection_reasons: [...(diagnostics?.rejectionReasons ?? [])],
    applicability_score: diagnostics?.applicabilityScore ?? score,
    score_components: diagnostics?.scoreComponents ?? {
      exact_pattern: score,
      keyword_hits: 0,
      descriptor_overlap: 0,
      usage_match: 0,
      negative_evidence: 0,
      broad_token_penalty: 0,
      specificity_bonus: 0,
      total: score,
    },
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
  if (
    suggestion.binding_status !== "complete" ||
    suggestion.eligibility !== "eligible"
  )
    return [];
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

/**
 * Build a review-only schema draft when retrieval found no eligible schema.
 * The draft is deterministic and intentionally contains no apply plan.
 */
export function buildPredicateSchemaDraft(
  text: string,
  subject: string,
): RecommendedPredicateSchema {
  const lower = text.toLowerCase();
  const words = lower.match(/[a-z][a-z0-9-]{3,}/g) ?? [];
  const ignored = new Set([
    "must",
    "shall",
    "should",
    "when",
    "where",
    "that",
    "with",
    "from",
    "into",
    "only",
    "this",
    "there",
    "their",
    "required",
    "requires",
  ]);
  const terms = Array.from(
    new Set(words.filter((word) => !ignored.has(word))),
  ).slice(0, 3);
  const predicateName = `${terms.length > 0 ? terms.join("_") : "domain"}_policy`;
  const outcomeLike =
    /invalid|fail|reject|error|forbid|prohibit|must not|cannot/i.test(text);
  const argumentNames = outcomeLike
    ? ["subject", "condition", "required_outcome"]
    : /when|if|unless/i.test(text)
      ? ["subject", "condition", "behavior"]
      : ["subject", "claim"];
  const argumentTypes = outcomeLike
    ? ["entity", "condition", "outcome"]
    : argumentNames.length === 3
      ? ["entity", "condition", "behavior"]
      : ["entity", "claim"];
  const candidateBindings: Record<string, string> = {};
  if (!isGenericPlaceholder(subject)) candidateBindings.subject = subject;
  const unresolvedBindings = argumentNames.filter((name) => {
    if (name === "subject") return !Object.hasOwn(candidateBindings, "subject");
    const candidate =
      name === "condition"
        ? lower.match(
            /(?:when|if|unless)\s+(.+?)(?:,|\s+then\s+|\s+must\s+)/i,
          )?.[1]
        : lower.match(/(?:must|shall|should)\s+(.+?)(?:\.|$)/i)?.[1];
    if (candidate) {
      candidateBindings[name] = candidate
        .replace(/[^a-z0-9_. -]/g, "")
        .trim()
        .replace(/\s+/g, "_");
      return false;
    }
    return true;
  });
  return {
    predicate_name: predicateName,
    title: `${predicateName} review draft`,
    description: `Review-only schema draft derived from the unresolved proposition: ${text.trim()}`,
    argument_names: argumentNames,
    argument_types: argumentTypes,
    candidate_bindings: candidateBindings,
    unresolved_bindings: unresolvedBindings,
    rationale:
      "No available predicate schema passed semantic applicability. Review the proposed signature and promote it to a reusable predicate_schema before grounding the claim.",
    reuse_scope:
      "Domain-general schema for propositions with the same subject, condition, and required outcome pattern.",
  };
}
