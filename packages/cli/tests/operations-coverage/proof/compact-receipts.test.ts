import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { executeCompactReceipts } from "../../../src/operations/proof/compact-receipts.js";
import * as compaction from "../../../src/operations/proof/receipt-compaction.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import * as receipts from "../../../src/public/proof-receipt.js";
import { type FakeEntity, context, fakeProlog, scratch } from "../helpers.js";

const spies: { mockRestore: () => void }[] = [];
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const cleanup of cleanups.splice(0)) cleanup();
});

const history = (testId: string) =>
  JSON.stringify([
    { receipt_id: `PR-${testId}-1`, test_id: testId },
    { receipt_id: `PR-${testId}-2`, test_id: testId },
  ]);

function compactContext(
  entities: FakeEntity[],
  fields: Partial<OperationContext> = {},
): OperationContext {
  const workspace = scratch();
  cleanups.push(workspace.cleanup);
  const store = fakeProlog(entities);
  return {
    ...context(workspace.root, entities, (goal) => {
      if (goal.includes("covered_by"))
        return { success: true, bindings: { Results: "[]" } };
      // The paged read of every test: one page holds them all.
      if (goal.startsWith("kb_query_entities('test'"))
        return goal.includes(", 0, Results")
          ? store.query("findall([Id,'test',Props], kb_entity(Id, 'test', Props), Results)")
          : { success: true, bindings: { Results: "[]" } };
      return undefined;
    }),
    signal: new AbortController().signal,
    fs: nodeFilesystem,
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "a".repeat(64),
        dirty: false,
        fileCount: 1,
      }),
    },
    ...fields,
  } as OperationContext;
}

describe("executeCompactReceipts", () => {
  test("needs a filesystem and an existing test", async () => {
    await expect(
      executeCompactReceipts({}, compactContext([], { fs: undefined })),
    ).rejects.toThrow(
      "Proof compact failed: this maintenance action rewrites authored test documents and requires a filesystem-capable runtime",
    );
    await expect(
      executeCompactReceipts({ testId: "TEST-gone" }, compactContext([])),
    ).rejects.toThrow("Proof compact failed: test TEST-gone was not found");
  });

  test("leaves invalid histories untouched, in test order", async () => {
    const result = await executeCompactReceipts(
      { dryRun: true },
      compactContext([
        { id: "TEST-b", type: "test", proof_receipts: history("TEST-b") },
        { id: "TEST-a", type: "test", proof_receipts: history("TEST-a") },
      ]),
    );
    expect(result.structuredContent.skipped.map((row) => row.testId)).toStrictEqual([
      "TEST-a",
      "TEST-b",
    ]);
    expect(result.structuredContent.skipped[0]?.reason).toStartWith(
      "invalid receipt history left untouched: ",
    );
    expect(result.content[0]?.text).toEndWith(
      "No test had superseded receipts. Skipped 2 test(s) with invalid receipt history.",
    );
  });

  test("refuses a compaction that reorders the history", async () => {
    spies.push(
      spyOn(receipts, "proofReceiptHistoryErrors").mockImplementation(() => []),
      spyOn(compaction, "compactProofReceipts").mockImplementation(
        (history) =>
          ({ kept: [...history].reverse(), removed: 1 }) as never,
      ),
    );
    await expect(
      executeCompactReceipts(
        { testId: "TEST-a" },
        compactContext([
          { id: "TEST-a", type: "test", proof_receipts: history("TEST-a") },
        ]),
      ),
    ).rejects.toThrow(
      "Proof compact failed for TEST-a: compaction must only drop superseded receipts",
    );
  });
});
