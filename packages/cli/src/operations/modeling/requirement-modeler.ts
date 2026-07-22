import type { SemanticClaim } from "../../public/check-types.js";
import {
  buildFallbackClaim,
  extractHeuristicClaim,
} from "./requirement-heuristics.js";
import type {
  ExtractedRequirementClaim,
  ModelRequirementArgs,
} from "./requirement-types.js";
import {
  clampConfidence,
  normalizeClaimValue,
  normalizeOptionalString,
  normalizeSourceFiles,
  normalizeText,
  stripListPrefix,
} from "./requirement-utils.js";

const NORMATIVE_SECTION_PATTERN = /\b(requirements?|polic(?:y|ies)|rules?)\b/i;

function hasExplicitClaimFields(args: ModelRequirementArgs): boolean {
  return (
    args.subjectKey !== undefined ||
    args.propertyKey !== undefined ||
    args.operator !== undefined ||
    args.value !== undefined
  );
}

// implements REQ-002
export function estimateNormativeSignalConfidence(
  statement: string,
  heading?: string,
): number {
  const normalizedStatement = stripListPrefix(statement).toLowerCase();
  if (!/\b(must|shall|should)\b/.test(normalizedStatement)) return 0;
  let confidence = normalizedStatement.includes(" shall ")
    ? 0.86
    : normalizedStatement.includes(" must ")
      ? 0.84
      : 0.78;
  if (heading && NORMATIVE_SECTION_PATTERN.test(heading)) confidence += 0.08;
  return Math.round(Math.min(0.95, confidence) * 100) / 100;
}

// implements REQ-002
export function extractRequirementClaim(
  args: ModelRequirementArgs,
): ExtractedRequirementClaim & {
  statement: string;
  source: string;
  sourceFiles: string[];
} {
  const statement = normalizeText(args.text);
  const sourceFiles = normalizeSourceFiles(args.sourceFiles);
  const source = normalizeOptionalString(args.source) ?? sourceFiles[0];
  if (!source) {
    throw new Error(
      "Requirement modeling failed: provide source or at least one sourceFiles entry",
    );
  }
  const provenance = normalizeOptionalString(args.provenance);
  const confidence = clampConfidence(args.confidence);

  if (hasExplicitClaimFields(args)) {
    const subjectKey = normalizeOptionalString(args.subjectKey);
    const propertyKey = normalizeOptionalString(args.propertyKey);
    if (
      !subjectKey ||
      !propertyKey ||
      args.operator === undefined ||
      args.value === undefined
    ) {
      throw new Error(
        "Requirement modeling failed: subjectKey, propertyKey, operator, and value must all be provided when any extracted claim field is supplied",
      );
    }
    const claim: SemanticClaim = {
      source,
      subjectKey,
      propertyKey,
      operator: args.operator,
      value: normalizeClaimValue(args.value),
      confidence,
      ...(provenance ? { provenance } : {}),
    };
    return {
      statement,
      source,
      sourceFiles,
      claim,
      extractionMode: "provided",
      extractionWarnings: [],
    };
  }

  const heuristic = extractHeuristicClaim(
    statement,
    source,
    confidence,
    provenance,
  );
  if (heuristic) return { statement, source, sourceFiles, ...heuristic };
  return {
    statement,
    source,
    sourceFiles,
    ...buildFallbackClaim(statement, source, confidence, provenance),
  };
}
