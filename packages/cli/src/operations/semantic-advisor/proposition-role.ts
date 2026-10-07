import { extractSemanticClauses, hasNormativeAssertion } from "./clauses.js";
import type { SemanticPropositionRole } from "./types.js";

const DEFINITION_VERB = /\b(?:means|defined as|refers to|is called)\b/i;
const CONDITION_OPENER = /^\s*(?:if|when|whenever|provided that|only if)\b/i;

// implements REQ-kibi-conditional-requirement-authoring
// A definition is "<subject> means|is defined as|refers to|is called <...>" as
// the main predicate of a sentence that asserts no obligation. A definition
// verb that opens a relative clause ("every note that refers to the clip") or
// follows a condition does not make the sentence a definition.
export function isDefinitionShape(statement: string): boolean {
  if (hasNormativeAssertion(statement)) return false;
  const match = DEFINITION_VERB.exec(statement);
  if (match === null) return false;
  const subject = statement.slice(0, match.index);
  if (subject.trim().length === 0 || CONDITION_OPENER.test(subject))
    return false;
  return !/\b(?:that|which|who)\s*$/i.test(subject);
}

// implements REQ-kibi-proposition-complete-ingestion
// Inventories persisted before definitions required the main-predicate shape
// recorded any clause containing a definition verb as a definition. Accept that
// stored role so existing knowledge keeps validating; new writes use the
// advisor's current role.
export function legacyPropositionRoles(
  statement: string,
): readonly SemanticPropositionRole[] {
  return DEFINITION_VERB.test(statement) ? ["definition"] : [];
}

// implements REQ-kibi-conditional-requirement-authoring
export function propositionRole(
  statement: string,
  normative: boolean,
): SemanticPropositionRole {
  // Explicit context labels may quote obligations. Incidental explanatory
  // words within an asserted obligation must not exempt it from grounding.
  const assertedNormative = normative && hasNormativeAssertion(statement);
  // A bare desired impression is subjective, even when phrased with should.
  // Keep concrete actions, quantitative conditions and any independent
  // obligation assertive instead of exempting them through subjective words.
  const impression =
    /\bshould\s+(?:feel\s+(?:welcoming|comfortable|energetic)(?:\s+and\s+(?:welcoming|comfortable|energetic))*|(?:look|seem)\s+complete)\b/i.exec(
      statement,
    );
  const impressionTail = impression
    ? statement.slice(impression.index + impression[0].length).trim()
    : "";
  const subjectiveAspiration =
    impression !== null &&
    (impressionTail.length === 0 ||
      /^(?:to|for)\s+[^,;.!?]+$/i.test(impressionTail)) &&
    !/\b(?:and|or)\b/i.test(impressionTail) &&
    !/\d|\b(?:at least|at most|exactly|within|no more than)\b/i.test(
      statement,
    ) &&
    !hasNormativeAssertion(statement.replace(impression[0], ""));
  if (
    /^\s*(?:for example\b|e\.g\.|(?:example|illustrative(?: example)?)\s*:)/i.test(
      statement,
    ) ||
    (!assertedNormative &&
      /\b(?:for example|e\.g\.|such as|illustrative)\b/i.test(statement))
  )
    return "example";
  if (
    /^\s*rationale\s*:/i.test(statement) ||
    (!assertedNormative &&
      /\b(?:because|so that|in order to| rationale|therefore)\b/i.test(
        statement,
      ))
  )
    return "rationale";
  if (
    subjectiveAspiration ||
    (!assertedNormative &&
      /\b(?:feel|comfortable|looks complete|seems complete|subjective|prefer)\b/i.test(
        statement,
      ))
  )
    return "subjective";
  if (isDefinitionShape(statement)) return "definition";
  if (CONDITION_OPENER.test(statement)) return "condition";
  if (/\b(?:unless|except|exempt|apart from)\b/i.test(statement))
    return "exception";
  if (normative) return "normative";
  return "descriptive";
}

// implements REQ-kibi-proposition-complete-ingestion
// The role the semantic advisor assigns to one claim of a requirement's
// semantic text. Writers derive persisted inventory roles from it so the
// write-time proposition-complete check, which compares against the same
// advisor, never rejects a plan Kibi itself generated.
export function advisorPropositionRole(
  semanticText: string,
  claimKey: string,
  suppliedClauses?: readonly string[],
): SemanticPropositionRole | null {
  const clause = extractSemanticClauses(semanticText, suppliedClauses).find(
    (entry) => entry.claim_key === claimKey,
  );
  return clause ? propositionRole(clause.text, clause.normative) : null;
}
