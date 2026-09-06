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
} from "../../src/commands/check.js";
import type { PrologProcess } from "../../src/prolog.js";

type QueryResult = {
  success: boolean;
  bindings: Record<string, string | undefined>;
  error?: string;
};

function prolog(
  handler: (goal: string) => QueryResult,
): PrologProcess {
  return {
    query: async (goal: string | string[]) =>
      handler(Array.isArray(goal) ? goal.join(", ") : goal),
  } as unknown as PrologProcess;
}

describe("exported check helpers", () => {
  test("checkMustPriorityCoverage reports missing scenario and test links", async () => {
    const violations = await checkMustPriorityCoverage(
      prolog((goal) => {
        if (goal.includes("findall(Id") && goal.includes("priority")) {
          return { success: true, bindings: { Ids: "['REQ-MUST']" } };
        }
        if (goal.includes("kb_entity('REQ-MUST'")) {
          return {
            success: true,
            bindings: { Props: 'source=^^("docs/REQ-MUST.md")' },
          };
        }
        if (goal.includes("specified_by") || goal.includes("validates")) {
          return { success: false, bindings: {} };
        }
        return { success: false, bindings: {} };
      }),
    );
    expect(violations).toEqual([
      expect.objectContaining({
        rule: "must-priority-coverage",
        entityId: "REQ-MUST",
        source: "docs/REQ-MUST.md",
        description: expect.stringContaining("scenario and test"),
      }),
    ]);
  });

  test("checkMustPriorityCoverage returns empty when the must-priority query fails", async () => {
    expect(
      await checkMustPriorityCoverage(
        prolog(() => ({ success: false, bindings: {} })),
      ),
    ).toEqual([]);
  });

  test("checkNoDanglingRefs flags missing relationship endpoints", async () => {
    const violations = await checkNoDanglingRefs(
      prolog((goal) => {
        if (goal.includes("findall(Id, (kb_entity")) {
          return { success: true, bindings: { Ids: "[REQ-LIVE]" } };
        }
        if (goal.includes("kb_relationship(depends_on")) {
          return {
            success: true,
            bindings: { Rels: "[[REQ-LIVE,REQ-GONE],[REQ-LIVE,SCEN-GONE]]" },
          };
        }
        return { success: true, bindings: { Rels: "[]" } };
      }),
    );
    expect(violations.map((item) => item.entityId).sort()).toEqual([
      "REQ-GONE",
      "SCEN-GONE",
    ]);
    expect(violations.every((item) => item.rule === "no-dangling-refs")).toBe(
      true,
    );
  });

  test("checkNoCycles reports the first circular depends_on chain", async () => {
    const violations = await checkNoCycles(
      prolog((goal) => {
        if (goal.includes("kb_relationship(depends_on")) {
          return {
            success: true,
            bindings: { Deps: "[[REQ-A,REQ-B],[REQ-B,REQ-A]]" },
          };
        }
        if (goal.includes("kb_entity('REQ-A'")) {
          return {
            success: true,
            bindings: { Props: 'source=^^("docs/REQ-A.md")' },
          };
        }
        if (goal.includes("kb_entity('REQ-B'")) {
          return { success: true, bindings: { Props: "title=plain" } };
        }
        return { success: false, bindings: {} };
      }),
    );
    expect(violations).toEqual([
      expect.objectContaining({
        rule: "no-cycles",
        entityId: "REQ-A",
        description: expect.stringContaining("REQ-A → REQ-B → REQ-A"),
      }),
    ]);
  });

  test("checkNoCycles returns empty when Prolog omits Deps", async () => {
    expect(
      await checkNoCycles(prolog(() => ({ success: true, bindings: {} }))),
    ).toEqual([]);
  });

  test("checkNoCycles walks an acyclic graph and a second disconnected cycle", async () => {
    const violations = await checkNoCycles(
      prolog((goal) => {
        if (goal.includes("kb_relationship(depends_on")) {
          return {
            success: true,
            bindings: {
              Deps: "[[REQ-A,REQ-B],[REQ-B,REQ-C],[REQ-X,REQ-Y],[REQ-Y,REQ-X]]",
            },
          };
        }
        if (goal.includes("kb_entity(")) {
          return {
            success: true,
            bindings: { Props: 'source=^^("docs/entity.md")' },
          };
        }
        return { success: false, bindings: {} };
      }),
    );
    expect(violations[0]?.rule).toBe("no-cycles");
    expect(violations[0]?.entityId).toBe("REQ-X");
  });

  test("checkRequiredFields reports missing keys from the property list", async () => {
    const violations = await checkRequiredFields(
      prolog((goal) => {
        if (goal.includes("kb_entity('REQ-INCOMPLETE'")) {
          return {
            success: true,
            bindings: { Props: "[id=REQ-INCOMPLETE,title=Incomplete]" },
          };
        }
        return { success: false, bindings: {} };
      }),
      ["REQ-INCOMPLETE"],
    );
    expect(violations.map((item) => item.description)).toEqual([
      "Missing required field: status",
      "Missing required field: created_at",
      "Missing required field: updated_at",
      "Missing required field: source",
    ]);
  });

  test("checkDeprecatedAdrs reports superseded ADRs without a successor", async () => {
    const violations = await checkDeprecatedAdrs(
      prolog((goal) => {
        if (goal.includes("deprecated_no_successor")) {
          return { success: true, bindings: { Ids: "['ADR-OLD']" } };
        }
        if (goal.includes("kb_entity('ADR-OLD'")) {
          return {
            success: true,
            bindings: { Props: 'source=^^("docs/ADR-OLD.md")' },
          };
        }
        return { success: false, bindings: {} };
      }),
    );
    expect(violations).toEqual([
      expect.objectContaining({
        rule: "deprecated-adr-no-successor",
        entityId: "ADR-OLD",
        source: "docs/ADR-OLD.md",
      }),
    ]);
  });

  test("checkDomainContradictions maps Prolog triples into violations", async () => {
    const violations = await checkDomainContradictions(
      prolog(() => ({
        success: true,
        bindings: { Rows: '[[REQ-A,REQ-B,"retention conflict"]]' },
      })),
    );
    expect(violations).toEqual([
      expect.objectContaining({
        rule: "domain-contradictions",
        entityId: "REQ-A/REQ-B",
        description: expect.stringContaining("retention conflict"),
      }),
    ]);
  });

  test("strict Prolog violation helpers parse rows and ignore empty lists", async () => {
    const rows =
      "[violation(strict-fact-shape,FACT-1,\"bad shape\",\"fix it\",'.kb/facts/FACT-1.md')]";
    const fact = await checkStrictFactShape(
      prolog(() => ({ success: true, bindings: { Violations: rows } })),
    );
    const pairing = await checkStrictReqFactPairing(
      prolog(() => ({ success: true, bindings: { Violations: "[]" } })),
    );
    const readiness = await checkStrictReadiness(
      prolog(() => ({ success: false, bindings: {} })),
    );
    expect(fact).toEqual([
      expect.objectContaining({
        rule: "strict-fact-shape",
        entityId: "FACT-1",
        source: ".kb/facts/FACT-1.md",
      }),
    ]);
    expect(pairing).toEqual([]);
    expect(readiness).toEqual([]);
  });

  test("checkSymbolCoverage reports uncovered quoted symbol ids", async () => {
    const violations = await checkSymbolCoverage(
      prolog((goal) => {
        if (goal.includes("symbol_no_req_coverage")) {
          return { success: true, bindings: { Symbols: "['SYM-A','SYM-B']" } };
        }
        return { success: false, bindings: {} };
      }),
    );
    expect(violations.map((item) => item.entityId)).toEqual(["SYM-A", "SYM-B"]);
    expect(violations[0]?.rule).toBe("symbol-coverage");
  });
});
