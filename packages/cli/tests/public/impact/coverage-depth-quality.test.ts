import { describe, expect, it } from "bun:test";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";
import {
  createCoarseAnchorQualityDiagnostics,
  createCoverageDepthQualityDiagnostics,
} from "../../../src/public/impact/coverage-depth-quality.js";

type EntityFixture = {
  readonly id: string;
  readonly type: string;
  readonly title?: string;
  readonly status?: string;
  readonly source?: string;
  readonly tags?: readonly string[];
  readonly verificationScope?: "unit" | "integration" | "end_to_end";
};

function result(
  entity: EntityFixture,
  relationships: ExtractionResult["relationships"] = [],
): ExtractionResult {
  return {
    entity: {
      id: entity.id,
      type: entity.type,
      title: entity.title ?? entity.id,
      status: entity.status ?? "active",
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-01T00:00:00.000Z",
      source: entity.source ?? `documentation/${entity.id}.md`,
      ...(entity.tags !== undefined ? { tags: [...entity.tags] } : {}),
      ...(entity.verificationScope !== undefined
        ? { verification_scope: entity.verificationScope }
        : {}),
    },
    relationships,
  };
}

describe("createCoverageDepthQualityDiagnostics", () => {
  it("emits no-test evidence review when a requirement has no scenarios or tests", () => {
    const diagnostics = createCoverageDepthQualityDiagnostics([
      result({ id: "REQ-NO-EVIDENCE", type: "req", title: "No evidence" }),
    ]);

    expect(diagnostics).toEqual([
      expect.objectContaining({
        id: "coverage_depth_review",
        entityId: "REQ-NO-EVIDENCE",
        suggestion: expect.stringContaining("Add or link passing tests"),
        evidence: expect.objectContaining({
          coverageDepth: "no_test_evidence",
          directTests: [],
          scenarioTests: [],
          testStatuses: [],
          verificationScopes: [],
        }),
      }),
    ]);
  });

  it("emits scenario-only review when a requirement is specified but scenarios lack tests", () => {
    const requirement = result({ id: "REQ-SCENARIO", type: "req" }, [
      { type: "specified_by", from: "REQ-SCENARIO", to: "SCEN-ONLY" },
    ]);
    const scenario = result({ id: "SCEN-ONLY", type: "scenario" });

    const diagnostics = createCoverageDepthQualityDiagnostics([
      requirement,
      scenario,
    ]);

    expect(diagnostics[0]?.evidence).toEqual(
      expect.objectContaining({ coverageDepth: "scenario_only_no_test" }),
    );
  });

  it("counts every test that validates a requirement, each once", () => {
    const requirement = result({ id: "REQ-VALIDATED", type: "req" });
    const testB = result(
      { id: "TEST-VALIDATES-B", type: "test", status: "open" },
      [
        { type: "validates", from: "TEST-VALIDATES-B", to: "REQ-VALIDATED" },
        { type: "validates", from: "TEST-VALIDATES-B", to: "REQ-VALIDATED" },
      ],
    );
    const testA = result(
      { id: "TEST-VALIDATES-A", type: "test", status: "open" },
      [{ type: "validates", from: "TEST-VALIDATES-A", to: "REQ-VALIDATED" }],
    );

    const diagnostics = createCoverageDepthQualityDiagnostics([
      requirement,
      testB,
      testA,
    ]);

    expect(diagnostics[0]?.evidence).toEqual(
      expect.objectContaining({
        directTests: ["TEST-VALIDATES-A", "TEST-VALIDATES-B"],
        testStatuses: ["open"],
      }),
    );
  });

  it("emits open-test review when linked tests are not passing", () => {
    const requirement = result({ id: "REQ-OPEN", type: "req" }, [
      { type: "verified_by", from: "REQ-OPEN", to: "TEST-OPEN" },
    ]);
    const test = result({ id: "TEST-OPEN", type: "test", status: "open" });

    const diagnostics = createCoverageDepthQualityDiagnostics([
      requirement,
      test,
    ]);

    expect(diagnostics[0]?.evidence).toEqual(
      expect.objectContaining({
        coverageDepth: "open_or_nonpassing_tests_only",
        directTests: ["TEST-OPEN"],
        testStatuses: ["open"],
      }),
    );
  });

  it("emits unit-only review for direct and scenario passing unit tests", () => {
    const requirement = result({ id: "REQ-UNIT", type: "req" }, [
      { type: "covered_by", from: "REQ-UNIT", to: "TEST-DIRECT-UNIT" },
      { type: "specified_by", from: "REQ-UNIT", to: "SCEN-UNIT" },
    ]);
    const scenario = result({ id: "SCEN-UNIT", type: "scenario" }, [
      { type: "verified_by", from: "SCEN-UNIT", to: "TEST-SCENARIO-UNIT" },
    ]);
    const directTest = result({
      id: "TEST-DIRECT-UNIT",
      type: "test",
      status: "passing",
      verificationScope: "unit",
    });
    const scenarioTest = result({
      id: "TEST-SCENARIO-UNIT",
      type: "test",
      status: "passing",
      verificationScope: "unit",
    });

    const diagnostics = createCoverageDepthQualityDiagnostics([
      requirement,
      scenario,
      directTest,
      scenarioTest,
    ]);

    expect(diagnostics[0]?.suggestion).toContain("Keep unit coverage");
    expect(diagnostics[0]?.evidence).toEqual(
      expect.objectContaining({
        coverageDepth: "unit_only",
        directTests: ["TEST-DIRECT-UNIT"],
        scenarioTests: ["TEST-SCENARIO-UNIT"],
        verificationScopes: ["unit"],
      }),
    );
  });

  it("suppresses review for direct passing integration and e2e tests", () => {
    const integrationRequirement = result(
      { id: "REQ-DIRECT-INTEGRATION", type: "req" },
      [{ type: "verified_by", from: "REQ-DIRECT-INTEGRATION", to: "TEST-INT" }],
    );
    const e2eRequirement = result({ id: "REQ-DIRECT-E2E", type: "req" }, [
      { type: "verified_by", from: "REQ-DIRECT-E2E", to: "TEST-E2E" },
    ]);

    expect(
      createCoverageDepthQualityDiagnostics([
        integrationRequirement,
        e2eRequirement,
        result({
          id: "TEST-INT",
          type: "test",
          status: "passing",
          verificationScope: "integration",
        }),
        result({
          id: "TEST-E2E",
          type: "test",
          status: "passing",
          source: "documentation/tests/e2e/upload.md",
        }),
      ]),
    ).toEqual([]);
  });

  it("suppresses review for scenario-backed passing integration and e2e tests", () => {
    const integrationRequirement = result(
      { id: "REQ-SCENARIO-INTEGRATION", type: "req" },
      [
        {
          type: "specified_by",
          from: "REQ-SCENARIO-INTEGRATION",
          to: "SCEN-INTEGRATION",
        },
      ],
    );
    const e2eRequirement = result({ id: "REQ-SCENARIO-E2E", type: "req" }, [
      { type: "specified_by", from: "REQ-SCENARIO-E2E", to: "SCEN-E2E" },
    ]);
    const integrationScenario = result(
      { id: "SCEN-INTEGRATION", type: "scenario" },
      [{ type: "verified_by", from: "SCEN-INTEGRATION", to: "TEST-SCEN-INT" }],
    );
    const e2eScenario = result({ id: "SCEN-E2E", type: "scenario" });
    const e2eTest = result(
      {
        id: "TEST-SCEN-E2E",
        type: "test",
        status: "passing",
        tags: ["smoke", "E2E"],
      },
      [{ type: "validates", from: "TEST-SCEN-E2E", to: "SCEN-E2E" }],
    );

    expect(
      createCoverageDepthQualityDiagnostics([
        integrationRequirement,
        e2eRequirement,
        integrationScenario,
        e2eScenario,
        result({
          id: "TEST-SCEN-INT",
          type: "test",
          status: "passing",
          verificationScope: "integration",
        }),
        e2eTest,
      ]),
    ).toEqual([]);
  });

  it("suppresses a stale weak-depth heuristic when current receipt proof passes", () => {
    const requirement = result({ id: "REQ-ACTIVE-E2E", type: "req" }, [
      {
        type: "specified_by",
        from: "REQ-ACTIVE-E2E",
        to: "SCEN-ACTIVE-E2E",
      },
    ]);
    const scenario = result({ id: "SCEN-ACTIVE-E2E", type: "scenario" }, [
      { type: "verified_by", from: "SCEN-ACTIVE-E2E", to: "TEST-ACTIVE-E2E" },
    ]);
    const test = result({
      id: "TEST-ACTIVE-E2E",
      type: "test",
      status: "active",
      verificationScope: "end_to_end",
    });

    expect(
      createCoverageDepthQualityDiagnostics(
        [requirement, scenario, test],
        new Map([
          [
            "REQ-ACTIVE-E2E",
            {
              proofStatus: "unresolved",
              passingE2eStatus: "passed",
              passingE2eTests: ["TEST-ACTIVE-E2E"],
            },
          ],
        ]),
      ),
    ).toEqual([]);
  });

  it("keeps the review when receipt evidence is not current", () => {
    const requirement = result({ id: "REQ-STALE-E2E", type: "req" }, [
      { type: "specified_by", from: "REQ-STALE-E2E", to: "SCEN-STALE-E2E" },
    ]);
    const scenario = result({ id: "SCEN-STALE-E2E", type: "scenario" }, [
      { type: "verified_by", from: "SCEN-STALE-E2E", to: "TEST-STALE-E2E" },
    ]);
    const test = result({
      id: "TEST-STALE-E2E",
      type: "test",
      status: "active",
      verificationScope: "end_to_end",
    });

    const diagnostics = createCoverageDepthQualityDiagnostics(
      [requirement, scenario, test],
      new Map([
        [
          "REQ-STALE-E2E",
          {
            proofStatus: "unresolved",
            passingE2eStatus: "unresolved",
            receiptGapCodes: ["stale_verification_receipt"],
          },
        ],
      ]),
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.evidence).toEqual(
      expect.objectContaining({
        passingE2eStatus: "unresolved",
        receiptGapCodes: ["stale_verification_receipt"],
      }),
    );
  });

  it("deduplicates incoming direct tests and sorts diagnostics by requirement id", () => {
    const later = result({ id: "REQ-Z", type: "req" });
    const earlier = result({ id: "REQ-A", type: "req" }, [
      { type: "verified_by", from: "REQ-A", to: "TEST-DUP" },
    ]);
    const test = result({ id: "TEST-DUP", type: "test", status: "open" }, [
      { type: "validates", from: "TEST-DUP", to: "REQ-A" },
    ]);

    const diagnostics = createCoverageDepthQualityDiagnostics([
      later,
      earlier,
      test,
    ]);

    expect(diagnostics.map((diagnostic) => diagnostic.entityId)).toEqual([
      "REQ-A",
      "REQ-Z",
    ]);
    expect(diagnostics[0]?.evidence).toEqual(
      expect.objectContaining({ directTests: ["TEST-DUP"] }),
    );
  });

  it("reviews only current requirements: retired closed, deprecated and superseded ones are skipped", () => {
    const diagnostics = createCoverageDepthQualityDiagnostics([
      result({ id: "REQ-OPEN", type: "req", status: "open" }),
      result({ id: "REQ-IN-PROGRESS", type: "req", status: "in_progress" }),
      result({ id: "REQ-CLOSED", type: "req", status: "closed" }),
      result({
        id: "REQ-CLOSED-IMPLEMENTED",
        type: "req",
        status: "closed",
        tags: ["implemented"],
      }),
      result({ id: "REQ-DEPRECATED", type: "req", status: "deprecated" }),
      result({
        id: "REQ-SUPERSEDED-STATUS",
        type: "req",
        status: "superseded",
      }),
      result({ id: "REQ-OLD", type: "req", status: "open" }),
      result({ id: "REQ-NEW", type: "req", status: "open" }, [
        { type: "supersedes", from: "REQ-NEW", to: "REQ-OLD" },
      ]),
    ]);

    expect(diagnostics.map((diagnostic) => diagnostic.entityId)).toEqual([
      "REQ-CLOSED-IMPLEMENTED",
      "REQ-IN-PROGRESS",
      "REQ-NEW",
      "REQ-OPEN",
    ]);
  });
});

describe("createCoarseAnchorQualityDiagnostics", () => {
  const symbol = (
    id: string,
    granularityReason: string | undefined,
    relationships: ExtractionResult["relationships"],
  ): ExtractionResult => {
    const base = result({ id, type: "symbol" }, relationships);
    return granularityReason === undefined
      ? base
      : {
          ...base,
          entity: { ...base.entity, granularity_reason: granularityReason },
        };
  };

  it("reviews a requirement implemented only by whole-file anchors", () => {
    const diagnostics = createCoarseAnchorQualityDiagnostics([
      result({ id: "REQ-COARSE", type: "req" }),
      symbol("SYM-file", "module-level-behavior", [
        { type: "implements", from: "SYM-file", to: "REQ-COARSE" },
      ]),
      // A test-suite symbol is executable test code, not production code.
      symbol("SYM-suite", "test-suite", [
        { type: "implements", from: "SYM-suite", to: "REQ-COARSE" },
        { type: "executable_for", from: "SYM-suite", to: "TEST-x" },
      ]),
    ]);
    expect(diagnostics).toEqual([
      expect.objectContaining({
        id: "coarse_anchor_only_review",
        entityId: "REQ-COARSE",
        blocking: false,
        evidence: expect.objectContaining({
          symbols: [
            { id: "SYM-file", granularityReason: "module-level-behavior" },
          ],
        }),
      }),
    ]);
  });

  it("stays quiet once a narrower symbol implements the requirement", () => {
    expect(
      createCoarseAnchorQualityDiagnostics([
        result({ id: "REQ-MIXED", type: "req" }),
        symbol("SYM-file", "extractor-miss", [
          { type: "implements", from: "SYM-file", to: "REQ-MIXED" },
        ]),
        symbol("SYM-fn", undefined, [
          { type: "implements", from: "SYM-fn", to: "REQ-MIXED" },
        ]),
      ]),
    ).toEqual([]);
  });
});
