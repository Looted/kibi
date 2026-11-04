import { afterEach, describe, expect, test } from "bun:test";
import { projectEntityProperties } from "../../../src/operations/mutation/entity-projection.js";
import * as upsert from "../../../src/operations/mutation/upsert.js";
import * as codeScope from "../../../src/operations/proof/code-scope.js";
import * as compact from "../../../src/operations/proof/compact-receipts.js";
import {
  executeCompactReceipts,
  rewriteReceiptHistory,
} from "../../../src/operations/proof/compact-receipts.js";
import * as compaction from "../../../src/operations/proof/receipt-compaction.js";
import { patchReceiptsIntoDocument } from "../../../src/operations/proof/receipt-document.js";
import * as discovery from "../../../src/public/operations/discovery-entities.js";
import * as snapshot from "../../../src/public/operations/workspace-snapshot.js";
import * as proofReceipt from "../../../src/public/proof-receipt.js";
import { PROLOG, contextWith, memoryFs, receipts, restoreStubs, stub, testEntity } from "./maintenance-fixtures.js";

afterEach(restoreStubs);

const POLICY = compaction.PROOF_RECEIPT_COMPACTION_POLICY;
const DOC = `---
id: TEST-MAINT
title: Maintenance fixture
proof_receipts:
  - receipt_id: PR-OLD
links: []
---

Body.
`;

describe("rewriteReceiptHistory", () => {
  function run(
    test: Record<string, unknown>,
    files: Record<string, string>,
    fs: unknown = "memory",
  ) {
    const call = stub(upsert, "executeUpsert", async () => ({}));
    const context = contextWith({
      fs: (fs === "memory" ? memoryFs(files) : (fs ?? undefined)) as never,
    });
    return { call, context };
  }

  test("patches only the receipts block of an authored markdown document", async () => {
    const entity = testEntity({ id: 7, proof_receipts: receipts(3) });
    const kept = receipts(1);
    const { call, context } = run(entity, {
      "/ws/.kb/tests/TEST-MAINT.md": DOC,
    });
    await rewriteReceiptHistory(entity, kept, context);
    expect(call.mock.calls).toStrictEqual([
      [
        {
          type: "test",
          id: "7",
          properties: { ...projectEntityProperties(entity), proof_receipts: kept },
        },
        context,
        {
          allowReceiptsPrune: true,
          sourceDocumentOverride: patchReceiptsIntoDocument(DOC, kept),
        },
      ],
    ]);
  });

  for (const source of ["docs/T.MDX", "docs/t.Md"]) {
    test(`patches ${source} case-insensitively`, async () => {
      const entity = testEntity({ source });
      const { call, context } = run(entity, { [`/ws/${source}`]: DOC });
      await rewriteReceiptHistory(entity, [], context);
      const options = call.mock.calls[0]?.[2] as Record<string, unknown>;
      expect(options.sourceDocumentOverride).toBe(
        patchReceiptsIntoDocument(DOC, []) as string,
      );
    });
  }

  const canonical: Array<[string, Record<string, unknown>, unknown?]> = [
    ["a non-markdown source", { source: "tests/t.md.bak" }],
    ["a dotless md suffix", { source: "tests/readmd" }],
    ["a non-string source", { source: ["tests/t.md"] }],
    ["a missing source", { source: undefined }],
    ["a traversal source", { source: "../t.md" }],
    ["a missing document", { source: "tests/none.md" }],
    ["a document without frontmatter", { source: "tests/plain.md" }],
    ["a runtime without a filesystem", {}, null],
  ];
  for (const [label, extras, fs] of canonical) {
    test(`falls back to the canonical render for ${label}`, async () => {
      const entity = testEntity(extras);
      const files = {
        "/ws/tests/t.md.bak": DOC,
        "/ws/tests/readmd": DOC,
        "/ws/tests/t.md": DOC,
        "/t.md": DOC,
        "/ws/tests/plain.md": "no frontmatter\n",
        "/ws/.kb/tests/TEST-MAINT.md": DOC,
      };
      const { call, context } = run(
        entity,
        files,
        fs === null ? null : "memory",
      );
      await rewriteReceiptHistory(entity, [], context);
      expect(call.mock.calls[0]?.[2]).toStrictEqual({ allowReceiptsPrune: true });
    });
  }

  test("does not read non-markdown sources", async () => {
    const entity = testEntity({ source: "tests/t.ts" });
    const fs = memoryFs({});
    const { context } = run(entity, {}, fs);
    await rewriteReceiptHistory(entity, [], context);
    expect(fs.reads).toStrictEqual([]);
  });
});

type Loaded = {
  tests: Record<string, unknown>[];
  covered?: Map<string, string[]>;
  hashes?: (input: Record<string, unknown>) => readonly string[] | undefined;
};

function harness({ tests, covered = new Map(), hashes }: Loaded) {
  const snap = stub(snapshot, "readWorkspaceSnapshot", async () => ({
    available: true,
    snapshot: { hash: "f".repeat(64) },
  }));
  const paged = stub(discovery, "loadEntitiesPaged", async () => tests);
  const single = stub(discovery, "loadEntities", async () => tests);
  const coveredBy = stub(
    codeScope,
    "loadCoveredBySymbolsByTest",
    async () => covered,
  );
  const binding = stub(
    codeScope,
    "currentReceiptBindingHashes",
    async (input: Record<string, unknown>) => hashes?.(input),
  );
  const rewrite = stub(compact, "rewriteReceiptHistory", async () => {});
  return { snap, paged, single, coveredBy, binding, rewrite };
}

describe("executeCompactReceipts guards", () => {
  test("names the missing Prolog runtime", async () => {
    await expect(
      executeCompactReceipts({}, contextWith({ prolog: undefined })),
    ).rejects.toThrow(new Error("Proof compact requires a Prolog runtime"));
  });

  test("names the missing filesystem", async () => {
    await expect(
      executeCompactReceipts({}, contextWith({ fs: undefined })),
    ).rejects.toThrow(
      new Error(
        "Proof compact failed: this maintenance action rewrites authored test documents and requires a filesystem-capable runtime",
      ),
    );
  });

  test("reports an unavailable workspace snapshot", async () => {
    const context = contextWith();
    const snap = stub(snapshot, "readWorkspaceSnapshot", async () => ({
      available: false,
      error: "not a git work tree",
    }));
    await expect(executeCompactReceipts({}, context)).rejects.toThrow(
      new Error("Proof compact failed: not a git work tree"),
    );
    expect(snap.mock.calls).toStrictEqual([[context]]);
  });

  test("fails when the selected test is missing", async () => {
    const { single, paged } = harness({ tests: [] });
    await expect(
      executeCompactReceipts({ testId: "TEST-GONE" }, contextWith()),
    ).rejects.toThrow(
      new Error("Proof compact failed: test TEST-GONE was not found"),
    );
    expect(single.mock.calls).toStrictEqual([
      [PROLOG, { type: "test", id: "TEST-GONE" }],
    ]);
    expect(paged).not.toHaveBeenCalled();
  });
});

describe("executeCompactReceipts", () => {
  test("reports an empty store", async () => {
    const { paged, single, coveredBy } = harness({ tests: [] });
    const result = await executeCompactReceipts({}, contextWith());
    expect(paged.mock.calls).toStrictEqual([[PROLOG, "test"]]);
    expect(single).not.toHaveBeenCalled();
    expect(coveredBy.mock.calls).toStrictEqual([[PROLOG]]);
    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: `Proof receipts compacted (${POLICY}). No test had superseded receipts.`,
        },
      ],
      structuredContent: {
        policy: POLICY,
        snapshot: "f".repeat(64),
        dryRun: false,
        removed: 0,
        tests: [],
        skipped: [],
      },
    });
  });

  test("removes superseded receipts in test-id order and anchors on the live binding", async () => {
    const zeta = testEntity({ id: "TEST-Z", proof_receipts: receipts(3, "TEST-Z") });
    const alpha = testEntity({
      id: "TEST-A",
      proof_receipts: [null, "x", ["y"], ...receipts(2, "TEST-A")],
    });
    const single = testEntity({ id: "TEST-ONE", proof_receipts: receipts(1, "TEST-ONE") });
    const none = testEntity({ id: "TEST-NONE", proof_receipts: "x" });
    const { binding, rewrite } = harness({
      tests: [zeta, single, none, alpha],
      covered: new Map([["TEST-Z", ["SYM-Z"]]]),
      hashes: (input) =>
        (input.test as { id: string }).id === "TEST-Z"
          ? ["h-now", "h-old"]
          : ["h-a"],
    });
    const compactSpy = stub(
      compaction,
      "compactProofReceipts",
      (history: unknown[]) => ({ kept: history.slice(-1), removed: history.length - 1 }),
    );
    const fs = memoryFs({ "/ws/x": "content" });
    const context = contextWith({ fs });
    const result = await executeCompactReceipts({}, context);

    expect(compactSpy.mock.calls).toStrictEqual([
      [receipts(2, "TEST-A"), { codeSnapshot: "f".repeat(64), bindingHash: "h-a" }],
      [
        receipts(3, "TEST-Z"),
        {
          codeSnapshot: "f".repeat(64),
          bindingHash: "h-now",
          legacyBindingHashes: ["h-old"],
        },
      ],
    ]);
    const inputs = binding.mock.calls.map(
      ([input]) => input as Record<string, unknown>,
    );
    expect(inputs.map((input) => input.coveredBySymbols)).toStrictEqual([
      [],
      ["SYM-Z"],
    ]);
    expect(inputs.map((input) => input.workspaceRoot)).toStrictEqual([
      "/ws",
      "/ws",
    ]);
    expect(inputs.map((input) => input.test)).toStrictEqual([alpha, zeta]);
    const readFile = inputs[0]?.readFile as (path: string) => Promise<string>;
    expect(await readFile("/ws/x")).toBe("content");
    expect(fs.reads).toStrictEqual(["/ws/x"]);
    expect(rewrite.mock.calls).toStrictEqual([
      [alpha, [receipts(2, "TEST-A")[1]], context],
      [zeta, [receipts(3, "TEST-Z")[2]], context],
    ]);
    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: `Proof receipts compacted (${POLICY}). Removed 3 superseded receipt(s) across 2 test(s).`,
        },
      ],
      structuredContent: {
        policy: POLICY,
        snapshot: "f".repeat(64),
        dryRun: false,
        removed: 3,
        tests: [
          { testId: "TEST-A", before: 2, after: 1, removed: 1 },
          { testId: "TEST-Z", before: 3, after: 1, removed: 2 },
        ],
        skipped: [],
      },
    });
  });

  test("dry runs report without rewriting and fall back to the snapshot anchor", async () => {
    const entity = testEntity({ id: 9, proof_receipts: receipts(2, "9") });
    const { rewrite } = harness({ tests: [entity] });
    const compactSpy = stub(compaction, "compactProofReceipts", (history: unknown[]) => ({
      kept: history.slice(1),
      removed: 1,
    }));
    const result = await executeCompactReceipts(
      { testId: "9", dryRun: true },
      contextWith(),
    );
    expect(compactSpy.mock.calls[0]?.[1]).toStrictEqual({
      codeSnapshot: "f".repeat(64),
    });
    expect(rewrite).not.toHaveBeenCalled();
    expect(result.content[0]?.text).toBe(
      `Proof receipts compacted (${POLICY}). Would remove 1 superseded receipt(s) across 1 test(s).`,
    );
    expect(result.structuredContent.dryRun).toBe(true);
    expect(result.structuredContent.tests).toStrictEqual([
      { testId: "9", before: 2, after: 1, removed: 1 },
    ]);
  });

  test("leaves histories with nothing superseded alone", async () => {
    const entity = testEntity({ proof_receipts: receipts(2) });
    const { rewrite } = harness({ tests: [entity], hashes: () => [] });
    stub(compaction, "compactProofReceipts", (history: unknown[]) => ({
      kept: history,
      removed: 0,
    }));
    const result = await executeCompactReceipts({}, contextWith());
    expect(rewrite).not.toHaveBeenCalled();
    expect(result.structuredContent.tests).toStrictEqual([]);
    expect(result.structuredContent.removed).toBe(0);
  });

  test("skips invalid histories with their first error", async () => {
    const bad = testEntity({
      id: "TEST-BAD",
      proof_receipts: receipts(2, "TEST-OTHER"),
    });
    const good = testEntity({ id: "TEST-GOOD", proof_receipts: receipts(2, "TEST-GOOD") });
    const { binding } = harness({ tests: [bad, good] });
    const errors = proofReceipt.proofReceiptHistoryErrors(
      "TEST-BAD",
      "end_to_end",
      receipts(2, "TEST-OTHER") as never,
    );
    expect(errors.length).toBeGreaterThan(1);
    stub(compaction, "compactProofReceipts", (history: unknown[]) => ({
      kept: history,
      removed: 0,
    }));
    const result = await executeCompactReceipts({}, contextWith());
    expect(binding.mock.calls.length).toBe(1);
    expect(result.structuredContent.skipped).toStrictEqual([
      {
        testId: "TEST-BAD",
        reason: `invalid receipt history left untouched: ${errors[0]}`,
      },
    ]);
    expect(result.content[0]?.text).toBe(
      `Proof receipts compacted (${POLICY}). No test had superseded receipts. Skipped 1 test(s) with invalid receipt history.`,
    );
  });

  test("refuses a compaction that rewrites instead of dropping receipts", async () => {
    const entity = testEntity({ proof_receipts: receipts(2) });
    const { rewrite } = harness({ tests: [entity] });
    stub(compaction, "compactProofReceipts", (history: unknown[]) => ({
      kept: [...history].reverse(),
      removed: 1,
    }));
    await expect(executeCompactReceipts({}, contextWith())).rejects.toThrow(
      new Error(
        "Proof compact failed for TEST-MAINT: compaction must only drop superseded receipts",
      ),
    );
    expect(rewrite).not.toHaveBeenCalled();
  });
});
