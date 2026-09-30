import { describe, expect, test } from "bun:test";
import {
  loadCoveredBySymbolsByTest,
  receiptCodeScopeSymbolIds,
} from "../../src/operations/proof/code-scope.js";

// Receipt ingest and coverage must derive the same receipt code scope: the
// test's own contracted code plus the production code linked covered_by it.

describe("receiptCodeScopeSymbolIds", () => {
  test("unions required proofs, declared bindings, and covered production symbols", () => {
    expect(
      receiptCodeScopeSymbolIds(
        {
          required_proofs: [
            { symbol_id: "SYM-TEST-CODE", target: "default" },
            { symbol_id: "SYM-SHARED", target: "default" },
          ],
        },
        [{ symbol_id: "SYM-BOUND" }, { symbol_id: "SYM-SHARED" }],
        ["SYM-PROD-B", "SYM-PROD-A", "SYM-BOUND"],
      ),
    ).toEqual([
      "SYM-BOUND",
      "SYM-PROD-A",
      "SYM-PROD-B",
      "SYM-SHARED",
      "SYM-TEST-CODE",
    ]);
  });

  test("ignores malformed contract and binding entries", () => {
    expect(
      receiptCodeScopeSymbolIds(
        { required_proofs: [{ target: "default" }, null, { symbol_id: "" }] },
        "not-a-list",
        [],
      ),
    ).toEqual([]);
    expect(receiptCodeScopeSymbolIds(undefined, undefined, ["SYM-P"])).toEqual([
      "SYM-P",
    ]);
  });
});

describe("loadCoveredBySymbolsByTest", () => {
  test("groups covered_by symbols by test with normalized ids", async () => {
    const goals: string[] = [];
    const byTest = await loadCoveredBySymbolsByTest({
      query: async (goal: string) => {
        goals.push(goal);
        return {
          success: true,
          bindings: {
            Rels: "[['kb:entity/SYM-A','kb:entity/TEST-1',covered_by],['kb:entity/SYM-B','kb:entity/TEST-1',covered_by],['kb:entity/SYM-A','kb:entity/TEST-2',covered_by]]",
          },
        };
      },
    });
    expect(goals).toHaveLength(1);
    expect(byTest.get("TEST-1")).toEqual(["SYM-A", "SYM-B"]);
    expect(byTest.get("TEST-2")).toEqual(["SYM-A"]);
    expect(byTest.get("TEST-3")).toBeUndefined();
  });

  test("propagates engine failures instead of treating them as no coverage", async () => {
    await expect(
      loadCoveredBySymbolsByTest({
        query: async () => ({
          success: false,
          bindings: {},
          error: "Query exceeded bounded Prolog output capacity (ENOBUFS)",
        }),
      }),
    ).rejects.toThrow(/covered_by relationship query failed: .*ENOBUFS/);
  });
});
