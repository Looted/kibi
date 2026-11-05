import { afterEach, describe, expect, test } from "bun:test";
import { projectEntityProperties } from "../../../src/operations/mutation/entity-projection.js";
import * as upsert from "../../../src/operations/mutation/upsert.js";
import { executeMigrateLegacyReceipts } from "../../../src/operations/proof/migrate-legacy-receipts.js";
import { removeFrontmatterBlock } from "../../../src/operations/proof/receipt-document.js";
import * as discovery from "../../../src/public/operations/discovery-entities.js";
import { PROLOG, contextWith, memoryFs, restoreStubs, stub, testEntity } from "./maintenance-fixtures.js";

afterEach(restoreStubs);

const LEGACY_DOC = `---
id: TEST-MAINT
proof_contract:
  version: kibi.proof-contract.v1
verification_receipts:
  - snapshot: aaaa
links: []
---

Body.
`;
const CLEAN_DOC = "---\nid: TEST-MAINT\n---\n\nBody.\n";
const NONE_TEXT =
  "Legacy receipts migrated. No test carries a legacy verification_receipts block alongside a proof_contract.";

function harness(
  tests: readonly Record<string, unknown>[],
  files: Record<string, string> = {},
) {
  const paged = stub(discovery, "loadEntitiesPaged", async () => tests);
  const single = stub(discovery, "loadEntities", async () => tests);
  const write = stub(upsert, "executeUpsert", async () => ({}));
  const fs = memoryFs(files);
  const context = contextWith({ fs });
  return { paged, single, write, fs, context };
}

describe("executeMigrateLegacyReceipts guards", () => {
  test("names the missing Prolog runtime", async () => {
    await expect(
      executeMigrateLegacyReceipts({}, contextWith({ prolog: undefined })),
    ).rejects.toThrow(
      new Error("Legacy receipt migration requires a Prolog runtime"),
    );
  });

  test("names the missing filesystem", async () => {
    await expect(
      executeMigrateLegacyReceipts({}, contextWith({ fs: undefined })),
    ).rejects.toThrow(
      new Error(
        "Legacy receipt migration failed: this maintenance action rewrites authored test documents and requires a filesystem-capable runtime",
      ),
    );
  });

  test("fails when the selected test is missing", async () => {
    const { single, paged, context } = harness([]);
    await expect(
      executeMigrateLegacyReceipts({ testId: "TEST-GONE" }, context),
    ).rejects.toThrow(
      new Error("Legacy receipt migration failed: test TEST-GONE was not found"),
    );
    expect(single.mock.calls).toStrictEqual([
      [PROLOG, { type: "test", id: "TEST-GONE" }],
    ]);
    expect(paged).not.toHaveBeenCalled();
  });
});

describe("executeMigrateLegacyReceipts", () => {
  test("splices the legacy block and drops the compiled lane", async () => {
    const entity = testEntity({
      id: 7,
      source: "docs/T.MDX",
      verification_receipts: [{ outcome: "passed" }],
      proof_receipts: [],
    });
    const { paged, single, write, fs, context } = harness([entity], {
      "/ws/docs/T.MDX": LEGACY_DOC,
    });
    const result = await executeMigrateLegacyReceipts({}, context);
    expect(paged.mock.calls).toStrictEqual([[PROLOG, "test"]]);
    expect(single).not.toHaveBeenCalled();
    expect(fs.reads).toStrictEqual(["/ws/docs/T.MDX"]);
    const { verification_receipts: _legacy, ...kept } =
      projectEntityProperties(entity);
    expect(write.mock.calls).toStrictEqual([
      [
        { type: "test", id: "7", properties: kept },
        context,
        {
          sourceDocumentOverride: removeFrontmatterBlock(
            LEGACY_DOC,
            "verification_receipts",
          ),
        },
      ],
    ]);
    expect(result).toStrictEqual({
      content: [
        {
          type: "text",
          text: "Legacy receipts migrated. Removed legacy verification_receipts from 1 test(s).",
        },
      ],
      structuredContent: { migrated: 1, tests: [{ testId: "7" }] },
    });
  });

  test("migrates a selected test from its authored block alone", async () => {
    const entity = testEntity({ source: "t.md" });
    const { single, write, context } = harness([entity], {
      "/ws/t.md": LEGACY_DOC,
    });
    const result = await executeMigrateLegacyReceipts(
      { testId: "TEST-MAINT" },
      context,
    );
    expect(single.mock.calls).toStrictEqual([
      [PROLOG, { type: "test", id: "TEST-MAINT" }],
    ]);
    expect(write.mock.calls.length).toBe(1);
    expect(result.structuredContent).toStrictEqual({
      migrated: 1,
      tests: [{ testId: "TEST-MAINT" }],
    });
  });

  for (const proof_contract of [null, "kibi.proof-contract.v1", undefined]) {
    test(`skips tests whose proof contract is ${String(proof_contract)}`, async () => {
      const { write, fs, context } = harness(
        [
          testEntity({
            proof_contract,
            source: "tests/t.ts",
            verification_receipts: [{ outcome: "passed" }],
          }),
        ],
        { "/ws/.kb/tests/TEST-MAINT.md": LEGACY_DOC },
      );
      const result = await executeMigrateLegacyReceipts({}, context);
      expect(write).not.toHaveBeenCalled();
      expect(fs.reads).toStrictEqual([]);
      expect(result).toStrictEqual({
        content: [{ type: "text", text: NONE_TEXT }],
        structuredContent: { migrated: 0, tests: [] },
      });
    });
  }

  for (const [source, shown] of [
    ["tests/t.md.bak", "tests/t.md.bak"],
    ["tests/readmd", "tests/readmd"],
    ["", "unknown"],
    [42, "unknown"],
  ] as const) {
    test(`refuses a compiled legacy lane on source ${String(source) || "''"}`, async () => {
      const { write, context } = harness(
        [testEntity({ source, verification_receipts: [] })],
        {
          "/ws/tests/t.md.bak": LEGACY_DOC,
          "/ws/tests/readmd": LEGACY_DOC,
        },
      );
      await expect(executeMigrateLegacyReceipts({}, context)).rejects.toThrow(
        new Error(
          `Legacy receipt migration failed for TEST-MAINT: test source '${shown}' is not an authored markdown document`,
        ),
      );
      expect(write).not.toHaveBeenCalled();
    });
  }

  test("ignores non-markdown sources without a compiled legacy lane", async () => {
    const { write, fs, context } = harness([
      testEntity({ source: "tests/t.ts", verification_receipts: "x" }),
    ]);
    const result = await executeMigrateLegacyReceipts({}, context);
    expect(write).not.toHaveBeenCalled();
    expect(fs.reads).toStrictEqual([]);
    expect(result.structuredContent).toStrictEqual({ migrated: 0, tests: [] });
  });

  test("refuses a compiled legacy lane whose document cannot be patched", async () => {
    const { write, context } = harness(
      [testEntity({ source: "t.md", verification_receipts: [] })],
      { "/ws/t.md": CLEAN_DOC },
    );
    await expect(executeMigrateLegacyReceipts({}, context)).rejects.toThrow(
      new Error(
        "Legacy receipt migration failed for TEST-MAINT: t.md is not a patchable frontmatter document",
      ),
    );
    expect(write).not.toHaveBeenCalled();
  });

  test("reports nothing to migrate in an empty store", async () => {
    const { paged, single, write, context } = harness([]);
    const result = await executeMigrateLegacyReceipts({}, context);
    expect(paged.mock.calls).toStrictEqual([[PROLOG, "test"]]);
    expect(single).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(result.content[0]?.text).toBe(NONE_TEXT);
  });

  test("leaves clean documents without a compiled lane alone", async () => {
    const { write, fs, context } = harness([testEntity({ source: "t.md" })], {
      "/ws/t.md": CLEAN_DOC,
    });
    const result = await executeMigrateLegacyReceipts({}, context);
    expect(fs.reads).toStrictEqual(["/ws/t.md"]);
    expect(write).not.toHaveBeenCalled();
    expect(result.content[0]?.text).toBe(NONE_TEXT);
  });
});
