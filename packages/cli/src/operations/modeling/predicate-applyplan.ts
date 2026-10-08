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
import {
  applyArgumentRewrites,
  predicateArgumentConformance,
} from "./predicate-vocabulary.js";

// implements REQ-mcp-suggest-predicates, REQ-model-predicates-requirement-subject-v2, REQ-model-predicates-binding-clauses
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
    /**
     * The subject_key of the subject fact the requirement constrains. It
     * binds the schema's `subject` argument (provenance `requirement`) unless
     * the caller bound that argument or passed subjectHint.
     */
    requirementSubject?: string;
    /**
     * Every subject_key the requirement constrains. When there are any, the
     * predicate must be about one of them (its `subject` argument or, for a
     * schema without one, its subject_key) or kb_check reports
     * strict-req-fact-pairing; an unpaired candidate stays incomplete.
     */
    constrainedSubjects?: readonly string[];
  },
): PredicateSuggestion {
  const inferredArgs = inferArgs(schema, text, subject);
  const canonicalLauncherArgs = exactLauncherPredicateArgs(
    schema.predicate_name,
    text,
  );
  const hasExactBinding = (name: string): boolean =>
    typeof argumentBindings[name] === "string" &&
    argumentBindings[name].trim().length > 0;
  // The argument the schema names `subject`, wherever it sits; -1 when the
  // schema names no subject (permission_rule(actor, action, resource, ...)).
  const subjectArgument = schema.argument_names.indexOf("subject");
  const explicitSubject = diagnostics?.explicitSubject === true;
  // The reviewed subject: subjectHint, else the requirement's constrained
  // subject. It binds the `subject` argument unless that argument is bound.
  const reviewedSubject = explicitSubject
    ? subject
    : diagnostics?.requirementSubject;
  const reviewedSubjectArgument =
    reviewedSubject !== undefined && !hasExactBinding("subject")
      ? subjectArgument
      : -1;
  const boundArgs = schema.argument_names.map((name, index) => {
    const exactBinding = argumentBindings[name];
    if (index === reviewedSubjectArgument) return reviewedSubject ?? "unknown";
    return typeof exactBinding === "string" && exactBinding.trim().length > 0
      ? exactBinding.trim()
      : (inferredArgs[index] ?? "unknown");
  });
  // A schema with closed argument vocabularies only accepts its declared
  // constants: aliases converge onto the constant, anything else stays
  // unbound so the plan asks for a declared value instead of minting an atom.
  const vocabulary = {
    constants: schema.argument_constants ?? {},
    aliases: schema.argument_aliases ?? {},
  };
  const conformance = predicateArgumentConformance(
    schema.argument_names,
    boundArgs,
    vocabulary,
  );
  const predicateArgs = applyArgumentRewrites(boundArgs, conformance.rewrites);
  const undeclaredArguments = new Set(
    conformance.undeclared.map((value) => value.argumentName),
  );
  // A schema without a `subject` argument may still lead with the hinted
  // subject (inference put it there): that value is the agent's reviewed
  // value, even when the schema names its first argument after it.
  const hintedFirstArgument =
    explicitSubject &&
    subjectArgument < 0 &&
    !hasExactBinding(schema.argument_names[0] ?? "") &&
    predicateArgs[0] === subject
      ? 0
      : -1;
  const bindingProvenanceByArgument = Object.fromEntries(
    schema.argument_names.map((name, index) => [
      name,
      index === reviewedSubjectArgument && !undeclaredArguments.has(name)
        ? explicitSubject
          ? classifyBinding(predicateArgs[index] ?? "unknown", text, true)
          : "requirement"
        : classifyBinding(
            predicateArgs[index] ?? "unknown",
            text,
            hasExactBinding(name) || index === hintedFirstArgument,
            canonicalLauncherArgs?.[index] === predicateArgs[index] &&
              !(
                index === 0 &&
                predicateArgs[index] === "launcher" &&
                !explicitSubject &&
                typeof argumentBindings[name] !== "string"
              ),
            index === hintedFirstArgument
              ? { constants: schema.argument_constants?.[name] }
              : {
                  argumentName: name,
                  argumentNames: schema.argument_names,
                  argumentType: schema.argument_types[index],
                  constants: schema.argument_constants?.[name],
                },
          ),
    ]),
  ) as Record<string, BindingProvenance>;
  // The subject the planned predicate fact is about, when the requirement
  // constrains subjects: the `subject` argument's value, or for a schema
  // without one the reviewed subject, recorded as the fact's subject_key.
  const constrainedSubjects = diagnostics?.constrainedSubjects ?? [];
  const subjectKey =
    constrainedSubjects.length === 0
      ? null
      : subjectArgument >= 0
        ? (predicateArgs[subjectArgument] ?? null)
        : (reviewedSubject ?? null);
  const subjectPairing: PredicateSuggestion["subject_pairing"] =
    constrainedSubjects.length === 0
      ? "not_required"
      : subjectKey !== null && constrainedSubjects.includes(subjectKey)
        ? "paired"
        : "unpaired";
  const bindingProvenance = aggregateBindingProvenance(
    Object.values(bindingProvenanceByArgument),
  );
  const unboundArguments = schema.argument_names.filter(
    (name) =>
      undeclaredArguments.has(name) ||
      !bindingCanBeApplied(bindingProvenanceByArgument[name] ?? "placeholder"),
  );
  // An unpaired predicate would leave kb_check's strict-req-fact-pairing on
  // the requirement, so the subject still needs a binding: the `subject`
  // argument, or the fact's subject_key for a schema without one.
  if (subjectPairing === "unpaired") {
    const missing = subjectArgument >= 0 ? "subject" : "subject_key";
    if (!unboundArguments.includes(missing)) unboundArguments.push(missing);
  }
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
    subject_key: subjectKey,
    subject_pairing: subjectPairing,
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

// implements REQ-mcp-suggest-predicates, REQ-model-predicates-requirement-subject-v2
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
        // The subject the predicate is about, so kb_check pairs it with the
        // requirement's subject fact whatever argument holds the subject.
        ...(suggestion.subject_key
          ? { subject_key: suggestion.subject_key }
          : {}),
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
    instructions: `Apply the predicate fact ${factId} first, update the requirement with the returned merged logicClaims manifest, then attach this relationship without overwriting other requirement metadata. The relationship target is the planned fact id ${factId}, never a candidates[].id (SUGGEST-...).`,
  };
}

/**
 * The prose an ontology-gap observation carries in `document.body`. Schema 8
 * blocks an observation without body context (entity-context-missing), so the
 * body says why the note exists and quotes the claim it is about.
 */
function gapObservationBody(text: string, args: SuggestPredicatesArgs): string {
  const origin = [
    args.requirementId ? `requirement ${args.requirementId}` : null,
    args.source ? `source ${args.source}` : null,
  ].filter((value): value is string => value !== null);
  return [
    "No available predicate schema fits this claim, so kb_model mode predicates recorded it as an open ontology gap. The observation does not ground the claim; it stays visible for review until a reviewed predicate_schema covers this kind of statement.",
    ...(origin.length > 0 ? [`Claim from ${origin.join(", ")}:`] : ["Claim:"]),
    `> ${text.trim().replace(/\n/g, "\n> ")}`,
  ].join("\n\n");
}

// implements REQ-mcp-suggest-predicates, REQ-model-predicates-plan-roundtrip
/**
 * The ontology-gap observation plan. It is a review note, not a semantic
 * claim: it quotes the claim in claim_text without a claim_key, carries the
 * review tags in `tags` only (a tag is not an entity, so no relationship
 * targets it) and explains itself in `document.body`, so kb_upsert accepts
 * it unchanged.
 */
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
        ...(args.source ? { text_ref: args.source } : {}),
        tags: ["review:ontology-gap", "needs_schema_extension"],
        fact_kind: "observation",
        value_string: text,
        claim_text: text,
      },
      document: { body: gapObservationBody(text, args) },
      relationships: [],
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
