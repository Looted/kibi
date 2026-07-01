import type { ExtractionResult } from "../../extractors/markdown.js";
import type { KibiImpactDiagnostic } from "../../traceability/staged-diagnostics.js";
import type { RequirementQualityDiagnosticsOptions } from "./types.js";

const CURRENT_REQUIREMENT_STATUSES: ReadonlySet<string> = new Set([
  "open",
  "in_progress",
  "active",
  "accepted",
]);

const TEST_LIKE_REQUIREMENT_STATUSES: ReadonlySet<string> = new Set([
  "passing",
  "failing",
  "skipped",
  "pending",
]);

const STRICT_RELATIONSHIP_TYPES: ReadonlySet<string> = new Set([
  "constrains",
  "requires_property",
  "requires_predicate",
]);

const BROAD_REQUIREMENT_THRESHOLDS = {
  implementingSymbols: 8,
  scenarios: 6,
  tests: 8,
  dependentRequirements: 5,
} as const;

const NORMATIVE_INDICATOR_PATTERNS: readonly [string, RegExp][] = [
  ["must", /\bmust\b/i],
  ["only", /\bonly\b/i],
  ["never", /\bnever\b/i],
  ["limit", /\blimits?\b/i],
  ["minimum", /\bminimum\b/i],
  ["maximum", /\bmaximum\b/i],
  ["at least", /\bat\s+least\b/i],
  ["at most", /\bat\s+most\b/i],
];

type RequirementFanout = {
  readonly implementingSymbolIds: readonly string[];
  readonly scenarioIds: readonly string[];
  readonly testIds: readonly string[];
  readonly dependentRequirementIds: readonly string[];
};

function isRequirement(result: ExtractionResult): boolean {
  return result.entity.type === "req";
}

function isCurrentRequirement(result: ExtractionResult): boolean {
  return isRequirement(result) && CURRENT_REQUIREMENT_STATUSES.has(result.entity.status);
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

function entityTypeById(
  results: readonly ExtractionResult[],
): ReadonlyMap<string, string> {
  const types = new Map<string, string>();
  for (const result of results) {
    types.set(result.entity.id, result.entity.type);
  }
  return types;
}

function targetHasType(
  targetId: string,
  type: string,
  typesByEntityId: ReadonlyMap<string, string>,
): boolean {
  const targetType = typesByEntityId.get(targetId);
  return targetType === undefined || targetType === type;
}

function collectFanout(
  requirementId: string,
  results: readonly ExtractionResult[],
  typesByEntityId: ReadonlyMap<string, string>,
): RequirementFanout {
  const implementingSymbolIds: string[] = [];
  const scenarioIds: string[] = [];
  const testIds: string[] = [];
  const dependentRequirementIds: string[] = [];

  for (const result of results) {
    for (const relationship of result.relationships) {
      if (relationship.type === "implements" && relationship.to === requirementId) {
        implementingSymbolIds.push(result.entity.id);
      }
      if (
        result.entity.id === requirementId &&
        relationship.type === "specified_by" &&
        targetHasType(relationship.to, "scenario", typesByEntityId)
      ) {
        scenarioIds.push(relationship.to);
      }
      if (
        result.entity.id === requirementId &&
        (relationship.type === "verified_by" || relationship.type === "covered_by") &&
        targetHasType(relationship.to, "test", typesByEntityId)
      ) {
        testIds.push(relationship.to);
      }
      if (relationship.type === "depends_on") {
        if (
          result.entity.id === requirementId &&
          targetHasType(relationship.to, "req", typesByEntityId)
        ) {
          dependentRequirementIds.push(relationship.to);
        }
        if (relationship.to === requirementId && result.entity.type === "req") {
          dependentRequirementIds.push(result.entity.id);
        }
      }
    }
  }

  return {
    implementingSymbolIds: sortedUnique(implementingSymbolIds),
    scenarioIds: sortedUnique(scenarioIds),
    testIds: sortedUnique(testIds),
    dependentRequirementIds: sortedUnique(dependentRequirementIds),
  };
}

function exceedsBroadThreshold(fanout: RequirementFanout): boolean {
  return (
    fanout.implementingSymbolIds.length >
      BROAD_REQUIREMENT_THRESHOLDS.implementingSymbols ||
    fanout.scenarioIds.length > BROAD_REQUIREMENT_THRESHOLDS.scenarios ||
    fanout.testIds.length > BROAD_REQUIREMENT_THRESHOLDS.tests ||
    fanout.dependentRequirementIds.length >
      BROAD_REQUIREMENT_THRESHOLDS.dependentRequirements
  );
}

function isUmbrellaRequirement(result: ExtractionResult): boolean {
  const tags = result.entity.tags ?? [];
  return tags.some((tag) => tag === "umbrella" || tag === "epic");
}

function createBroadRequirementDiagnostics(
  results: readonly ExtractionResult[],
): readonly KibiImpactDiagnostic[] {
  const typesByEntityId = entityTypeById(results);
  return results.flatMap((result) => {
    if (!isCurrentRequirement(result)) return [];
    const fanout = collectFanout(result.entity.id, results, typesByEntityId);
    if (!exceedsBroadThreshold(fanout)) return [];
    const severity = isUmbrellaRequirement(result) ? "info" : "review";

    return [
      {
        id: "broad_requirement_review",
        severity,
        blocking: false,
        category: "requirement",
        entityId: result.entity.id,
        source: result.entity.source,
        files: [result.entity.source],
        docs: ["docs/entity-schema.md"],
        message: `Requirement ${result.entity.id} has broad fanout that exceeds requirement review thresholds.`,
        suggestion:
          "Split this into smaller behavioral requirements, or keep an explicit umbrella/epic tag when broad ownership is intentional.",
        evidence: {
          implementingSymbolIds: fanout.implementingSymbolIds,
          implementingSymbolCount: fanout.implementingSymbolIds.length,
          implementingSymbolThreshold:
            BROAD_REQUIREMENT_THRESHOLDS.implementingSymbols,
          scenarioIds: fanout.scenarioIds,
          scenarioCount: fanout.scenarioIds.length,
          scenarioThreshold: BROAD_REQUIREMENT_THRESHOLDS.scenarios,
          testIds: fanout.testIds,
          testCount: fanout.testIds.length,
          testThreshold: BROAD_REQUIREMENT_THRESHOLDS.tests,
          dependentRequirementIds: fanout.dependentRequirementIds,
          dependentRequirementCount: fanout.dependentRequirementIds.length,
          dependentRequirementThreshold:
            BROAD_REQUIREMENT_THRESHOLDS.dependentRequirements,
        },
      },
    ];
  });
}

function createRequirementStatusDiagnostics(
  results: readonly ExtractionResult[],
): readonly KibiImpactDiagnostic[] {
  return results.flatMap((result) => {
    if (!isRequirement(result)) return [];
    if (!TEST_LIKE_REQUIREMENT_STATUSES.has(result.entity.status)) return [];

    return [
      {
        id: "requirement_status_review",
        severity: "review",
        blocking: false,
        category: "status",
        entityId: result.entity.id,
        source: result.entity.source,
        files: [result.entity.source],
        docs: ["docs/entity-schema.md"],
        message: `Requirement ${result.entity.id} uses test-like status ${result.entity.status}.`,
        suggestion:
          "Use requirement lifecycle statuses such as open, in_progress, active, accepted, closed, deprecated, or superseded; keep passing/failing statuses on test entities.",
        evidence: { status: result.entity.status },
      },
    ];
  });
}

function strictRelationshipTypes(result: ExtractionResult): readonly string[] {
  return sortedUnique(
    result.relationships
      .filter((relationship) => STRICT_RELATIONSHIP_TYPES.has(relationship.type))
      .map((relationship) => relationship.type),
  );
}

function matchedNormativeIndicators(text: string): readonly string[] {
  return NORMATIVE_INDICATOR_PATTERNS.filter((entry) => entry[1].test(text)).map(
    (entry) => entry[0],
  );
}

function createStrictFactModelingDiagnostics(
  options: RequirementQualityDiagnosticsOptions,
): readonly KibiImpactDiagnostic[] {
  return options.manifestResults.flatMap((result) => {
    if (!isCurrentRequirement(result)) return [];
    if (options.hardViolationEntityIds?.has(result.entity.id)) return [];
    const relationshipTypes = strictRelationshipTypes(result);
    if (relationshipTypes.length > 0) return [];
    const indicators = matchedNormativeIndicators(result.entity.title);
    if (indicators.length === 0) return [];

    return [
      {
        id: "strict_fact_modeling_review",
        severity: "review",
        blocking: false,
        category: "fact",
        entityId: result.entity.id,
        source: result.entity.source,
        files: [result.entity.source],
        docs: ["docs/modeling-cheatsheet.md", "docs/error-reference.md"],
        message: `Requirement ${result.entity.id} contains normative prose but has no strict fact or predicate relationship.`,
        suggestion:
          "Use kb_model_requirement for strict property facts, or kb_suggest_predicates when the claim fits a predicate schema.",
        evidence: {
          matchedIndicators: indicators,
          strictRelationshipTypes: relationshipTypes,
        },
      },
    ];
  });
}

export function createRequirementQualityDiagnostics(
  options: RequirementQualityDiagnosticsOptions,
): KibiImpactDiagnostic[] {
  return [
    ...createBroadRequirementDiagnostics(options.manifestResults),
    ...createRequirementStatusDiagnostics(options.manifestResults),
    ...createStrictFactModelingDiagnostics(options),
  ];
}
