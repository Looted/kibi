import { describe, expect, it } from "bun:test";
import type { QualityDiagnostic } from "../../src/public/impact-diagnostics";
import { hasBlockingQualityDiagnostics } from "../../src/public/impact-diagnostics";

import {
  KIBI_IMPACT_DIAGNOSTICS,
  KIBI_IMPACT_DIAGNOSTIC_IDS,
  classifyKibiImpactEvidence,
  isAuditedNoImpactOverrideAllowed,
  isBehaviorSourceEdit,
  parseKibiImpactOverride,
} from "../../src/traceability/staged-impact-contract";

describe("staged impact contract", () => {
	it("keeps advisory quality diagnostics non-blocking while honoring explicit blockers", () => {
		const advisoryDiagnostics: readonly QualityDiagnostic[] = [
			{
				id: "broad_requirement_review",
				severity: "review",
				blocking: false,
				category: "requirement",
				message: "Requirement spans multiple outcomes.",
				suggestion: "Split the requirement before adding more traceability.",
			},
			{
				id: "coverage_depth_review",
				severity: "info",
				blocking: false,
				category: "coverage",
				message: "Coverage is unit-only.",
				suggestion: "Consider end-to-end coverage for user-visible behavior.",
			},
		];
		const blockingDiagnostics: readonly QualityDiagnostic[] = [
			...advisoryDiagnostics,
			{
				id: "symbol_granularity_violation",
				severity: "review",
				blocking: true,
				category: "symbol",
				message: "Existing staged symbol granularity violation blocks.",
				suggestion: "Move ownership to the narrower behavioral symbol.",
			},
		];

		expect(hasBlockingQualityDiagnostics(advisoryDiagnostics)).toBe(false);
		expect(hasBlockingQualityDiagnostics(blockingDiagnostics)).toBe(true);
	});

	it("uses stable diagnostic ids and resolution steps", () => {
    expect(KIBI_IMPACT_DIAGNOSTIC_IDS).toEqual([
      "kibi_impact_evidence_missing",
      "symbols_manifest_stale",
      "kibi_impact_override_missing_rationale",
    ]);

    expect(
      KIBI_IMPACT_DIAGNOSTICS.kibi_impact_evidence_missing.resolution.join(
        "\n",
      ),
    ).toContain("kb_search");
    expect(
      KIBI_IMPACT_DIAGNOSTICS.kibi_impact_evidence_missing.resolution.join(
        "\n",
      ),
    ).toContain("kb_query");
    expect(
      KIBI_IMPACT_DIAGNOSTICS.kibi_impact_evidence_missing.resolution.join(
        "\n",
      ),
    ).toContain("kibi check --staged");

    expect(
      KIBI_IMPACT_DIAGNOSTICS.symbols_manifest_stale.resolution.join("\n"),
    ).toContain("documentation/symbols.yaml");

    expect(
      KIBI_IMPACT_DIAGNOSTICS.kibi_impact_override_missing_rationale.resolution.join(
        "\n",
      ),
    ).toContain("Kibi-Impact: none");
    expect(
      KIBI_IMPACT_DIAGNOSTICS.kibi_impact_override_missing_rationale.resolution.join(
        "\n",
      ),
    ).toContain("Rationale:");
  });

  it("treats documentation/symbols.yaml as valid evidence when extraction output changes", () => {
    expect(
      classifyKibiImpactEvidence({
        filePath: "documentation/symbols.yaml",
        extractionOutputChanged: true,
      }),
    ).toBe("symbols_manifest");

    expect(
      classifyKibiImpactEvidence({
        filePath: "documentation/symbols.yaml",
        extractionOutputChanged: false,
      }),
    ).toBeNull();

    expect(
      classifyKibiImpactEvidence({
        filePath: "documentation/facts/FACT-IMPACT-001.md",
      }),
    ).toBe("entity_markdown");
  });

  it("treats .yml and configured symbols manifest paths as valid evidence", () => {
    expect(
      classifyKibiImpactEvidence({
        filePath: "documentation/symbols.yml",
        extractionOutputChanged: true,
      }),
    ).toBe("symbols_manifest");

    expect(
      classifyKibiImpactEvidence({
        filePath: "custom/my-symbols.yaml",
        symbolsManifestPath: "custom/my-symbols.yaml",
        extractionOutputChanged: true,
      }),
    ).toBe("symbols_manifest");
  });

  it("excludes comment-only and formatting-only diffs from behavior source edits", () => {
    const commentOnlyDiff = [
      "@@ -1,3 +1,3 @@",
      "-// Old explanation",
      "+// New explanation",
      " export function publish() {",
      '   return "ok";',
      " }",
    ].join("\n");

    const formattingOnlyDiff = [
      "@@ -1,3 +1,3 @@",
      "-export function publish(){",
      "+export function publish() {",
      '-  return "ok";}',
      '+  return "ok"; }',
    ].join("\n");

    expect(
      isBehaviorSourceEdit({
        path: "src/publish.ts",
        diffText: commentOnlyDiff,
        intersectsBehaviorBearingSymbol: true,
      }),
    ).toBe(false);

    expect(
      isBehaviorSourceEdit({
        path: "src/publish.ts",
        diffText: formattingOnlyDiff,
        intersectsBehaviorBearingSymbol: true,
      }),
    ).toBe(false);

    expect(
      isBehaviorSourceEdit({
        path: "src/publish.ts",
        diffText: [
          "@@ -1,3 +1,3 @@",
          " export function publish() {",
          '-  return "ok";',
          '+  return "published";',
          " }",
        ].join("\n"),
        intersectsBehaviorBearingSymbol: true,
      }),
    ).toBe(true);

    expect(
      isBehaviorSourceEdit({
        path: "README.md",
        diffText: commentOnlyDiff,
        intersectsBehaviorBearingSymbol: true,
      }),
    ).toBe(false);
  });

  it("requires rationale for audited no-impact overrides and forbids overriding genuine behavior edits", () => {
    expect(
      parseKibiImpactOverride(
        [
          "Kibi-Impact: none",
          "Rationale: comment-only edit in exported function",
        ].join("\n"),
      ),
    ).toEqual({
      declared: true,
      rationale: "comment-only edit in exported function",
    });

    expect(parseKibiImpactOverride("Kibi-Impact: none\n")).toEqual({
      declared: true,
      rationale: null,
    });

    expect(
      isAuditedNoImpactOverrideAllowed({
        behaviorSourceEdit: false,
        override: parseKibiImpactOverride(
          "Kibi-Impact: none\nRationale: formatting-only change",
        ),
      }),
    ).toBe(true);

    expect(
      isAuditedNoImpactOverrideAllowed({
        behaviorSourceEdit: true,
        override: parseKibiImpactOverride(
          "Kibi-Impact: none\nRationale: should not bypass behavior change",
        ),
      }),
    ).toBe(false);
  });
});
