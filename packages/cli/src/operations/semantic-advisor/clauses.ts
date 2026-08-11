import { createHash } from "node:crypto";

export type SemanticClause = Readonly<{
  claim_key: string;
  text: string;
  index: number;
  normative: boolean;
  source: "detected" | "supplied";
}>;

const NORMATIVE_PATTERN =
  /\b(?:must|shall|should|required|requires?|may\s+only|only\s+.+?\s+(?:may|can)|must\s+not|shall\s+not|cannot|can't|forbidden|denied|defaults?\s+to|before|unless|when|if)\b/i;

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
      return sentence.split(
        /\s+(?:,\s*)?and\s+(?=(?:the\s+)?[a-z][^.!?]{0,100}\b(?:must|shall|should|requires?|cannot|can't|expire|default|transition|states?\s+are)\b)/i,
      );
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
