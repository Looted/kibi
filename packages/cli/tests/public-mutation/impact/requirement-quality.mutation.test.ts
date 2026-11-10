import { describe, expect, test } from "bun:test";
import type { ExtractionResult } from "../../../src/extractors/markdown.js";
import { createRequirementQualityDiagnostics } from "../../../src/public/impact/requirement-quality.js";
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
      title: id,
      status: "open",
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

const many = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${prefix}-${index + 1}`);
const claims = { logic_claims: ["CLAIM-a"] };
const run = (
  manifestResults: ExtractionResult[],
  hardViolationEntityIds?: ReadonlySet<string>,
) =>
  createRequirementQualityDiagnostics({
    manifestResults,
    ...(hardViolationEntityIds === undefined ? {} : { hardViolationEntityIds }),
  } as Parameters<typeof createRequirementQualityDiagnostics>[0]);
const ids = (results: ExtractionResult[]) =>
  run(results).map((row) => `${row.id} ${row.entityId}`);

describe("broad requirements", () => {
  test("reports fanout above each threshold", () => {
    const symbols = (req: string, count: number) =>
      many(`SYM-${req}`, count).map((id) =>
        entity(id, "symbol", { status: "active" }, [["implements", req]]),
      );
    const results = [
      entity("REQ-sym", "req", claims),
      ...symbols("REQ-sym", 9),
      entity("REQ-sym-ok", "req", claims),
      ...symbols("REQ-sym-ok", 8),
      entity(
        "REQ-scn",
        "req",
        claims,
        many("SCN", 7).map((id) => ["specified_by", id] as const),
      ),
      entity("REQ-scn-ok", "req", claims, [
        ...many("SCN", 6).map((id) => ["specified_by", id] as const),
        ["specified_by", "TEST-x"] as const,
        ["specified_by", "SCN-1"] as const,
      ]),
      entity("TEST-x", "test"),
      entity("REQ-test", "req", { ...claims, status: "in_progress" }, [
        ...many("TEST-v", 5).map((id) => ["verified_by", id] as const),
        ...many("TEST-c", 4).map((id) => ["covered_by", id] as const),
      ]),
      entity("REQ-test-ok", "req", { ...claims, status: "active" }, [
        ...many("TEST-v", 8).map((id) => ["verified_by", id] as const),
        ["verified_by", "SCN-1"] as const,
        ["relates_to", "TEST-z"] as const,
      ]),
      entity("SCN-1", "scenario"),
      entity("REQ-dep", "req", { ...claims, status: "accepted" }, [
        ["depends_on", "REQ-a"],
        ["depends_on", "REQ-b"],
        ["depends_on", "SCN-1"],
        ["depends_on", "REQ-gone"],
      ]),
      entity("REQ-a", "req", claims),
      entity("REQ-b", "req", claims),
      ...many("REQ-d", 3).map((id) =>
        entity(id, "req", claims, [["depends_on", "REQ-dep"]]),
      ),
      entity("SYM-dep", "symbol", { status: "active" }, [
        ["depends_on", "REQ-dep"],
      ]),
      entity(
        "REQ-dep-ok",
        "req",
        claims,
        many("REQ-e", 5).map((id) => ["depends_on", id] as const),
      ),
      entity("REQ-active", "req", { ...claims, status: "active" }, [
        ...many("SCN-u", 7).map((id) => ["specified_by", id] as const),
      ]),
      entity(
        "REQ-known",
        "req",
        claims,
        many("TEST-k", 9).map((id) => ["verified_by", id] as const),
      ),
      ...many("TEST-k", 9).map((id) => entity(id, "test")),
      entity("REQ-near", "req", claims),
      ...many("REQ-n", 5).map((id) =>
        entity(id, "req", claims, [["depends_on", "REQ-near"]]),
      ),
      entity("REQ-rel", "req", claims, [["relates_to", "REQ-near"]]),
      entity("REQ-umbrella", "req", { ...claims, tags: ["umbrella"] }, [
        ...many("SCN-u", 7).map((id) => ["specified_by", id] as const),
      ]),
      entity("REQ-epic", "req", { ...claims, tags: ["x", "epic"] }, [
        ...many("SCN-u", 7).map((id) => ["specified_by", id] as const),
      ]),
      entity("REQ-tagged", "req", { ...claims, tags: ["broad"] }, [
        ...many("SCN-u", 7).map((id) => ["specified_by", id] as const),
      ]),
      entity("REQ-closed", "req", { ...claims, status: "closed" }, [
        ...many("SCN-u", 7).map((id) => ["specified_by", id] as const),
      ]),
      entity("TEST-broad", "test", {}, [
        ...many("SCN-u", 7).map((id) => ["specified_by", id] as const),
      ]),
    ];
    expect(ids(results)).toEqual([
      "broad_requirement_review REQ-sym",
      "broad_requirement_review REQ-scn",
      "broad_requirement_review REQ-test",
      "broad_requirement_review REQ-dep",
      "broad_requirement_review REQ-active",
      "broad_requirement_review REQ-known",
      "broad_requirement_review REQ-tagged",
    ]);
    expectGolden(
      "requirement-quality-broad",
      run(results).filter((row) => row.entityId !== "REQ-tagged"),
    );
  });

  test("merges relationships of a repeated entity id", () => {
    const results = [
      entity(
        "REQ-r",
        "req",
        claims,
        many("SCN", 4).map((id) => ["specified_by", id] as const),
      ),
      entity(
        "REQ-r",
        "req",
        claims,
        many("SCN-b", 3).map((id) => ["specified_by", id] as const),
      ),
    ];
    expect(ids(results)).toEqual([
      "broad_requirement_review REQ-r",
      "broad_requirement_review REQ-r",
    ]);
  });
});

describe("requirement status and logical coverage", () => {
  test("reviews test-like statuses and missing logic claims", () => {
    const results = [
      ...["passing", "failing", "skipped", "pending", "closed"].map((status) =>
        entity(`REQ-${status}`, "req", { ...claims, status }),
      ),
      entity("TEST-passing", "test", { status: "passing" }),
      entity("REQ-none", "req", {}, [
        ["requires_property", "FACT-1"],
        ["constrains", "FACT-2"],
        ["requires_predicate", "FACT-3"],
        ["constrains", "FACT-4"],
        ["relates_to", "FACT-5"],
      ]),
      entity("REQ-empty", "req", { logic_claims: [] }),
      entity("REQ-hard", "req"),
      entity("REQ-deprecated", "req", { status: "deprecated" }),
      entity("SCN-none", "scenario"),
    ];
    expectGolden(
      "requirement-quality-status-logic",
      run(results, new Set(["REQ-hard"])),
    );
    expect(run([entity("REQ-hard", "req")]).map((row) => row.id)).toEqual([
      "logical_coverage_review",
    ]);
  });
});
