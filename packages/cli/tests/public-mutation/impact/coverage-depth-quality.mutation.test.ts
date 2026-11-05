import { describe, expect, test } from "bun:test";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";
import {
  createCoarseAnchorQualityDiagnostics,
  createCoverageDepthQualityDiagnostics,
  uniqueStrings,
} from "../../../src/public/impact/coverage-depth-quality.js";
import { COARSE_GRANULARITY_REASONS } from "../../../src/public/symbol-granularity.generated.js";
import { expectGolden } from "../helpers/golden.js";

type Rel = readonly [type: string, to: string];

function entity(
  id: string,
  type: string,
  extra: Record<string, unknown> = {},
  relationships: readonly Rel[] = [],
): ExtractionResult {
  return {
    entity: {
      id,
      type,
      title: `${id} title`,
      status: type === "test" ? "passing" : "open",
      source: `.kb/${type}/${id}.md`,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      ...extra,
    },
    relationships: relationships.map(([relType, to]) => ({
      type: relType,
      from: id,
      to,
    })),
  } as ExtractionResult;
}

const depth = (results: ExtractionResult[], id: string) =>
  createCoverageDepthQualityDiagnostics(results).find(
    (row) => row.entityId === id,
  )?.evidence?.coverageDepth ?? "strong";

describe("uniqueStrings", () => {
  test("dedupes and sorts", () => {
    expect(uniqueStrings(["b", "a", "b", "B"])).toEqual(["a", "b", "B"]);
  });
});

describe("coverage depth", () => {
  test("classifies each depth", () => {
    const t = (
      id: string,
      extra: Record<string, unknown> = {},
      rels: Rel[] = [],
    ) => entity(id, "test", extra, rels);
    const req = (id: string, rels: Rel[]) => entity(id, "req", {}, rels);
    const results = [
      t("T-unit", { verification_scope: "unit" }),
      t("T-unit2", { verification_scope: "unit" }),
      t("T-int", { verification_scope: "integration" }),
      t("T-e2e-scope", { verification_scope: "end_to_end" }),
      t("T-tagged", { tags: ["Smoke", "E2E"] }),
      t("T-e2e-source", { source: "tests/E2E/a.md" }),
      t("T-unknown", { tags: ["unit"] }),
      t("T-failing-e2e", {
        status: "failing",
        verification_scope: "end_to_end",
      }),
      t("T-failing-int", {
        status: "failing",
        verification_scope: "integration",
      }),
      t("T-validates", { verification_scope: "integration" }, [
        ["validates", "R-incoming"],
        ["validates", "S-incoming"],
      ]),
      t("T-symbol-validates", { verification_scope: "integration" }),
      entity("SYM-v", "symbol", {}, [["validates", "R-symbol"]]),
      entity("S-int", "scenario", {}, [["verified_by", "T-int"]]),
      entity("S-e2e", "scenario", {}, [["verified_by", "T-tagged"]]),
      entity("S-empty", "scenario"),
      entity("S-incoming", "scenario"),
      entity("S-unit", "scenario", {}, [
        ["verified_by", "T-unit"],
        ["verified_by", "R-direct-unit"],
      ]),
      req("R-direct-e2e", [["verified_by", "T-e2e-scope"]]),
      req("R-direct-tag", [
        ["covered_by", "T-tagged"],
        ["verified_by", "T-unit"],
      ]),
      req("R-direct-source", [["verified_by", "T-e2e-source"]]),
      req("R-direct-int", [
        ["verified_by", "T-int"],
        ["specified_by", "S-e2e"],
      ]),
      req("R-scenario-e2e", [
        ["specified_by", "S-e2e"],
        ["verified_by", "T-unit"],
      ]),
      req("R-scenario-int", [["specified_by", "S-int"]]),
      req("R-incoming", []),
      req("R-scenario-incoming", [["specified_by", "S-incoming"]]),
      req("R-direct-unit", [
        ["verified_by", "T-unit"],
        ["verified_by", "T-unit2"],
      ]),
      req("R-scenario-unit", [["specified_by", "S-unit"]]),
      req("R-mixed-unit", [
        ["verified_by", "T-unit"],
        ["verified_by", "T-unknown"],
      ]),
      req("R-failing", [
        ["verified_by", "T-failing-e2e"],
        ["specified_by", "S-empty"],
        ["specified_by", "S-missing"],
      ]),
      req("R-failing-scenario", [["specified_by", "S-fail"]]),
      entity("S-fail", "scenario", {}, [["verified_by", "T-failing-int"]]),
      req("R-scenario-only", [
        ["specified_by", "S-empty"],
        ["specified_by", "T-unit"],
      ]),
      req("R-none", [
        ["verified_by", "S-empty"],
        ["verified_by", "T-missing"],
      ]),
      req("R-symbol", []),
      t("T-v-fail", { status: "failing", verification_scope: "integration" }, [
        ["validates", "R-first-fails"],
      ]),
      t("T-v-int", { verification_scope: "integration" }, [
        ["validates", "R-first-fails"],
        ["validates", "R-last-fails"],
      ]),
      t("T-v-fail2", { status: "failing", verification_scope: "integration" }, [
        ["validates", "R-last-fails"],
      ]),
      req("R-first-fails", []),
      req("R-last-fails", []),
      req("R-order", [
        ["verified_by", "T-unknown"],
        ["verified_by", "T-unit"],
      ]),
    ];
    const expected: Record<string, string> = {
      "R-direct-e2e": "strong",
      "R-direct-tag": "strong",
      "R-direct-source": "strong",
      "R-direct-int": "strong",
      "R-scenario-e2e": "strong",
      "R-scenario-int": "strong",
      "R-incoming": "strong",
      "R-scenario-incoming": "strong",
      "R-direct-unit": "unit_only",
      "R-scenario-unit": "unit_only",
      "R-mixed-unit": "open_or_nonpassing_tests_only",
      "R-failing": "open_or_nonpassing_tests_only",
      "R-failing-scenario": "open_or_nonpassing_tests_only",
      "R-scenario-only": "scenario_only_no_test",
      "R-none": "no_test_evidence",
      "R-symbol": "no_test_evidence",
      "R-first-fails": "strong",
      "R-last-fails": "strong",
      "R-order": "open_or_nonpassing_tests_only",
    };
    expect(
      Object.fromEntries(
        Object.keys(expected).map((id) => [id, depth(results, id)]),
      ),
    ).toEqual(expected);
    expectGolden(
      "coverage-depth-quality-diagnostics",
      createCoverageDepthQualityDiagnostics(results),
    );
  });

  test("filters requirement statuses and supersession", () => {
    const results = [
      ...[
        "open",
        "in_progress",
        "active",
        "approved",
        " Active ",
        "closed",
        "deprecated",
      ].map((status, index) => entity(`R-${index}`, "req", { status })),
      entity("R-closed-done", "req", {
        status: "closed",
        tags: ["implemented"],
      }),
      entity("R-closed-other", "req", { status: "closed", tags: ["x"] }),
      entity("R-old", "req"),
      entity("R-new", "req", {}, [["supersedes", "R-old"]]),
      entity("R-rel", "req", { status: "deprecated" }, [["relates_to", "R-0"]]),
      entity("R-retired-done", "req", {
        status: "deprecated",
        tags: ["implemented"],
      }),
      entity("SCN-x", "scenario", {}, [["supersedes", "R-1"]]),
      entity("T-1", "test", { status: "open" }),
    ];
    expect(
      createCoverageDepthQualityDiagnostics(results).map((row) => row.entityId),
    ).toEqual(["R-0", "R-1", "R-2", "R-3", "R-4", "R-closed-done", "R-new"]);
  });

  test("defers to proof evidence", () => {
    const results = [
      entity("R-b", "req"),
      entity("R-a", "req"),
      entity("R-c", "req"),
      entity("R-d", "req"),
    ];
    const rows = createCoverageDepthQualityDiagnostics(
      results,
      new Map([
        ["R-a", { passingE2eStatus: "passed" }],
        [
          "R-b",
          {
            proofStatus: "unresolved",
            passingE2eStatus: "missing",
            passingE2eTests: ["T-1"],
            receiptGapCodes: ["stale"],
          },
        ],
        ["R-c", {}],
      ]),
    );
    expect(rows.map((row) => row.entityId)).toEqual(["R-b", "R-c", "R-d"]);
    expect(rows[0]?.evidence).toMatchObject({
      proofStatus: "unresolved",
      passingE2eStatus: "missing",
      passingE2eTests: ["T-1"],
      receiptGapCodes: ["stale"],
    });
    expect(Object.keys(rows[1]?.evidence ?? {})).toEqual([
      "requirementId",
      "title",
      "source",
      "coverageDepth",
      "directTests",
      "scenarioTests",
      "testStatuses",
      "verificationScopes",
    ]);
  });
});

describe("coarse anchors", () => {
  test("reviews requirements implemented only by whole-file anchors", () => {
    const coarse = COARSE_GRANULARITY_REASONS[0];
    const results = [
      entity("SYM-file", "symbol", { granularity_reason: coarse }, [
        ["implements", "R-coarse"],
        ["implements", "R-mixed"],
        ["implements", "R-coarse"],
      ]),
      entity(
        "SYM-file2",
        "symbol",
        { granularity_reason: COARSE_GRANULARITY_REASONS.at(-1) },
        [["implements", "R-coarse"]],
      ),
      entity("SYM-fn", "symbol", {}, [["implements", "R-mixed"]]),
      entity("SYM-fn2", "symbol", { granularity_reason: "behavioral" }, [
        ["implements", "R-fine"],
      ]),
      entity("SYM-test", "symbol", { granularity_reason: coarse }, [
        ["implements", "R-test"],
        ["executable_for", "TEST-1"],
      ]),
      entity("SYM-rel", "symbol", { granularity_reason: coarse }, [
        ["relates_to", "R-rel"],
      ]),
      entity("SCN-x", "scenario", { granularity_reason: coarse }, [
        ["implements", "R-scn"],
      ]),
      entity("R-mixed", "req"),
      entity("R-coarse", "req"),
      entity("R-fine", "req"),
      entity("R-test", "req"),
      entity("R-rel", "req"),
      entity("R-scn", "req"),
      entity("R-closed", "req", { status: "closed" }),
      entity("SYM-closed", "symbol", { granularity_reason: coarse }, [
        ["implements", "R-closed"],
        ["implements", "R-a"],
      ]),
      entity("R-a", "req"),
      entity("SYM-zz", "symbol", { granularity_reason: coarse }, [
        ["implements", "R-pair"],
      ]),
      entity("SYM-aa", "symbol", { granularity_reason: coarse }, [
        ["implements", "R-pair"],
        ["implements", "SYM-target"],
      ]),
      entity("R-pair", "req"),
      entity("SYM-target", "symbol"),
    ];
    expectGolden(
      "coverage-depth-quality-coarse",
      createCoarseAnchorQualityDiagnostics(results),
    );
  });
});
