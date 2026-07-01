import type {
  ExtractedEntity,
  ExtractionResult,
} from "../../extractors/markdown.js";
import type { QualityDiagnostic } from "./types.js";

type ReviewableCoverageDepth =
  | "unit_only"
  | "open_or_nonpassing_tests_only"
  | "scenario_only_no_test"
  | "no_test_evidence";

type CoverageDepth =
  | ReviewableCoverageDepth
  | "direct_passing_e2e"
  | "scenario_passing_e2e";

type RequirementCoverage = {
  readonly requirement: ExtractedEntity;
  readonly scenarioCount: number;
  readonly directTests: readonly ExtractedEntity[];
  readonly scenarioTests: readonly ExtractedEntity[];
};

type RelationshipLookup = {
  readonly result: ExtractionResult;
  readonly relationshipType: string;
  readonly type: string;
  readonly entities: ReadonlyMap<string, ExtractedEntity>;
};

type IncomingLookup = {
  readonly manifestResults: readonly ExtractionResult[];
  readonly targetId: string;
  readonly relationshipType: string;
  readonly type: string;
};

function entitiesById(
  manifestResults: readonly ExtractionResult[],
): ReadonlyMap<string, ExtractedEntity> {
  return new Map(
    manifestResults.map((result) => [result.entity.id, result.entity]),
  );
}

function outgoingTargets(
  lookup: RelationshipLookup,
): readonly ExtractedEntity[] {
  return lookup.result.relationships.flatMap((relationship) => {
    if (relationship.type !== lookup.relationshipType) return [];
    const target = lookup.entities.get(relationship.to);
    return target?.type === lookup.type ? [target] : [];
  });
}

function incomingSources(lookup: IncomingLookup): readonly ExtractedEntity[] {
  return lookup.manifestResults.flatMap((result) => {
    if (result.entity.type !== lookup.type) return [];
    return result.relationships.some(
      (relationship) =>
        relationship.type === lookup.relationshipType &&
        relationship.to === lookup.targetId,
    )
      ? [result.entity]
      : [];
  });
}

function uniqueEntities(
  entities: readonly ExtractedEntity[],
): readonly ExtractedEntity[] {
  return [
    ...new Map(entities.map((entity) => [entity.id, entity])).values(),
  ].toSorted((left, right) => left.id.localeCompare(right.id));
}

function testScope(test: ExtractedEntity): string {
  if (test.verification_scope !== undefined) return test.verification_scope;
  if (test.tags?.some((tag) => tag.toLowerCase() === "e2e") === true) {
    return "end_to_end";
  }
  return test.source.toLowerCase().includes("e2e") ? "end_to_end" : "unknown";
}

function passingTests(
  tests: readonly ExtractedEntity[],
): readonly ExtractedEntity[] {
  return tests.filter((test) => test.status === "passing");
}

function classifyCoverageDepth(coverage: RequirementCoverage): CoverageDepth {
  const allTests = uniqueEntities([
    ...coverage.directTests,
    ...coverage.scenarioTests,
  ]);
  const directPassingTests = passingTests(coverage.directTests);
  if (directPassingTests.some((test) => testScope(test) === "end_to_end")) {
    return "direct_passing_e2e";
  }

  const scenarioPassingTests = passingTests(coverage.scenarioTests);
  if (scenarioPassingTests.some((test) => testScope(test) === "end_to_end")) {
    return "scenario_passing_e2e";
  }

  const allPassingTests = passingTests(allTests);
  if (
    allPassingTests.length > 0 &&
    allPassingTests.every((test) => testScope(test) === "unit")
  ) {
    return "unit_only";
  }

  if (allTests.length > 0) return "open_or_nonpassing_tests_only";
  if (coverage.scenarioCount > 0) return "scenario_only_no_test";
  return "no_test_evidence";
}

function isReviewableCoverageDepth(
  coverageDepth: CoverageDepth,
): coverageDepth is ReviewableCoverageDepth {
  return (
    coverageDepth === "unit_only" ||
    coverageDepth === "open_or_nonpassing_tests_only" ||
    coverageDepth === "scenario_only_no_test" ||
    coverageDepth === "no_test_evidence"
  );
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].toSorted((left, right) =>
    left.localeCompare(right),
  );
}

function coverageDepthSuggestion(
  coverageDepth: ReviewableCoverageDepth,
): string {
  if (coverageDepth === "unit_only") {
    return "Keep unit coverage where appropriate; add or link a passing end-to-end or scenario-backed test when this behavior warrants e2e confidence.";
  }
  return "Add or link passing tests, preferably end-to-end or scenario-backed when this behavior warrants e2e confidence.";
}

function createDiagnostic(
  coverage: RequirementCoverage,
): QualityDiagnostic | undefined {
  const coverageDepth = classifyCoverageDepth(coverage);
  if (!isReviewableCoverageDepth(coverageDepth)) return undefined;

  const allTests = uniqueEntities([
    ...coverage.directTests,
    ...coverage.scenarioTests,
  ]);
  return {
    id: "coverage_depth_review",
    severity: "review",
    blocking: false,
    category: "coverage",
    entityId: coverage.requirement.id,
    source: coverage.requirement.source,
    files: [coverage.requirement.source],
    message: `Requirement ${coverage.requirement.id} (${coverage.requirement.title}) has ${coverageDepth} coverage depth and may need stronger behavior-level evidence.`,
    suggestion: coverageDepthSuggestion(coverageDepth),
    evidence: {
      requirementId: coverage.requirement.id,
      title: coverage.requirement.title,
      source: coverage.requirement.source,
      coverageDepth,
      directTests: coverage.directTests.map((test) => test.id),
      scenarioTests: coverage.scenarioTests.map((test) => test.id),
      testStatuses: uniqueStrings(allTests.map((test) => test.status)),
      verificationScopes: uniqueStrings(allTests.map(testScope)),
    },
  };
}

function coverageForRequirement(
  result: ExtractionResult,
  manifestResults: readonly ExtractionResult[],
  entities: ReadonlyMap<string, ExtractedEntity>,
): RequirementCoverage {
  const resultsById = new Map(
    manifestResults.map((manifestResult) => [
      manifestResult.entity.id,
      manifestResult,
    ]),
  );
  const scenarios = outgoingTargets({
    result,
    relationshipType: "specified_by",
    type: "scenario",
    entities,
  });
  const directTests = uniqueEntities([
    ...outgoingTargets({
      result,
      relationshipType: "verified_by",
      type: "test",
      entities,
    }),
    ...outgoingTargets({
      result,
      relationshipType: "covered_by",
      type: "test",
      entities,
    }),
    ...incomingSources({
      manifestResults,
      targetId: result.entity.id,
      relationshipType: "validates",
      type: "test",
    }),
  ]);
  const scenarioTests = uniqueEntities(
    scenarios.flatMap((scenario) => {
      const scenarioResult = resultsById.get(scenario.id);
      return [
        ...incomingSources({
          manifestResults,
          targetId: scenario.id,
          relationshipType: "validates",
          type: "test",
        }),
        ...(scenarioResult === undefined
          ? []
          : outgoingTargets({
              result: scenarioResult,
              relationshipType: "verified_by",
              type: "test",
              entities,
            })),
      ];
    }),
  );
  return {
    requirement: result.entity,
    scenarioCount: scenarios.length,
    directTests,
    scenarioTests,
  };
}

export function createCoverageDepthQualityDiagnostics(
  manifestResults: readonly ExtractionResult[],
): readonly QualityDiagnostic[] {
  const entities = entitiesById(manifestResults);
  return manifestResults
    .filter((result) => result.entity.type === "req")
    .flatMap((result) => {
      const diagnostic = createDiagnostic(
        coverageForRequirement(result, manifestResults, entities),
      );
      return diagnostic === undefined ? [] : [diagnostic];
    })
    .toSorted((left, right) =>
      (left.entityId ?? "").localeCompare(right.entityId ?? ""),
    );
}
