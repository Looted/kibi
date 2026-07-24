import { describe, expect, test } from "bun:test";
import { JsonValueSchema, contractHash } from "../contracts/common";
import { buildReportArtifacts, renderReportMarkdown } from "../report";

const RUN_ID = "00000000-0000-4000-8000-000000000101";
const RUN_LOCK_HASH = "a".repeat(64);
const PRICING_HASH = "b".repeat(64);

function reportInput() {
  return {
    runId: RUN_ID,
    runLockHash: RUN_LOCK_HASH,
    skill: "kibi-usage" as const,
    cells: [
      { taskId: "public-task", score: 91 },
      { taskId: "private-task", token: "private-sentinel" },
    ],
    privateValues: ["private-sentinel"],
    priceEquivalentEstimate: {
      currency: "USD" as const,
      amount: 1.25,
      pricingHash: PRICING_HASH,
      kind: "price-equivalent-estimate-not-invoice" as const,
    },
    gateOutcome: "pass" as const,
    gateResults: {
      aggregate: true,
      bootstrap: true,
      family: true,
      security: true,
      bundle: null,
    },
    generatedAt: "2026-07-23T12:00:00Z",
  };
}

describe("SkillOpt report artifacts", () => {
  test("derives Markdown and the report hash from authoritative machine JSON", () => {
    // Given
    const input = reportInput();

    // When
    const artifacts = buildReportArtifacts(input);
    const parsed = JSON.parse(artifacts.json);

    // Then
    expect(artifacts.markdown).toBe(renderReportMarkdown(artifacts.json));
    expect(artifacts.reportHash).toBe(
      contractHash(JsonValueSchema.parse(parsed)),
    );
    expect(parsed).toEqual(artifacts.report);
  });

  test("redacts private values before hashing cells or rendering output", () => {
    // Given
    const input = reportInput();
    const explicitlyRedacted = {
      ...input,
      cells: [input.cells[0], { taskId: "private-task", token: "[REDACTED]" }],
      privateValues: [],
    };

    // When
    const privateArtifacts = buildReportArtifacts(input);
    const redactedArtifacts = buildReportArtifacts(explicitlyRedacted);

    // Then
    expect(privateArtifacts.report.cells).toEqual(
      redactedArtifacts.report.cells,
    );
    expect(privateArtifacts.json).not.toContain("private-sentinel");
    expect(privateArtifacts.markdown).not.toContain("private-sentinel");
  });

  test("refuses a passing verdict when a required gate is false", () => {
    // Given
    const input = reportInput();

    // When
    const build = () =>
      buildReportArtifacts({
        ...input,
        gateResults: { ...input.gateResults, security: false },
      });

    // Then
    expect(build).toThrow("passing report requires every applicable gate");
  });
});
