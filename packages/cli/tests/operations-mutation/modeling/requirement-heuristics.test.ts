import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildFallbackClaim,
  extractHeuristicClaim,
} from "../../../src/operations/modeling/requirement-heuristics.js";

const heuristic = (
  subjectKey: string,
  propertyKey: string,
  operator: string,
  value: unknown,
  extra: Record<string, unknown> = {},
) => ({
  claim: {
    source: "src.md",
    subjectKey,
    propertyKey,
    operator,
    value,
    confidence: 0.9,
    ...extra,
  },
  extractionMode: "heuristic",
  extractionWarnings: [],
});

const extract = (statement: string, provenance?: string): unknown =>
  extractHeuristicClaim(statement, "src.md", 0.9, provenance);

describe("buildFallbackClaim", () => {
  const WARNING =
    "Deterministic claim extraction could not infer a strict semantic claim; emitted a review artifact instead.";

  test("derives the subject from the source file name and caps confidence", () => {
    expect(
      buildFallbackClaim("S.", "docs/my-req__file.md", 0.9, "p#L1"),
    ).toStrictEqual({
      claim: {
        source: "docs/my-req__file.md",
        subjectKey: "my req file",
        propertyKey: "statement",
        operator: "eq",
        value: "S.",
        confidence: 0.69,
        provenance: "p#L1",
      },
      extractionMode: "fallback",
      extractionWarnings: [WARNING],
    });
    expect(
      buildFallbackClaim("S.", "a--b.tar.gz", 0.5, undefined).claim,
    ).toStrictEqual({
      source: "a--b.tar.gz",
      subjectKey: "a b.tar",
      propertyKey: "statement",
      operator: "eq",
      value: "S.",
      confidence: 0.5,
    });
  });

  test("trims separators and falls back to Requirement", () => {
    expect(buildFallbackClaim("S", "-a_.md", 1, "").claim.subjectKey).toBe("a");
    expect(
      buildFallbackClaim("S", "_-_.md", 1, undefined).claim.subjectKey,
    ).toBe("Requirement");
    expect(buildFallbackClaim("S", "", 1, undefined).claim.subjectKey).toBe(
      "Requirement",
    );
  });
});

describe("extractHeuristicClaim retention", () => {
  test("reads each unit in any case", () => {
    expect(
      extract("- The audit logs must be retained for 30 days.", "p"),
    ).toStrictEqual(
      heuristic("audit logs", "Retention Days", "eq", 30, { provenance: "p" }),
    );
    const cases: Array<[string, string, number]> = [
      ["Logs shall be retained for 1 DAY", "Retention Days", 1],
      ["Logs should be retained for 2 month", "Retention Months", 2],
      ["Logs must be retained for 12 Months.", "Retention Months", 12],
      ["Logs must be retained for 3 year", "Retention Years", 3],
      ["Logs must be retained for 40 YEARS", "Retention Years", 40],
    ];
    for (const [statement, propertyKey, value] of cases) {
      expect(extract(statement)).toStrictEqual(
        heuristic("Logs", propertyKey, "eq", value),
      );
    }
  });

  test("tolerates runs of whitespace", () => {
    expect(
      extract("Audit  logs  must  be  retained  for  30  days"),
    ).toStrictEqual(heuristic("Audit  logs", "Retention Days", "eq", 30));
  });

  test("needs the whole sentence", () => {
    expect(extract("Logs must be retained for 30 days and more")).toStrictEqual(
      heuristic(
        "Logs",
        "be retained for 30 days and more",
        "polarity",
        "require",
      ),
    );
    expect(extract("Logs must be retained for 30 weeks")).toStrictEqual(
      heuristic("Logs", "be retained for 30 weeks", "polarity", "require"),
    );
    expect(extract("Logs must be retained for many days")).toStrictEqual(
      heuristic("Logs", "be retained for many days", "polarity", "require"),
    );
    expect(extract("Logs must be retained for 30 days..")).toStrictEqual(
      heuristic("Logs", "be retained for 30 days", "polarity", "require"),
    );
  });
});

describe("extractHeuristicClaim enabled", () => {
  test("reads enabled and disabled in any case", () => {
    expect(extract("The feature must be enabled.", "p")).toStrictEqual(
      heuristic("feature", "enabled", "bool", true, { provenance: "p" }),
    );
    expect(extract("Sync  shall  be  DISABLED")).toStrictEqual(
      heuristic("Sync", "enabled", "bool", false),
    );
    expect(extract("Sync should be Enabled")).toStrictEqual(
      heuristic("Sync", "enabled", "bool", true),
    );
  });

  test("needs the whole sentence", () => {
    expect(extract("Sync must be enabled by default")).toStrictEqual(
      heuristic("Sync", "be enabled by default", "polarity", "require"),
    );
  });
});

describe("extractHeuristicClaim polarity", () => {
  test("reads a forbidden behaviour", () => {
    expect(extract("Users must not delete logs.", "p")).toStrictEqual(
      heuristic("Users", "delete logs", "polarity", "forbid", {
        provenance: "p",
      }),
    );
    expect(extract("Users  shall  not  x")).toStrictEqual(
      heuristic("Users", "x", "polarity", "forbid"),
    );
    expect(extract("A must not b must not c")).toStrictEqual(
      heuristic("A", "b must not c", "polarity", "forbid"),
    );
  });

  test("reads a required behaviour", () => {
    expect(extract("1. The API should respond.", "p")).toStrictEqual(
      heuristic("API", "respond", "polarity", "require", { provenance: "p" }),
    );
    expect(extract("A  must  b must c")).toStrictEqual(
      heuristic("A", "b must c", "polarity", "require"),
    );
    expect(extract("Ab must cd")).toStrictEqual(
      heuristic("Ab", "cd", "polarity", "require"),
    );
  });

  test("returns null without a modal or across lines", () => {
    expect(extract("Logs are kept.")).toBeNull();
    expect(extract("intro\nLogs must be retained for 3 days")).toBeNull();
    expect(extract("intro\nSync must be enabled")).toBeNull();
    expect(extract("Users must not b\nc")).toBeNull();
    expect(extract("Users must b\nc")).toBeNull();
    expect(extract("intro\nUsers must not b")).toBeNull();
    expect(extract("intro\nUsers must b")).toBeNull();
  });
});

describe("extractHeuristicClaim sentence variants", () => {
  // Line breaks, run-together words and one-letter words around each pattern
  // boundary, pinned with the claim each one yields.
  const variants = JSON.parse(
    readFileSync(
      join(import.meta.dir, "fixtures/requirement-heuristics.golden.json"),
      "utf8",
    ),
  ) as { text: string; claim: unknown }[];

  for (const { text, claim } of variants) {
    test(JSON.stringify(text), () => {
      expect(
        extractHeuristicClaim(text, "docs/req.md", 0.7, undefined) as unknown,
      ).toStrictEqual(claim);
    });
  }
});
