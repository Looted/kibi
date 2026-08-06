import path from "node:path";
import type { ExtractedRequirementClaim } from "./requirement-types.js";
import {
  cleanPredicate,
  cleanSubject,
  stripListPrefix,
} from "./requirement-utils.js";

const STRICT_FALLBACK_CONFIDENCE = 0.69;

function fallbackSubjectFromSource(source: string): string {
  const basename = path
    .basename(source, path.extname(source))
    .replace(/[-_]+/g, " ")
    .trim();
  return basename || "Requirement";
}

// implements REQ-002
export function buildFallbackClaim(
  statement: string,
  source: string,
  confidence: number,
  provenance: string | undefined,
): ExtractedRequirementClaim {
  return {
    claim: {
      source,
      subjectKey: fallbackSubjectFromSource(source),
      propertyKey: "statement",
      operator: "eq",
      value: statement,
      confidence: Math.min(confidence, STRICT_FALLBACK_CONFIDENCE),
      ...(provenance ? { provenance } : {}),
    },
    extractionMode: "fallback",
    extractionWarnings: [
      "Deterministic claim extraction could not infer a strict semantic claim; emitted a review artifact instead.",
    ],
  };
}

// implements REQ-002
export function extractHeuristicClaim(
  statement: string,
  source: string,
  confidence: number,
  provenance: string | undefined,
): ExtractedRequirementClaim | null {
  const normalized = stripListPrefix(statement);
  const retentionMatch = normalized.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+retained\s+for\s+(?<value>\d+)\s+(?<unit>day|days|month|months|year|years)\.?$/i,
  );
  if (retentionMatch?.groups) {
    const { unit, subject, value } = retentionMatch.groups;
    if (!unit || !subject || !value) return null;
    const normalizedUnit = unit.toLowerCase().startsWith("day")
      ? "Days"
      : unit.toLowerCase().startsWith("month")
        ? "Months"
        : "Years";
    return {
      claim: {
        source,
        subjectKey: cleanSubject(subject),
        propertyKey: `Retention ${normalizedUnit}`,
        operator: "eq",
        value: Number(value),
        confidence,
        ...(provenance ? { provenance } : {}),
      },
      extractionMode: "heuristic",
      extractionWarnings: [],
    };
  }

  const enabledMatch = normalized.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+be\s+(?<state>enabled|disabled)\.?$/i,
  );
  if (enabledMatch?.groups) {
    const { subject, state } = enabledMatch.groups;
    if (!subject || !state) return null;
    return {
      claim: {
        source,
        subjectKey: cleanSubject(subject),
        propertyKey: "enabled",
        operator: "bool",
        value: state.toLowerCase() === "enabled",
        confidence,
        ...(provenance ? { provenance } : {}),
      },
      extractionMode: "heuristic",
      extractionWarnings: [],
    };
  }

  const forbiddenMatch = normalized.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+not\s+(?<predicate>.+?)\.?$/i,
  );
  if (forbiddenMatch?.groups) {
    const { subject, predicate } = forbiddenMatch.groups;
    if (!subject || !predicate) return null;
    return {
      claim: {
        source,
        subjectKey: cleanSubject(subject),
        propertyKey: cleanPredicate(predicate),
        operator: "polarity",
        value: "forbid",
        confidence,
        ...(provenance ? { provenance } : {}),
      },
      extractionMode: "heuristic",
      extractionWarnings: [],
    };
  }

  const requiredMatch = normalized.match(
    /^(?<subject>.+?)\s+(?:must|shall|should)\s+(?<predicate>.+?)\.?$/i,
  );
  if (requiredMatch?.groups) {
    const { subject, predicate } = requiredMatch.groups;
    if (!subject || !predicate) return null;
    return {
      claim: {
        source,
        subjectKey: cleanSubject(subject),
        propertyKey: cleanPredicate(predicate),
        operator: "polarity",
        value: "require",
        confidence,
        ...(provenance ? { provenance } : {}),
      },
      extractionMode: "heuristic",
      extractionWarnings: [],
    };
  }
  return null;
}
