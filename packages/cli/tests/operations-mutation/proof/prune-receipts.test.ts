import { afterEach, describe, expect, test } from "bun:test";
import * as compact from "../../../src/operations/proof/compact-receipts.js";
import { executePruneReceipts } from "../../../src/operations/proof/prune-receipts.js";
import * as discovery from "../../../src/public/operations/discovery-entities.js";
import * as proofReceipt from "../../../src/public/proof-receipt.js";
import { PROLOG, contextWith, receiptBlock, receipts, restoreStubs, stub, testEntity } from "./maintenance-fixtures.js";

afterEach(restoreStubs);

const KEEP_ERROR = "Proof prune failed: keep must be an integer between 1 and 50";

function loaded(tests: readonly Record<string, unknown>[]) {
  const paged = stub(discovery, "loadEntitiesPaged", async () => tests);
  const single = stub(discovery, "loadEntities", async () => tests);
  const rewrite = stub(compact, "rewriteReceiptHistory", async () => {});
  return { paged, single, rewrite };
}

describe("executePruneReceipts guards", () => {
  test("names the missing Prolog runtime", async () => {
    await expect(
      executePruneReceipts({}, contextWith({ prolog: undefined })),
    ).rejects.toThrow(new Error("Proof prune requires a Prolog runtime"));
  });

  test("names the missing filesystem", async () => {
    await expect(
      executePruneReceipts({}, contextWith({ fs: undefined })),
    ).rejects.toThrow(
      new Error(
        "Proof prune failed: this maintenance action rewrites authored test documents and requires a filesystem-capable runtime",
      ),
    );
  });

  for (const keep of [0, 51, 1.5, Number.NaN, 2 ** 53]) {
    test(`rejects keep ${keep}`, async () => {
      const { paged } = loaded([]);
      await expect(executePruneReceipts({ keep }, contextWith())).rejects.toThrow(
        new Error(KEEP_ERROR),
      );
      expect(paged).not.toHaveBeenCalled();
    });
  }

  for (const keep of [1, 50]) {
    test(`accepts keep ${keep}`, async () => {
      loaded([]);
      const result = await executePruneReceipts({ keep }, contextWith());
      expect(result.structuredContent).toStrictEqual({ pruned: 0, tests: [] });
    });
  }
});

describe("executePruneReceipts selection", () => {
  test("pages every test when no test is selected", async () => {
    const { paged, single } = loaded([]);
    const result = await executePruneReceipts({}, contextWith());
    expect(paged.mock.calls).toStrictEqual([[PROLOG, "test"]]);
    expect(single).not.toHaveBeenCalled();
    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: "Proof receipts pruned. No test had receipts beyond the keep window.",
        },
      ],
      structuredContent: { pruned: 0, tests: [] },
    });
  });

  test("loads one selected test", async () => {
    const entity = testEntity({ proof_receipts: receipts(1) });
    const { paged, single } = loaded([entity]);
    const result = await executePruneReceipts(
      { testId: "TEST-MAINT" },
      contextWith(),
    );
    expect(single.mock.calls).toStrictEqual([
      [PROLOG, { type: "test", id: "TEST-MAINT" }],
    ]);
    expect(paged).not.toHaveBeenCalled();
    expect(result.structuredContent).toStrictEqual({ pruned: 0, tests: [] });
  });

  test("fails when the selected test is missing", async () => {
    loaded([]);
    await expect(
      executePruneReceipts({ testId: "TEST-GONE" }, contextWith()),
    ).rejects.toThrow(new Error("Proof prune failed: test TEST-GONE was not found"));
  });
});

describe("executePruneReceipts history", () => {
  test("keeps the newest receipt by default and rewrites through the history helper", async () => {
    const history = receipts(3);
    const entity = testEntity({ proof_receipts: history });
    const { rewrite } = loaded([entity]);
    const context = contextWith();
    const result = await executePruneReceipts({}, context);
    expect(rewrite.mock.calls).toStrictEqual([
      [entity, [history[2]], context],
    ]);
    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: "Proof receipts pruned. Pruned 2 receipt(s) across 1 test(s).",
        },
      ],
      structuredContent: {
        pruned: 2,
        tests: [{ testId: "TEST-MAINT", before: 3, after: 1, pruned: 2 }],
      },
    });
  });

  test("ignores non-record entries and leaves histories within the window", async () => {
    const history = receipts(2);
    const mixed = testEntity({
      proof_receipts: [null, ["x"], "x", 3, ...history],
    });
    const exact = testEntity({ id: "TEST-EXACT", proof_receipts: receipts(2, "TEST-EXACT") });
    const scalar = testEntity({ id: "TEST-SCALAR", proof_receipts: "many" });
    const { rewrite } = loaded([mixed, exact, scalar]);
    const context = contextWith();
    const result = await executePruneReceipts({ keep: 2 }, context);
    expect(rewrite).not.toHaveBeenCalled();
    expect(result.structuredContent).toStrictEqual({ pruned: 0, tests: [] });

    const narrow = await executePruneReceipts({ keep: 1 }, context);
    expect(narrow.structuredContent).toStrictEqual({
      pruned: 2,
      tests: [
        { testId: "TEST-MAINT", before: 2, after: 1, pruned: 1 },
        { testId: "TEST-EXACT", before: 2, after: 1, pruned: 1 },
      ],
    });
    expect(narrow.content[0]?.text).toBe(
      "Proof receipts pruned. Pruned 2 receipt(s) across 2 test(s).",
    );
    expect(rewrite.mock.calls[0]).toStrictEqual([mixed, [history[1]], context]);
  });

  test("stringifies entity ids and validates the pruned remainder", async () => {
    const entity = testEntity({ id: 7, proof_receipts: receipts(2) });
    loaded([entity]);
    const validate = stub(proofReceipt, "proofReceiptHistoryErrors", () => []);
    const result = await executePruneReceipts({}, contextWith());
    expect(validate.mock.calls).toStrictEqual([
      ["7", "end_to_end", [receipts(2)[1]]],
    ]);
    expect(result.structuredContent.tests).toStrictEqual([
      { testId: "7", before: 2, after: 1, pruned: 1 },
    ]);
  });

  test("lists every history error of an invalid remainder", async () => {
    const remainder = [
      receiptBlock("PR-00000002", "2026-01-02T00:00:01.000Z", "TEST-OTHER"),
      receiptBlock("PR-00000003", "2026-01-03T00:00:01.000Z", "TEST-OTHER"),
    ];
    const errors = proofReceipt.proofReceiptHistoryErrors(
      "TEST-MAINT",
      "end_to_end",
      remainder as never,
    );
    expect(errors.length).toBeGreaterThan(1);
    const { rewrite } = loaded([
      testEntity({ proof_receipts: [...receipts(1), ...remainder] }),
    ]);
    await expect(executePruneReceipts({ keep: 2 }, contextWith())).rejects.toThrow(
      new Error(
        `Proof prune failed for TEST-MAINT: pruned history is invalid: ${errors.join("; ")}`,
      ),
    );
    expect(rewrite).not.toHaveBeenCalled();
  });
});
