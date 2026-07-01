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
  readonly relationshipTypes?: readonly string[];
};

function makeRequirementResult(fixture: RequirementFixture): ExtractionResult {
  return {
    entity: {
      id: fixture.id,
      type: "req",
      title: fixture.title ?? fixture.id,
      status: fixture.status ?? "active",
      created_at: "2026-06-30T00:00:00.000Z",
      updated_at: "2026-06-30T00:00:00.000Z",
      source: `documentation/requirements/${fixture.id}.md`,
      ...(fixture.tags !== undefined ? { tags: [...fixture.tags] } : {}),
    },
    relationships: (fixture.relationshipTypes ?? []).map((type) => ({
      type,
      from: fixture.id,
      to: `${type.toUpperCase()}-TARGET`,
    })),
  };
}

function makeSymbolImplementing(requirementId: string, index: number): ExtractionResult {
  return {
    entity: {
      id: `SYM-BROAD-${index}`,
      type: "symbol",
      title: `broadSymbol${index}`,
      status: "active",
      created_at: "2026-06-30T00:00:00.000Z",
      updated_at: "2026-06-30T00:00:00.000Z",
      source: "documentation/symbols.yaml",
    },
    sourceFile: "src/broad.ts",
    relationships: [{ type: "implements", from: `SYM-BROAD-${index}`, to: requirementId }],
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
      source: "documentation/tests/TEST-PASSING.md",
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

  it("downgrades broad requirement review to info for umbrella requirements", () => {
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
    ).toEqual([
      expect.objectContaining({
        id: "broad_requirement_review",
        severity: "info",
        blocking: false,
        entityId: "REQ-UMBRELLA",
      }),
    ]);
  });

  it("emits requirement status review for a requirement using passing status", () => {
    const diagnostics = createRequirementQualityDiagnostics({
      manifestResults: [makeRequirementResult({ id: "REQ-PASSING", status: "passing" })],
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

  it("emits strict fact modeling review for normative current requirements without strict links", () => {
    const diagnostics = createRequirementQualityDiagnostics({
      manifestResults: [
        makeRequirementResult({
          id: "REQ-NORMATIVE",
          title: "Users must retain data for at least 7 years",
        }),
      ],
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        id: "strict_fact_modeling_review",
        severity: "review",
        blocking: false,
        category: "fact",
        entityId: "REQ-NORMATIVE",
        suggestion: expect.stringContaining("kb_model_requirement"),
        evidence: expect.objectContaining({ matchedIndicators: ["must", "at least"] }),
      }),
    ]);
  });

  it("suppresses strict fact modeling review when strict fact relationships exist", () => {
    expect(
      createRequirementQualityDiagnostics({
        manifestResults: [
          makeRequirementResult({
            id: "REQ-STRICT-LINKED",
            title: "Users must retain data for at least 7 years",
            relationshipTypes: ["constrains", "requires_property"],
          }),
        ],
      }),
    ).toEqual([]);
  });

  it("suppresses strict fact modeling review when a hard violation already names the requirement", () => {
    expect(
      createRequirementQualityDiagnostics({
        manifestResults: [
          makeRequirementResult({
            id: "REQ-HARD-STRICT-VIOLATION",
            title: "Users must retain data for at least 7 years",
          }),
        ],
        hardViolationEntityIds: new Set(["REQ-HARD-STRICT-VIOLATION"]),
      }),
    ).toEqual([]);
  });

  it("does not emit strict fact modeling review for non-normative requirements", () => {
    expect(
      createRequirementQualityDiagnostics({
        manifestResults: [
          makeRequirementResult({
            id: "REQ-NARRATIVE",
            title: "User profile editing experience",
          }),
        ],
      }),
    ).toEqual([]);
  });
});
