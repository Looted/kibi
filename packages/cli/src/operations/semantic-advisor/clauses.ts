import { createHash } from "node:crypto";

export type SemanticClause = Readonly<{
  claim_key: string;
  text: string;
  index: number;
  normative: boolean;
  source: "detected" | "supplied";
}>;

const NORMATIVE_PATTERN =
  /\b(?:must|shall|should|required|requires?|may\s+only|may\s+(?:have\s+)?(?:at\s+most|at\s+least|exactly|no\s+more\s+than|up\s+to)|only\s+.+?\s+(?:may|can)|must\s+not|shall\s+not|cannot|can't|denied|forbidden|prohibited|(?:is|are|be|become|becomes|remain|remains)\s+(?:invalid|rejected|prohibited|forbidden)|(?:reject|rejects|rejected|rejection)\s+(?:invalid|unresolved|ambiguous)|fail(?:s|ed)?\s+(?:clearly|explicitly|with)|expires?\s+(?:after|within|in)|failure\s+(?:behavior|policy|outcome)|error\s+(?:handling|behavior|policy|outcome)|required\s+outcome|defaults?\s+to|before|unless|when|if)\b/i;

export function normalizeSemanticClause(value: string): string {
  return (
    value
      .replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, "")
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

function detectedClauses(text: string): string[] {
  return text
    .split(/(?:\r?\n)+|;|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .flatMap((sentence) => {
      if (/\bmutually\s+exclusive\b/i.test(sentence)) return [sentence];
      // Package-resolution lists often join two noun phrases with "and"
      // before the actual exception clause. Keep this launcher contract
      // atomic so "exports-restricted and pnpm-style layouts" is not
      // mistaken for a second proposition.
      if (/\bconsumer-scoped\s+Node\s+package\s+semantics\b/i.test(sentence))
        return [sentence];
      const conjunctionParts = sentence.split(
        /\s+(?:,\s*)?and\s+(?=(?:the\s+)?[a-z][^.!?]{0,140}\b(?:must|shall|should|requires?|cannot|can't|expire|default|transition|states?\s+are|invalid|unresolved|reject(?:ed|ion)?\s+(?:invalid|unresolved|ambiguous)|fail(?:s|ed)?\s+(?:clearly|explicitly|with)|failure\s+(?:behavior|policy|outcome)|error\s+(?:handling|behavior|policy|outcome)|prohibited|forbidden|required\s+outcome)\b)/i,
      );
      // A coordinated subject such as "Analytics and Sentry must..." is one
      // proposition. Split only when every resulting fragment independently
      // carries normative or validity intent.
      return conjunctionParts.length > 1 &&
        conjunctionParts.every((part) => NORMATIVE_PATTERN.test(part))
        ? conjunctionParts
        : [sentence];
    })
    .map(normalizeSemanticClause)
    .filter(Boolean);
}

export function extractSemanticClauses(
  text: string,
  suppliedClauses?: readonly string[],
): readonly SemanticClause[] {
  const source = suppliedClauses === undefined ? "detected" : "supplied";
  const raw = suppliedClauses ?? detectedClauses(text);
  const normalized = raw.map(normalizeSemanticClause).filter(Boolean);
  if (suppliedClauses !== undefined && normalized.length === 0) {
    throw new Error(
      "Semantic advisor clauses must contain at least one non-empty atomic claim",
    );
  }
  return normalized.map((clause, index) => ({
    claim_key: semanticClaimKey(clause),
    text: clause,
    index,
    normative: NORMATIVE_PATTERN.test(clause),
    source,
  }));
}
