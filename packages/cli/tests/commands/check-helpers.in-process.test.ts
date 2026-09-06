import { describe, expect, test } from "bun:test";
import {
  checkDeprecatedAdrs,
  checkDomainContradictions,
  checkMustPriorityCoverage,
  checkNoCycles,
  checkNoDanglingRefs,
  checkRequiredFields,
  checkStrictFactShape,
  checkStrictReadiness,
  checkStrictReqFactPairing,
  checkSymbolCoverage,
  findMustPriorityReqs,
  getAllEntityIds,
} from "../../src/commands/check.js";
import type { PrologProcess } from "../../src/prolog.js";

function mockProlog(
  handler: (goal: string) => {
    success: boolean;
    bindings: Record<string, string>;
    error?: string;
  },
): PrologProcess {
  return {
    query: async (goal: string) => handler(goal),
  } as unknown as PrologProcess;
}

function failUnless(
  matches: Array<{
    includes: string;
    success?: boolean;
    bindings?: Record<string, string>;
  }>,
): PrologProcess {
  return mockProlog((goal) => {
    const hit = matches.find((entry) => goal.includes(entry.includes));
    if (hit === undefined) {
      return { success: false, bindings: {} };
    }
    return {
      success: hit.success ?? true,
      bindings: hit.bindings ?? {},
    };
  });
}

describe("exported check Prolog helpers", () => {
  test("findMustPriorityReqs returns empty on query failure or empty lists", async () => {
    expect(await findMustPriorityReqs(failUnless([]))).toEqual([]);
    expect(
      await findMustPriorityReqs(
        failUnless([{ includes: "findall(Id", bindings: {} }]),
      ),
    ).toEqual([]);
    expect(
      await findMustPriorityReqs(
        failUnless([{ includes: "findall(Id", bindings: { Ids: "[]" } }]),
      ),
    ).toEqual([]);
  });

  test("checkMustPriorityCoverage reports missing scenario and test coverage", async () => {
    const none = await checkMustPriorityCoverage(
      failUnless([
        { includes: "findall(Id", bindings: { Ids: "['REQ-1']" } },
        {
          includes: "kb_entity('REQ-1', req, Props)",
          bindings: { Props: 'source=^^("docs/REQ-1.md")' },
        },
      ]),
    );
    expect(none).toEqual([
      expect.objectContaining({
        rule: "must-priority-coverage",
        entityId: "REQ-1",
        source: "docs/REQ-1.md",
        description: expect.stringContaining("scenario and test"),
      }),
    ]);

    const testOnly = await checkMustPriorityCoverage(
      failUnless([
        { includes: "findall(Id", bindings: { Ids: "[REQ-2]" } },
        { includes: "kb_entity('REQ-2', req, Props)", success: false },
        { includes: "specified_by", success: true, bindings: { ScenarioId: "SCEN-1" } },
      ]),
    );
    expect(testOnly[0]?.description).toContain("test coverage");
    expect(testOnly[0]?.source).toBe("");

    const covered = await checkMustPriorityCoverage(
      failUnless([
        { includes: "findall(Id", bindings: { Ids: "[REQ-3]" } },
        { includes: "specified_by", success: true },
        { includes: "validates", success: true },
      ]),
    );
    expect(covered).toEqual([]);
  });

  test("getAllEntityIds parses typed and untyped result lists", async () => {
    expect(await getAllEntityIds(failUnless([]))).toEqual([]);
    expect(
      await getAllEntityIds(
        failUnless([{ includes: "findall(Id", bindings: { Ids: "[]" } }]),
      ),
    ).toEqual([]);
    expect(
      await getAllEntityIds(
        failUnless([
          { includes: "Type = req", bindings: { Ids: "['REQ-A', REQ-B]" } },
        ]),
        "req",
      ),
    ).toEqual(["REQ-A", "REQ-B"]);
  });

  test("checkNoDanglingRefs reports missing endpoints", async () => {
    const empty = await checkNoDanglingRefs(
      failUnless([{ includes: "findall(Id", bindings: { Ids: "[REQ-1]" } }]),
    );
    expect(empty).toEqual([]);

    const dangling = await checkNoDanglingRefs(
      failUnless([
        { includes: "findall(Id", bindings: { Ids: "[REQ-1]" } },
        {
          includes: "kb_relationship(depends_on",
          bindings: { Rels: "[[REQ-1,MISSING],[GONE,REQ-1],not-a-pair]" },
        },
      ]),
    );
    expect(dangling.map((item) => item.entityId).sort()).toEqual([
      "GONE",
      "MISSING",
    ]);
  });

  test("checkNoCycles reports the first circular depends_on path", async () => {
    expect(await checkNoCycles(failUnless([]))).toEqual([]);
    expect(
      await checkNoCycles(
        failUnless([
          { includes: "depends_on, From, To), Deps)", bindings: { Deps: "[]" } },
        ]),
      ),
    ).toEqual([]);

    const cyclic = await checkNoCycles(
      failUnless([
        {
          includes: "depends_on, From, To), Deps)",
          bindings: { Deps: "[[A,B],[B,A],broken]" },
        },
        {
          includes: "kb_entity('A'",
          bindings: { Props: 'source=^^("docs/a.md")' },
        },
        { includes: "kb_entity('B'", success: false },
      ]),
    );
    expect(cyclic[0]).toMatchObject({
      rule: "no-cycles",
      entityId: "A",
    });
    expect(cyclic[0]?.description).toContain("a → B → a");
  });

  test("checkRequiredFields flags missing keys", async () => {
    const violations = await checkRequiredFields(
      failUnless([
        {
          includes: "kb_entity('REQ-1'",
          bindings: { Props: "id=REQ-1, title=Auth, status=open" },
        },
      ]),
      ["REQ-1"],
    );
    expect(violations.map((item) => item.description)).toEqual([
      "Missing required field: created_at",
      "Missing required field: updated_at",
      "Missing required field: source",
    ]);
  });

  test("checkDeprecatedAdrs and domain contradictions parse Prolog rows", async () => {
    expect(await checkDeprecatedAdrs(failUnless([]))).toEqual([]);
    expect(
      await checkDeprecatedAdrs(
        failUnless([
          { includes: "deprecated_no_successor", bindings: { Ids: "[]" } },
        ]),
      ),
    ).toEqual([]);

    const deprecated = await checkDeprecatedAdrs(
      failUnless([
        { includes: "deprecated_no_successor", bindings: { Ids: "['ADR-1']" } },
        {
          includes: "kb_entity('ADR-1', adr, Props)",
          bindings: { Props: 'source=^("docs/adr.md")' },
        },
      ]),
    );
    expect(deprecated[0]).toMatchObject({
      rule: "deprecated-adr-no-successor",
      entityId: "ADR-1",
      source: "docs/adr.md",
    });

    expect(await checkDomainContradictions(failUnless([]))).toEqual([]);
    const contradictions = await checkDomainContradictions(
      failUnless([
        {
          includes: "contradicting_reqs",
          bindings: { Rows: "[[REQ-A,REQ-B,opposite values]]" },
        },
      ]),
    );
    expect(contradictions[0]).toMatchObject({
      rule: "domain-contradictions",
      entityId: "REQ-A/REQ-B",
    });
  });

  test("strict fact helpers parse violation terms and empty lists", async () => {
    const term =
      "[violation(strict_fact_shape,FACT-1,\"bad shape\",\"fix it\",src.md)]";
    for (const [fn, needle] of [
      [checkStrictFactShape, "strict_fact_shape_violation"],
      [checkStrictReqFactPairing, "strict_req_fact_pairing_violation"],
      [checkStrictReadiness, "strict_readiness_violation"],
    ] as const) {
      expect(await fn(failUnless([]))).toEqual([]);
      expect(
        await fn(failUnless([{ includes: needle, bindings: { Violations: "[]" } }])),
      ).toEqual([]);
      const rows = await fn(
        failUnless([{ includes: needle, bindings: { Violations: term } }]),
      );
      expect(rows[0]).toMatchObject({
        rule: "strict_fact_shape",
        entityId: "FACT-1",
        description: "bad shape",
        suggestion: "fix it",
        source: "src.md",
      });
    }
  });

  test("checkSymbolCoverage extracts uncovered symbol ids", async () => {
    expect(await checkSymbolCoverage(failUnless([]))).toEqual([]);
    expect(
      await checkSymbolCoverage(
        failUnless([
          { includes: "symbol_no_req_coverage", bindings: { Symbols: "[]" } },
        ]),
      ),
    ).toEqual([]);
    const uncovered = await checkSymbolCoverage(
      failUnless([
        {
          includes: "symbol_no_req_coverage",
          bindings: { Symbols: "['SYM-1','SYM-2']" },
        },
      ]),
    );
    expect(uncovered.map((item) => item.entityId)).toEqual(["SYM-1", "SYM-2"]);
  });
});
