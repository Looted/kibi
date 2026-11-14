import type {
  ExtractedEntity,
  ExtractionResult,
} from "../../extractors/markdown.js";
import { hasDeclarationExtractor } from "../../plugins/source-classification.js";
import { COARSE_GRANULARITY_REASONS } from "../symbol-granularity.generated.js";
import type { QualityDiagnostic } from "./types.js";

type ReviewableCoverageDepth =
  | "unit_only"
  | "open_or_nonpassing_tests_only"
  | "scenario_only_no_test"
  | "no_test_evidence";

/** A passing end-to-end or integration test, direct or through a scenario. */
type CoverageDepth = ReviewableCoverageDepth | "behavior_level";

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
  readonly index: CoverageIndex;
  readonly targetId: string;
  readonly relationshipType: string;
  readonly type: string;
};

/**
 * Built once per report, so each requirement's coverage is a lookup rather
 * than a scan over every manifest result.
 */
type CoverageIndex = {
  readonly resultsById: ReadonlyMap<string, ExtractionResult>;
  /** Source entities by `${type}\0${relationshipType}\0${targetId}`, in manifest order. */
  readonly incomingByTarget: ReadonlyMap<string, readonly ExtractedEntity[]>;
};

function incomingKey(
  type: string,
  relationshipType: string,
  targetId: string,
): string {
  return `${type}\0${relationshipType}\0${targetId}`;
}

function coverageIndex(
  manifestResults: readonly ExtractionResult[],
): CoverageIndex {
  const incomingByTarget = new Map<string, ExtractedEntity[]>();
  // A result linking the same target twice is listed twice; every reader
  // dedupes by entity id.
  for (const result of manifestResults) {
    for (const relationship of result.relationships) {
      const key = incomingKey(
        result.entity.type,
        relationship.type,
        relationship.to,
      );
      const list = incomingByTarget.get(key);
      if (list === undefined) incomingByTarget.set(key, [result.entity]);
      else list.push(result.entity);
    }
  }
  return {
    resultsById: new Map(
      manifestResults.map((manifestResult) => [
        manifestResult.entity.id,
        manifestResult,
      ]),
    ),
    incomingByTarget,
  };
}

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
  return (
    lookup.index.incomingByTarget.get(
      incomingKey(lookup.type, lookup.relationshipType, lookup.targetId),
    ) ?? []
  );
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

const BEHAVIOR_LEVEL_SCOPES: ReadonlySet<string> = new Set([
  "end_to_end",
  "integration",
]);

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
  const allPassingTests = passingTests(allTests);
  if (
    allPassingTests.some((test) => BEHAVIOR_LEVEL_SCOPES.has(testScope(test)))
  )
    return "behavior_level";
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

export function uniqueStrings(values: readonly string[]): readonly string[] {
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
  proofEvidence:
    | Readonly<{
        readonly proofStatus?: string;
        readonly passingE2eStatus?: string;
        readonly passingE2eTests?: readonly string[];
        readonly receiptGapCodes?: readonly string[];
      }>
    | undefined,
): QualityDiagnostic | undefined {
  const coverageDepth = classifyCoverageDepth(coverage);
  if (coverageDepth === "behavior_level") return undefined;

  // A proof-exempt requirement is outside E2E-proof scope by an authored
  // reason, so asking it for e2e depth contradicts that decision.
  if (
    coverage.requirement.proof_exempt === true &&
    (coverage.requirement.proof_exempt_reason ?? "").trim() !== ""
  ) {
    return undefined;
  }

  // Structural coverage and conservative proof are separate lanes. A current
  // scenario-backed E2E receipt is strong execution evidence even when the
  // requirement remains unresolved for ontology, symbol, or coordinate gaps.
  // Do not emit a contradictory weak-depth review in that case.
  if (proofEvidence?.passingE2eStatus === "passed") return undefined;

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
      ...(proofEvidence?.proofStatus !== undefined
        ? { proofStatus: proofEvidence.proofStatus }
        : {}),
      ...(proofEvidence?.passingE2eStatus !== undefined
        ? { passingE2eStatus: proofEvidence.passingE2eStatus }
        : {}),
      ...(proofEvidence?.passingE2eTests !== undefined
        ? { passingE2eTests: [...proofEvidence.passingE2eTests] }
        : {}),
      ...(proofEvidence?.receiptGapCodes !== undefined
        ? { receiptGapCodes: [...proofEvidence.receiptGapCodes] }
        : {}),
    },
  };
}

function coverageForRequirement(
  result: ExtractionResult,
  index: CoverageIndex,
  entities: ReadonlyMap<string, ExtractedEntity>,
): RequirementCoverage {
  const resultsById = index.resultsById;
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
      index,
      targetId: result.entity.id,
      relationshipType: "validates",
      type: "test",
    }),
  ]);
  const scenarioTests = uniqueEntities(
    scenarios.flatMap((scenario) => {
      return [
        ...incomingSources({
          index,
          targetId: scenario.id,
          relationshipType: "validates",
          type: "test",
        }),
        ...outgoingTargets({
          // A scenario target was found in the same results, so it has one.
          result: resultsById.get(scenario.id) as ExtractionResult,
          relationshipType: "verified_by",
          type: "test",
          entities,
        }),
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

/**
 * Requirement statuses that keep a requirement in the coverage-depth review.
 * `closed` is reviewed only when tagged `implemented` (the documented
 * "done, with evidence" shape); a plain closed, deprecated or superseded
 * requirement is retired history, not a coverage gap.
 */
const REVIEWED_REQUIREMENT_STATUSES = new Set([
  "open",
  "in_progress",
  "active",
  "approved",
]);

function supersededRequirementIds(
  manifestResults: readonly ExtractionResult[],
): ReadonlySet<string> {
  return new Set(
    manifestResults
      .filter((result) => result.entity.type === "req")
      .flatMap((result) => result.relationships)
      .filter((relationship) => relationship.type === "supersedes")
      .map((relationship) => relationship.to),
  );
}

function isReviewableRequirement(
  requirement: ExtractedEntity,
  superseded: ReadonlySet<string>,
): boolean {
  if (superseded.has(requirement.id)) return false;
  const status = requirement.status.trim().toLowerCase();
  if (REVIEWED_REQUIREMENT_STATUSES.has(status)) return true;
  return (
    status === "closed" && requirement.tags?.includes("implemented") === true
  );
}

export function createCoverageDepthQualityDiagnostics(
  manifestResults: readonly ExtractionResult[],
  proofByRequirement: ReadonlyMap<
    string,
    Readonly<{
      readonly proofStatus?: string;
      readonly passingE2eStatus?: string;
      readonly passingE2eTests?: readonly string[];
      readonly receiptGapCodes?: readonly string[];
    }>
  > = new Map(),
): readonly QualityDiagnostic[] {
  const entities = entitiesById(manifestResults);
  const superseded = supersededRequirementIds(manifestResults);
  const index = coverageIndex(manifestResults);
  return manifestResults
    .filter(
      (result) =>
        result.entity.type === "req" &&
        isReviewableRequirement(result.entity, superseded),
    )
    .flatMap((result) => {
      const diagnostic = createDiagnostic(
        coverageForRequirement(result, index, entities),
        proofByRequirement.get(result.entity.id),
      );
      return diagnostic === undefined ? [] : [diagnostic];
    })
    .toSorted(byEntityId);
}

// Every row names its requirement.
function byEntityId(left: QualityDiagnostic, right: QualityDiagnostic): number {
  return (left.entityId as string).localeCompare(right.entityId as string);
}

const COARSE_REASONS: ReadonlySet<string> = new Set(COARSE_GRANULARITY_REASONS);

/**
 * A whole-file anchor on a file no source extractor covers (JSON, YAML,
 * workflows, extensionless scripts) has no smaller unit to link, so it is as
 * precise as it can be and the review leaves it out.
 */
function hasNarrowerUnit(symbol: ExtractedEntity, sourceFile: string): boolean {
  return (
    // has(undefined) is false: a symbol without a reason is not coarse.
    !COARSE_REASONS.has(symbol.granularity_reason as string) ||
    sourceFile === "" ||
    hasDeclarationExtractor(sourceFile)
  );
}

/**
 * Requirements whose every implementing production symbol is a whole-file
 * anchor (a coarse granularity_reason). Coverage then only says some test
 * touches the file, so `tested` evidence is cheap; narrower behavioral
 * symbols would tie it to the code that implements the claim.
 */
export function createCoarseAnchorQualityDiagnostics(
  manifestResults: readonly ExtractionResult[],
): readonly QualityDiagnostic[] {
  const superseded = supersededRequirementIds(manifestResults);
  const anchorsByRequirement = new Map<string, ExtractedEntity[]>();
  const sourceFiles = new Map<string, string>();
  for (const result of manifestResults) {
    if (result.entity.type !== "symbol") continue;
    // Executable test code is not a production symbol.
    if (result.relationships.some((rel) => rel.type === "executable_for"))
      continue;
    sourceFiles.set(result.entity.id, result.sourceFile?.trim() ?? "");
    for (const relationship of result.relationships) {
      if (relationship.type !== "implements") continue;
      const list = anchorsByRequirement.get(relationship.to) ?? [];
      list.push(result.entity);
      anchorsByRequirement.set(relationship.to, list);
    }
  }
  return manifestResults
    .filter(
      (result) =>
        result.entity.type === "req" &&
        isReviewableRequirement(result.entity, superseded),
    )
    .flatMap((result): QualityDiagnostic[] => {
      const anchors = anchorsByRequirement.get(result.entity.id);
      if (anchors === undefined) return [];
      // Every anchor was read from a symbol whose source file was recorded.
      const symbols = uniqueEntities(anchors).filter((symbol) =>
        hasNarrowerUnit(symbol, sourceFiles.get(symbol.id) as string),
      );
      if (
        symbols.length === 0 ||
        !symbols.every((symbol) =>
          COARSE_REASONS.has(symbol.granularity_reason as string),
        )
      )
        return [];
      const requirement = result.entity;
      return [
        {
          id: "coarse_anchor_only_review",
          severity: "review",
          blocking: false,
          category: "coverage",
          entityId: requirement.id,
          source: requirement.source,
          files: [requirement.source],
          message: `Requirement ${requirement.id} (${requirement.title}) is implemented only by whole-file anchors, so its coverage says a test touches those files, not the code behind the claim.`,
          suggestion:
            "Link the functions, methods or types that implement the requirement with implements (and covered_by to their tests); keep the file anchor only for genuinely module-level behavior.",
          evidence: {
            requirementId: requirement.id,
            title: requirement.title,
            symbols: symbols.map((symbol) => ({
              id: symbol.id,
              // Every symbol here has a coarse reason.
              granularityReason: symbol.granularity_reason as string,
            })),
          },
        },
      ];
    })
    .toSorted(byEntityId);
}
