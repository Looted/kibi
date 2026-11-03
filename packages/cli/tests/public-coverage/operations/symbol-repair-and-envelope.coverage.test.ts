import { describe, expect, test } from "bun:test";
import {
  appendPayloadCountField,
  toKibiResult,
} from "../../../src/public/operations/result-envelope.js";
import type {
  OperationContext,
  PrologPort,
} from "../../../src/public/operations/runtime-types.js";
import { addCoordinateRepairEvidence } from "../../../src/public/operations/symbol-repair-plan.js";

describe("addCoordinateRepairEvidence", () => {
  test("a missing symbol rewrites the coordinate repair action", async () => {
    const prolog = {
      query: async () => ({ success: true, bindings: { Results: "[]" } }),
    } as unknown as PrologPort;
    const context = {
      workspaceRoot: "/tmp",
      prolog,
    } as unknown as OperationContext;
    const rows = await addCoordinateRepairEvidence(
      [
        {
          id: "REQ-1",
          proofRepairs: [
            { gap: "missing_symbol_coordinates", action: "old" },
            { gap: "other", action: "keep" },
          ],
          proofStages: { sourceCoordinates: { missingSymbols: ["SYM-x", 3] } },
        },
        { id: "REQ-2", proofStages: {} },
      ],
      context,
    );
    expect(rows).toStrictEqual([
      {
        id: "REQ-1",
        proofRepairs: [
          {
            gap: "missing_symbol_coordinates",
            action: "Query and repair the missing symbol before refreshing.",
          },
          { gap: "other", action: "keep" },
        ],
        proofStages: {
          sourceCoordinates: {
            missingSymbols: ["SYM-x", 3],
            coordinateRepairs: [
              {
                symbolId: "SYM-x",
                sourceFile: null,
                refreshable: false,
                reason: "source_unavailable",
                suggestion:
                  "Query and repair the missing symbol before refreshing.",
              },
            ],
          },
        },
      },
      { id: "REQ-2", proofStages: {} },
    ]);
  });
});

describe("toKibiResult", () => {
  const spec = { name: "kb_search", effects: [] };

  test("a search from an uncompiled store warns", () => {
    expect(
      toKibiResult(spec, {
        results: [],
        branchStore: { state: "not_compiled", code: "X", detail: "Empty." },
      }).diagnostics,
    ).toStrictEqual([
      {
        code: "X",
        severity: "warning",
        message:
          "Empty. An empty answer here does not mean no requirement governs this; run `kibi sync` and ask again.",
      },
    ]);
    expect(
      toKibiResult(spec, { branchStore: { state: "not_compiled" } })
        .diagnostics,
    ).toStrictEqual([
      {
        severity: "warning",
        message:
          "An empty answer here does not mean no requirement governs this; run `kibi sync` and ask again.",
      },
    ]);
  });

  test("a rejected bootstrap is an error", () => {
    const result = toKibiResult(
      { name: "kb_bootstrap", effects: [] },
      { status: "rejected" },
    );
    expect(result.status).toBe("error");
    expect(result.error).toStrictEqual({
      code: "BOOTSTRAP_PLAN_REJECTED",
      message:
        "Bootstrap stopped at a deterministic failure. Inspect actionResults for committed actions and re-plan from the current state.",
      retryable: false,
    });
  });
});

describe("appendPayloadCountField", () => {
  test("string counts are parsed, unparseable ones are unknown", () => {
    const fields: Record<string, unknown> = {};
    appendPayloadCountField(fields, "n", "hits", { count: "4" });
    expect(fields).toStrictEqual({ n: 4, result_summary: "4 hits" });
    appendPayloadCountField(fields, "n", "hits", { count: "many" });
    expect(fields).toStrictEqual({
      n: null,
      result_summary: "hits count unavailable",
    });
  });
});
