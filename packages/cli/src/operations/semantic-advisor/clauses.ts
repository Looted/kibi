import { createHash } from "node:crypto";
import { KbRejection } from "../../cli-errors.js";

export type SemanticClause = Readonly<{
  claim_key: string;
  text: string;
  index: number;
  normative: boolean;
  source: "detected" | "supplied";
}>;

// An explicit grant ("are allowed to", "is permitted to", "have permission
// to", "are entitled to") asserts a permission just as "denied"/"forbidden"
// assert a prohibition. Bare "can", "may" and "are able to" are accepted by
// the predicate applicability gate but not here: stored clause roles are
// derived from this pattern, and "it can be restricted to …" style capability
// prose would turn existing descriptive inventories into unmodeled normative
// clauses ("must be able to" is already normative through "must").
// "must not", "shall not" and "required outcome" need no alternatives of
// their own: "must", "shall" and "required" already match them.
const NORMATIVE_ASSERTION_PATTERN =
  /\b(?:must|shall|should|required|requires?|may\s+only|(?:is|are)\s+(?:not\s+)?(?:allowed|permitted|entitled)\s+to|ha(?:s|ve)\s+(?:no\s+)?permission\s+to|permitted|may\s+(?:not\s+)?(?:be\s+)?\w+\s+only\b|may\s+(?:have\s+)?(?:at\s+most|at\s+least|exactly|no\s+more\s+than|up\s+to)|only\s.+?\s(?:may|can)|cannot|can't|denied|forbidden|prohibited|(?:is|are|be|become|becomes|remain|remains)\s+(?:invalid|rejected|prohibited|forbidden)|(?:reject|rejects|rejected|rejection)\s+(?:invalid|unresolved|ambiguous)|fail(?:s|ed)?\s+(?:clearly|explicitly|with)|expires?\s+(?:after|within|in)|failure\s+(?:behavior|policy|outcome)|error\s+(?:handling|behavior|policy|outcome)|defaults?\s+to)\b/i;

// Conditional/temporal cues help discover clauses but do not by themselves
// turn explanatory or subjective context into an asserted obligation.
const NORMATIVE_PATTERN = new RegExp(
  `${NORMATIVE_ASSERTION_PATTERN.source}|\\b(?:before|unless|when|if)\\b`,
  "i",
);

export function hasNormativeAssertion(text: string): boolean {
  return NORMATIVE_ASSERTION_PATTERN.test(text);
}

const NORMATIVE_MODALITIES = new Set(["oblige", "forbid", "permit"]);

// implements REQ-kibi-truthful-consistency
// Role for a clause that was just modeled. A deontic rule modality is decisive;
// otherwise the same assertion pattern the semantic advisor uses decides, so a
// modeled inventory entry never disagrees with the advisor's own analysis.
export function modeledClaimRole(
  text: string,
  modality?: string,
): "normative" | "descriptive" {
  if (modality && NORMATIVE_MODALITIES.has(modality)) return "normative";
  return hasNormativeAssertion(text) ? "normative" : "descriptive";
}

export function normalizeSemanticClause(value: string): string {
  return (
    value
      // Whitespace after the marker collapses and is trimmed below.
      .replace(/^\s*(?:[-*+]\s|\d+[.)]\s)/, "")
      .replace(/\s+/g, " ")
      // Clause splitters and copied list items commonly leave a conjunction
      // comma or sentence punctuation on an otherwise identical atomic claim.
      // Those formatting artifacts must not mint a second logical identity.
      .replace(/[,.:;!?]+$/g, "")
      .trim()
  );
}

export function semanticClaimKey(text: string): string {
  const normalized = normalizeSemanticClause(text).toLowerCase();
  const digest = createHash("sha256").update(normalized).digest("hex");
  return `CLAIM-${digest.slice(0, 16).toUpperCase()}`;
}

/** Fact kinds that quote a claim as a review note and never ground it. */
const NON_GROUNDING_FACT_KINDS = new Set(["observation", "meta"]);

/**
 * Fill `claim_key` from `claim_text` on a fact that may ground a claim.
 *
 * The key is a pure function of the text, so a caller that sends the text
 * alone has given Kibi everything it needs; a supplied key is still checked
 * against the derived one by the entity validators. Observation and meta
 * facts quote a claim without owning it, so they stay keyless.
 */
// implements REQ-kibi-review-observation-claim-text-v2
export function deriveFactClaimKey(entity: Record<string, unknown>): void {
  if (entity.type !== "fact") return;
  if (entity.claim_key !== undefined) return;
  if (typeof entity.claim_text !== "string") return;
  if (NON_GROUNDING_FACT_KINDS.has(entity.fact_kind as string)) return;
  entity.claim_key = semanticClaimKey(entity.claim_text);
}

function detectedClauses(text: string): string[] {
  return (
    text
      // Empty and blank pieces are dropped by the caller, and a trailing \r is
      // whitespace the normalizer trims.
      .split(/\n|;|(?<=[.!?])\s+(?=[A-Z0-9])/)
      .flatMap((sentence) => {
        if (/\bmutually\s+exclusive\b/i.test(sentence)) return [sentence];
        // Package-resolution lists often join two noun phrases with "and"
        // before the actual exception clause. Keep this launcher contract
        // atomic so "exports-restricted and pnpm-style layouts" is not
        // mistaken for a second proposition.
        if (/\bconsumer-scoped\s+Node\s+package\s+semantics\b/i.test(sentence))
          return [sentence];
        // A comma or extra whitespace left before "and" is trimmed by the
        // normalizer, so one whitespace character marks the split.
        const conjunctionParts = sentence.split(
          /\sand\s+(?=(?:the\s+)?[a-z][^.!?]{0,140}\b(?:must|shall|should|requires?|cannot|can't|expire|default|transition|states?\s+are|invalid|unresolved|reject(?:ed|ion)?\s+(?:invalid|unresolved|ambiguous)|fail(?:s|ed)?\s+(?:clearly|explicitly|with)|failure\s+(?:behavior|policy|outcome)|error\s+(?:handling|behavior|policy|outcome)|prohibited|forbidden|required\s+outcome)\b)/i,
        );
        // A coordinated subject such as "Analytics and Sentry must..." is one
        // proposition. Split only when every resulting fragment independently
        // carries normative or validity intent.
        return conjunctionParts.every((part) => NORMATIVE_PATTERN.test(part))
          ? conjunctionParts
          : [sentence];
      })
      .map(normalizeSemanticClause)
  );
}

export function extractSemanticClauses(
  text: string,
  suppliedClauses?: readonly string[],
): readonly SemanticClause[] {
  const source = suppliedClauses === undefined ? "detected" : "supplied";
  const raw = suppliedClauses ?? detectedClauses(text);
  const normalized = raw.map(normalizeSemanticClause).filter(Boolean);
  if (suppliedClauses !== undefined && normalized.length === 0) {
    throw new KbRejection(
      "VALIDATION_FAILED",
      "Semantic advisor clauses must contain at least one non-empty atomic claim",
      [{ rule: "min_items", field: "semantic_clauses" }],
    );
  }
  // A repeated sentence has one logical identity. Keep the first source
  // occurrence for its source span and provenance; retaining repeated claim
  // keys would make the inventory impossible to persist because logic_claims
  // is a set-like manifest and grounding is one-to-one.
  const seen = new Set<string>();
  return normalized.flatMap((clause, index) => {
    const claimKey = semanticClaimKey(clause);
    if (seen.has(claimKey)) return [];
    seen.add(claimKey);
    return [
      {
        claim_key: claimKey,
        text: clause,
        index,
        normative: NORMATIVE_PATTERN.test(clause),
        source,
      },
    ];
  });
}
