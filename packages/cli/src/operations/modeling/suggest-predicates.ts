import type {
  OperationContext,
  PrologPort,
} from "../../public/operations/runtime-types.js";
import { semanticClaimKey } from "../semantic-advisor/clauses.js";
import {
  buildGapApplyPlan,
  buildPredicateApplyPlan,
  buildRelationshipPlan,
  buildSuggestion,
} from "./predicate-applyplan.js";
import { BUILT_IN_PREDICATE_SCHEMAS } from "./predicate-catalog.js";
import { inferSubject } from "./predicate-inference.js";
import { loadExistingPredicateSchemas } from "./predicate-loader.js";
import { scoreSchema } from "./predicate-ranker.js";
import type {
  SuggestPredicatesArgs,
  SuggestPredicatesResult,
} from "./predicate-types.js";
import { clampInteger, clampScore, normalizeText } from "./predicate-utils.js";

export type {
  SuggestPredicatesArgs,
  SuggestPredicatesResult,
} from "./predicate-types.js";

const DEFAULT_MAX_CANDIDATES = 5;

// implements REQ-mcp-suggest-predicates
export async function handleKbSuggestPredicates(
  prolog: PrologPort | null,
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
  if (candidates.length === 0) {
    warnings.push(
      "No predicate candidate met minScore. If this is recurring domain language, create a fact_kind=predicate_schema fact; otherwise keep the generated review:ontology-gap observation. Do not invent unsupported predicate names without a predicate_schema.",
    );
  }

  const recommendedAction =
    candidates.length > 0 ? "apply_requires_predicate" : "record_ontology_gap";
  const firstCandidate = candidates[0];
  const applyPlan = firstCandidate
    ? buildPredicateApplyPlan(firstCandidate, args)
    : buildGapApplyPlan(text, args);
  const relationshipPlan = firstCandidate
    ? buildRelationshipPlan(
        String(applyPlan[0]?.id ?? ""),
        args.requirementId,
        text,
        args.existingLogicClaims,
      )
    : null;
  const textSummary =
    candidates.length > 0
      ? `Suggested ${candidates.length} predicate candidate(s). Top match: ${candidates[0]?.predicate_name}. Apply structured predicate facts before falling back to prose.`
      : "No predicate candidate met the confidence threshold; record an ontology gap instead of silently writing prose.";
  const claimKey = semanticClaimKey(text);
  const logicClaims = Array.from(
    new Set([...(args.existingLogicClaims ?? []), claimKey]),
  );

  return {
    content: [{ type: "text", text: textSummary }],
    structuredContent: {
      text,
      claimKey,
      logicClaims,
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

export async function executeSuggestPredicates(
  args: SuggestPredicatesArgs,
  context: OperationContext,
): Promise<SuggestPredicatesResult> {
  return handleKbSuggestPredicates(context.prolog ?? null, args);
}
