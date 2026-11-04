import { describe, expect, test } from "bun:test";
import {
  estimateNormativeSignalConfidence,
  extractRequirementClaim,
} from "../../../src/operations/modeling/requirement-modeler.js";

describe("estimateNormativeSignalConfidence", () => {
  test("scores by modal and heading", () => {
    expect(estimateNormativeSignalConfidence("Logs are kept.")).toBe(0);
    expect(estimateNormativeSignalConfidence("Logs mustn't be kept.")).toBe(0);
    expect(estimateNormativeSignalConfidence("- Logs SHALL be kept.")).toBe(
      0.86,
    );
    expect(estimateNormativeSignalConfidence("Logs must be kept.")).toBe(0.84);
    expect(estimateNormativeSignalConfidence("Logs should be kept.")).toBe(
      0.78,
    );
    expect(estimateNormativeSignalConfidence("Shall logs be kept?")).toBe(0.78);
    expect(estimateNormativeSignalConfidence("Must logs be kept?")).toBe(0.78);
    expect(
      estimateNormativeSignalConfidence("Logs shall be kept.", "Requirements"),
    ).toBe(0.94);
    expect(
      estimateNormativeSignalConfidence(
        "Logs must be kept.",
        "Retention policy",
      ),
    ).toBe(0.92);
    expect(
      estimateNormativeSignalConfidence("Logs should be kept.", "Policies"),
    ).toBe(0.86);
    expect(
      estimateNormativeSignalConfidence("Logs should be kept.", "rule"),
    ).toBe(0.86);
    expect(
      estimateNormativeSignalConfidence("Logs should be kept.", "Rules"),
    ).toBe(0.86);
    expect(
      estimateNormativeSignalConfidence("Logs should be kept.", "requirement"),
    ).toBe(0.86);
    expect(
      estimateNormativeSignalConfidence("Logs should be kept.", "Overview"),
    ).toBe(0.78);
    expect(
      estimateNormativeSignalConfidence("Logs should be kept.", "Rulesets"),
    ).toBe(0.78);
    expect(estimateNormativeSignalConfidence("Logs should be kept.", "")).toBe(
      0.78,
    );
  });
});

describe("extractRequirementClaim sources", () => {
  test("needs a source or a source file", () => {
    expect(() => extractRequirementClaim({ text: "x" })).toThrow(
      /^Requirement modeling failed: provide source or at least one sourceFiles entry$/,
    );
    expect(() =>
      extractRequirementClaim({ text: "x", source: " ", sourceFiles: [] }),
    ).toThrow(/provide source/);
  });

  test("falls back to the first source file", () => {
    const result = extractRequirementClaim({
      text: "Unparseable note",
      sourceFiles: [" b.md", "a.md"],
    });
    expect(result.source).toBe("b.md");
    expect(result.sourceFiles).toStrictEqual(["b.md", "a.md"]);
    expect(result.statement).toBe("Unparseable note");
    expect(result.extractionMode).toBe("fallback");
  });
});

describe("extractRequirementClaim with provided fields", () => {
  const base = {
    text: " Logs are kept ",
    source: " s.md ",
    subjectKey: " log ",
    propertyKey: " retention_days ",
    operator: "eq" as const,
    value: 30,
  };

  test("returns the provided claim", () => {
    expect(
      extractRequirementClaim({
        ...base,
        provenance: " s.md#L1 ",
        confidence: 0.5,
      }),
    ).toStrictEqual({
      statement: "Logs are kept",
      source: "s.md",
      sourceFiles: [],
      claim: {
        source: "s.md",
        subjectKey: "log",
        propertyKey: "retention_days",
        operator: "eq",
        value: 30,
        confidence: 0.5,
        provenance: "s.md#L1",
      },
      extractionMode: "provided",
      extractionWarnings: [],
    });
    expect(extractRequirementClaim(base).claim).toStrictEqual({
      source: "s.md",
      subjectKey: "log",
      propertyKey: "retention_days",
      operator: "eq",
      value: 30,
      confidence: 0.8,
    });
  });

  test("needs every claim field once any is given", () => {
    const message =
      /^Requirement modeling failed: subjectKey, propertyKey, operator, and value must all be provided when any extracted claim field is supplied$/;
    for (const partial of [
      { subjectKey: undefined },
      { subjectKey: "  " },
      { propertyKey: undefined },
      { propertyKey: " " },
      { operator: undefined },
      { value: undefined },
    ]) {
      expect(() => extractRequirementClaim({ ...base, ...partial })).toThrow(
        message,
      );
    }
    for (const only of [
      { subjectKey: "s" },
      { propertyKey: "p" },
      { operator: "eq" as const },
      { value: 1 },
    ]) {
      expect(() =>
        extractRequirementClaim({ text: "x", source: "s", ...only }),
      ).toThrow(message);
    }
  });

  test("checks set values against set operators", () => {
    for (const operator of ["includes", "subset_of", "excludes"] as const) {
      expect(() =>
        extractRequirementClaim({ ...base, operator, value: "a" }),
      ).toThrow(
        `Requirement modeling failed: operator ${operator} takes a set value (a list of strings)`,
      );
      expect(
        extractRequirementClaim({ ...base, operator, value: ["b", "a"] }).claim
          .value,
      ).toStrictEqual(["a", "b"]);
    }
    expect(
      extractRequirementClaim({ ...base, value: ["a"] }).claim.value,
    ).toStrictEqual(["a"]);
    expect(() =>
      extractRequirementClaim({ ...base, operator: "gte", value: ["a"] }),
    ).toThrow(
      "Requirement modeling failed: a set value takes operator eq, includes, subset_of or excludes, not gte",
    );
  });
});

describe("extractRequirementClaim from prose", () => {
  test("uses the advisor's set claims", () => {
    expect(
      extractRequirementClaim({
        text: "- The export format must be one of csv, json.",
        source: "s.md",
        provenance: "p",
      }),
    ).toStrictEqual({
      statement: "- The export format must be one of csv, json.",
      source: "s.md",
      sourceFiles: [],
      claim: {
        source: "s.md",
        subjectKey: "the.export.format",
        propertyKey: "allowed_values",
        operator: "eq",
        value: ["csv", "json"],
        confidence: 0.8,
        provenance: "p",
      },
      extractionMode: "heuristic",
      extractionWarnings: [],
    });
  });

  test("uses the advisor's pattern claims", () => {
    expect(
      extractRequirementClaim({
        text: "Order ids must match `^ORD-[0-9]+$`.",
        source: "s.md",
      }).claim,
    ).toStrictEqual({
      source: "s.md",
      subjectKey: "order.ids",
      propertyKey: "format",
      operator: "matches",
      value: "^ORD-[0-9]+$",
      confidence: 0.8,
    });
  });

  test("falls back to the heuristics for other strict claims", () => {
    const result = extractRequirementClaim({
      text: "Logs must be retained for 30 days.",
      source: "s.md",
    });
    expect(result.claim).toStrictEqual({
      source: "s.md",
      subjectKey: "Logs",
      propertyKey: "Retention Days",
      operator: "eq",
      value: 30,
      confidence: 0.8,
    });
    expect(result.extractionMode).toBe("heuristic");
  });

  test("falls back to the heuristics for an exact string claim", () => {
    const result = extractRequirementClaim({
      text: "The region must be `eu-west-1`.",
      source: "s.md",
    });
    expect(result.claim).toStrictEqual({
      source: "s.md",
      subjectKey: "region",
      propertyKey: "be `eu-west-1`",
      operator: "polarity",
      value: "require",
      confidence: 0.8,
    });
  });

  test("falls back to a review claim", () => {
    const result = extractRequirementClaim({
      text: "Plain note.",
      source: "docs/data-retention.md",
      confidence: 0.9,
    });
    expect(result.claim).toStrictEqual({
      source: "docs/data-retention.md",
      subjectKey: "data retention",
      propertyKey: "statement",
      operator: "eq",
      value: "Plain note.",
      confidence: 0.69,
    });
    expect(result.extractionMode).toBe("fallback");
  });
});
