import { describe, expect, it } from "bun:test";
import type { ExtractionResult } from "../../src/extractors/markdown.js";
import {
  createRequirementQualityDiagnostics,
  hasBlockingImpactDiagnostics,
} from "../../src/public/impact-diagnostics.js";

type RequirementFixture = {
  readonly id: string;
  readonly title?: string;
  readonly status?: string;
  readonly tags?: readonly string[];
  readonly logicClaims?: readonly string[];
  readonly relationshipTypes?: readonly string[];
  readonly relationships?: readonly {
    readonly type: string;
    readonly to: string;
  }[];
};

function makeRequirementResult(fixture: RequirementFixture): ExtractionResult {
  const logicClaims = Object.hasOwn(fixture, "logicClaims")
    ? fixture.logicClaims
    : ["CLAIM-AAAAAAAAAAAAAAAA"];
  return {
    entity: {
      id: fixture.id,
      type: "req",
      title: fixture.title ?? fixture.id,
      status: fixture.status ?? "active",
      created_at: "2026-06-30T00:00:00.000Z",
      updated_at: "2026-06-30T00:00:00.000Z",
      source: `.kb/requirements/${fixture.id}.md`,
      ...(fixture.tags !== undefined ? { tags: [...fixture.tags] } : {}),
      ...(logicClaims !== undefined ? { logic_claims: [...logicClaims] } : {}),
    },
    relationships:
      fixture.relationships?.map((relationship) => ({
        type: relationship.type,
        from: fixture.id,
        to: relationship.to,
      })) ??
      (fixture.relationshipTypes ?? []).map((type) => ({
        type,
        from: fixture.id,
        to: `${type.toUpperCase()}-TARGET`,
      })),
  };
}

function makeSymbolImplementing(
  requirementId: string,
  index: number,
): ExtractionResult {
  return {
    entity: {
      id: `SYM-BROAD-${index}`,
      type: "symbol",
      title: `broadSymbol${index}`,
      status: "active",
      created_at: "2026-06-30T00:00:00.000Z",
      updated_at: "2026-06-30T00:00:00.000Z",
      source: ".kb/symbols.yaml",
    },
    sourceFile: "src/broad.ts",
    relationships: [
      { type: "implements", from: `SYM-BROAD-${index}`, to: requirementId },
    ],
  };
}

function makeTestResult(status: string): ExtractionResult {
  return {
    entity: {
      id: "TEST-PASSING",
      type: "test",
      title: "Passing test record",
      status,
      created_at: "2026-06-30T00:00:00.000Z",
      updated_at: "2026-06-30T00:00:00.000Z",
      source: ".kb/tests/TEST-PASSING.md",
    },
    relationships: [],
  };
}

describe("requirement quality impact diagnostics", () => {
  it("emits broad requirement review for a current requirement linked to nine symbols", () => {
    const requirement = makeRequirementResult({ id: "REQ-BROAD" });
    const symbols = Array.from({ length: 9 }, (_unused, index) =>
      makeSymbolImplementing("REQ-BROAD", index + 1),
    );

    const diagnostics = createRequirementQualityDiagnostics({
      manifestResults: [requirement, ...symbols],
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        id: "broad_requirement_review",
        severity: "review",
        blocking: false,
        category: "requirement",
        entityId: "REQ-BROAD",
        evidence: expect.objectContaining({
          implementingSymbolCount: 9,
          implementingSymbolThreshold: 8,
          implementingSymbolIds: symbols.map((symbol) => symbol.entity.id),
        }),
      }),
    ]);
    expect(hasBlockingImpactDiagnostics(diagnostics)).toBe(false);
  });

  it("does not emit broad requirement review for umbrella requirements", () => {
    const requirement = makeRequirementResult({
      id: "REQ-UMBRELLA",
      tags: ["umbrella"],
    });
    const symbols = Array.from({ length: 9 }, (_unused, index) =>
      makeSymbolImplementing("REQ-UMBRELLA", index + 1),
    );

    expect(
      createRequirementQualityDiagnostics({
        manifestResults: [requirement, ...symbols],
      }),
    ).toEqual([]);
  });

  it("does not emit broad requirement review for epic requirements", () => {
    const requirement = makeRequirementResult({
      id: "REQ-EPIC",
      tags: ["epic"],
    });
    const symbols = Array.from({ length: 9 }, (_unused, index) =>
      makeSymbolImplementing("REQ-EPIC", index + 1),
    );

    expect(
      createRequirementQualityDiagnostics({
        manifestResults: [requirement, ...symbols],
      }),
    ).toEqual([]);
  });

  it("emits broad requirement review for scenario, test, and dependent-requirement fanout", () => {
    const requirement = makeRequirementResult({
      id: "REQ-FANOUT",
      relationships: [
        ...Array.from({ length: 7 }, (_unused, index) => ({
          type: "specified_by",
          to: `SCEN-${index + 1}`,
        })),
        ...Array.from({ length: 9 }, (_unused, index) => ({
          type: "verified_by",
          to: `TEST-${index + 1}`,
        })),
        ...Array.from({ length: 3 }, (_unused, index) => ({
          type: "depends_on",
          to: `REQ-DEP-${index + 1}`,
        })),
      ],
    });
    const reverseDependents = Array.from({ length: 3 }, (_unused, index) =>
      makeRequirementResult({
        id: `REQ-REVERSE-${index + 1}`,
        relationships: [{ type: "depends_on", to: "REQ-FANOUT" }],
      }),
    );

    const diagnostics = createRequirementQualityDiagnostics({
      manifestResults: [requirement, ...reverseDependents],
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        id: "broad_requirement_review",
        evidence: expect.objectContaining({
          scenarioCount: 7,
          testCount: 9,
          dependentRequirementCount: 6,
        }),
      }),
    ]);
    // Reverse dependents are requirements, never implementers.
    expect(diagnostics[0]?.evidence).toEqual(
      expect.objectContaining({ implementingSymbolIds: [] }),
    );
  });

  it("reads fanout from known target types, every link kind and split records", () => {
    const entity = (id: string, type: string): ExtractionResult => ({
      entity: {
        id,
        type,
        title: id,
        status: "active",
        created_at: "2026-06-30T00:00:00.000Z",
        updated_at: "2026-06-30T00:00:00.000Z",
        source: `.kb/${id}.md`,
      },
      relationships: [],
    });
    const scenarios = Array.from({ length: 7 }, (_unused, index) =>
      entity(`SCEN-KNOWN-${index + 1}`, "scenario"),
    );
    const tests = Array.from({ length: 9 }, (_unused, index) =>
      entity(`TEST-KNOWN-${index + 1}`, "test"),
    );
    const dependencies = Array.from({ length: 6 }, (_unused, index) =>
      entity(`REQ-KNOWN-DEP-${index + 1}`, "req"),
    );
    // The requirement's links are split over two records with its id.
    const first = makeRequirementResult({
      id: "REQ-KNOWN",
      relationships: [
        ...scenarios.map((item) => ({
          type: "specified_by",
          to: item.entity.id,
        })),
        ...tests
          .slice(0, 5)
          .map((item) => ({ type: "covered_by", to: item.entity.id })),
      ],
    });
    const second = makeRequirementResult({
      id: "REQ-KNOWN",
      relationships: [
        ...tests
          .slice(5)
          .map((item) => ({ type: "verified_by", to: item.entity.id })),
        ...dependencies.map((item) => ({
          type: "depends_on",
          to: item.entity.id,
        })),
      ],
    });
    // Only a requirement depending on it is a dependent; a test depending
    // on it or a requirement relating to it is not.
    const testDependsOn: ExtractionResult = {
      ...entity("TEST-DEPENDS", "test"),
      relationships: [
        { type: "depends_on", from: "TEST-DEPENDS", to: "REQ-KNOWN" },
      ],
    };
    const relatedRequirement = makeRequirementResult({
      id: "REQ-RELATED",
      relationships: [{ type: "relates_to", to: "REQ-KNOWN" }],
    });

    const broad = createRequirementQualityDiagnostics({
      manifestResults: [
        first,
        second,
        ...scenarios,
        ...tests,
        ...dependencies,
        testDependsOn,
        relatedRequirement,
      ],
    }).filter(
      (diagnostic) =>
        diagnostic.entityId === "REQ-KNOWN" &&
        diagnostic.id === "broad_requirement_review",
    );

    expect(broad).toHaveLength(2);
    expect(broad[0]?.evidence).toEqual(
      expect.objectContaining({
        implementingSymbolIds: [],
        scenarioCount: 7,
        testCount: 9,
        dependentRequirementIds: dependencies.map((item) => item.entity.id),
      }),
    );
  });

  it("ignores fanout targets with known mismatched entity types", () => {
    const requirement = makeRequirementResult({
      id: "REQ-MISMATCHED-TARGETS",
      relationships: [
        { type: "specified_by", to: "TEST-NOT-SCENARIO" },
        { type: "verified_by", to: "SCEN-NOT-TEST" },
        { type: "depends_on", to: "TEST-NOT-REQ" },
      ],
    });

    expect(
      createRequirementQualityDiagnostics({
        manifestResults: [
          requirement,
          makeTestResult("passing"),
          {
            ...makeTestResult("passing"),
            entity: {
              ...makeTestResult("passing").entity,
              id: "TEST-NOT-SCENARIO",
            },
          },
          {
            ...makeRequirementResult({ id: "SCEN-NOT-TEST" }),
            entity: {
              ...makeRequirementResult({ id: "SCEN-NOT-TEST" }).entity,
              type: "scenario",
            },
          },
          {
            ...makeTestResult("passing"),
            entity: { ...makeTestResult("passing").entity, id: "TEST-NOT-REQ" },
          },
        ],
      }).filter((diagnostic) => diagnostic.id === "broad_requirement_review"),
    ).toEqual([]);
  });

  it("emits requirement status review for a requirement using passing status", () => {
    const diagnostics = createRequirementQualityDiagnostics({
      manifestResults: [
        makeRequirementResult({ id: "REQ-PASSING", status: "passing" }),
      ],
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        id: "requirement_status_review",
        severity: "review",
        blocking: false,
        category: "status",
        entityId: "REQ-PASSING",
        evidence: expect.objectContaining({ status: "passing" }),
      }),
    ]);
  });

  it("does not emit requirement status review for a passing test", () => {
    expect(
      createRequirementQualityDiagnostics({
        manifestResults: [makeTestResult("passing")],
      }),
    ).toEqual([]);
  });

  it("emits logical coverage review for normative current requirements without a claim manifest", () => {
    const diagnostics = createRequirementQualityDiagnostics({
      manifestResults: [
        makeRequirementResult({
          id: "REQ-NORMATIVE",
          title: "Users must retain data for at least 7 years",
          logicClaims: [],
        }),
      ],
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        id: "logical_coverage_review",
        severity: "review",
        blocking: false,
        category: "fact",
        entityId: "REQ-NORMATIVE",
        suggestion: expect.stringContaining("kb_model (mode requirement"),
        evidence: expect.objectContaining({ strictRelationshipTypes: [] }),
      }),
    ]);
  });

  it("does not mistake strict fact relationships for a complete clause manifest", () => {
    const diagnostics = createRequirementQualityDiagnostics({
      manifestResults: [
        makeRequirementResult({
          id: "REQ-STRICT-LINKED",
          title: "Users must retain data for at least 7 years",
          logicClaims: [],
          relationshipTypes: ["constrains", "requires_property"],
        }),
      ],
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({ id: "logical_coverage_review" }),
    ]);
  });

  it("suppresses logical coverage review when the requirement declares a claim manifest", () => {
    expect(
      createRequirementQualityDiagnostics({
        manifestResults: [
          makeRequirementResult({
            id: "REQ-LOGIC-MANIFEST",
            title: "Users must retain data for at least 7 years",
            logicClaims: ["CLAIM-AAAAAAAAAAAAAAAA"],
            relationshipTypes: ["constrains", "requires_property"],
          }),
        ],
      }),
    ).toEqual([]);
  });

  it("suppresses logical coverage review when a hard violation already names the requirement", () => {
    expect(
      createRequirementQualityDiagnostics({
        manifestResults: [
          makeRequirementResult({
            id: "REQ-HARD-STRICT-VIOLATION",
            title: "Users must retain data for at least 7 years",
            logicClaims: [],
          }),
        ],
        hardViolationEntityIds: new Set(["REQ-HARD-STRICT-VIOLATION"]),
      }),
    ).toEqual([]);
  });

  it("emits logical coverage review for every current requirement even when its title is neutral", () => {
    const diagnostics = createRequirementQualityDiagnostics({
      manifestResults: [
        makeRequirementResult({
          id: "REQ-NEUTRAL-TITLE",
          title: "User profile editing experience",
          logicClaims: [],
        }),
      ],
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        id: "logical_coverage_review",
        entityId: "REQ-NEUTRAL-TITLE",
      }),
    ]);
  });

  it("does not emit quality reviews for closed normative requirements", () => {
    expect(
      createRequirementQualityDiagnostics({
        manifestResults: [
          makeRequirementResult({
            id: "REQ-CLOSED",
            status: "closed",
            title: "Users must close old sessions",
          }),
        ],
      }),
    ).toEqual([]);
  });
});
