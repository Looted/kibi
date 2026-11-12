import { describe, expect, test } from "bun:test";
import {
  patchReceiptsIntoDocument,
  removeFrontmatterBlock,
} from "../../../src/operations/proof/receipt-document.js";

const DOC = [
  "---",
  "id: TEST-1",
  "verification_receipts:",
  "  - kind: unit",
  "    status: passed",
  "tags: [a, b]",
  "---",
  "verification_receipts: body text stays",
  "",
].join("\n");

describe("removeFrontmatterBlock", () => {
  test("removes the block up to the next top-level key", () => {
    expect(removeFrontmatterBlock(DOC, "verification_receipts")).toBe(
      "---\nid: TEST-1\ntags: [a, b]\n---\nverification_receipts: body text stays\n",
    );
  });

  test("removes a last block up to the closing line", () => {
    expect(
      removeFrontmatterBlock("---\nid: X\nlegacy :\n  - 1\n---\nBody", "legacy"),
    ).toBe("---\nid: X\n---\nBody");
  });

  test("ends a block at any top-level key shape", () => {
    for (const key of ["_k", "K", "k-1", "k2", "k :"]) {
      const next = key.endsWith(":") ? key : `${key}:`;
      expect(
        removeFrontmatterBlock(`---\nold:\n  x: 1\n${next} v\n---\n`, "old"),
      ).toBe(`---\n${next} v\n---\n`);
    }
    for (const nested of ["  x: 1", "- k: 1", "1k: 2", "-k: 1"]) {
      expect(
        removeFrontmatterBlock(`---\nold:\n${nested}\nnext: 1\n---\n`, "old"),
      ).toBe("---\nnext: 1\n---\n");
    }
  });

  test("only matches the key at the start of a line", () => {
    expect(
      removeFrontmatterBlock("---\nx_old: 1\nold: 2\n---\n", "old"),
    ).toBe("---\nx_old: 1\n---\n");
    expect(removeFrontmatterBlock("---\nolder: 1\n---\n", "old")).toBeNull();
  });

  test("refuses documents it cannot splice", () => {
    expect(removeFrontmatterBlock("", "old")).toBeNull();
    expect(removeFrontmatterBlock("old: 1\n", "old")).toBeNull();
    expect(removeFrontmatterBlock("---\nold: 1\n", "old")).toBeNull();
    expect(removeFrontmatterBlock("---\nid: 1\n---\nold: 1\n", "old")).toBeNull();
    expect(removeFrontmatterBlock("---\nid: 1\n---\n", "old")).toBeNull();
  });

  test("accepts padded fence lines", () => {
    expect(removeFrontmatterBlock(" --- \nold: 1\n---  \nB", "old")).toBe(
      " --- \n---  \nB",
    );
  });
});

describe("patchReceiptsIntoDocument", () => {
  const shared = { at: "x" };
  const receipts = [
    { z: "last key first", a: shared, long: "w ".repeat(60).trim() },
    { b: shared },
  ];
  const BLOCK = `proof_receipts:\n  - z: last key first\n    a:\n      at: x\n    long: ${"w ".repeat(60).trim()}\n  - b:\n      at: x\n`;

  test("replaces an existing receipts block in place", () => {
    const content =
      "---\nid: T\nproof_receipts:\n  - old: 1\ntags: [a]\n---\nBody\n";
    expect(patchReceiptsIntoDocument(content, receipts)).toBe(
      `---\nid: T\n${BLOCK}tags: [a]\n---\nBody\n`,
    );
  });

  test("replaces a last receipts block and appends a missing one", () => {
    expect(
      patchReceiptsIntoDocument("---\nproof_receipts: []\n---\n", [{ k: 1 }]),
    ).toBe("---\nproof_receipts:\n  - k: 1\n---\n");
    expect(
      patchReceiptsIntoDocument("---\nid: T\n---\nproof_receipts: body\n", [
        { k: 1 },
      ]),
    ).toBe("---\nid: T\nproof_receipts:\n  - k: 1\n---\nproof_receipts: body\n");
  });

  test("finds the receipts key only at a line start, spaced or not", () => {
    expect(
      patchReceiptsIntoDocument(
        "---\nx_proof_receipts: 1\nproof_receipts :\n  - old: 1\n---\n",
        [{ k: 1 }],
      ),
    ).toBe("---\nx_proof_receipts: 1\nproof_receipts:\n  - k: 1\n---\n");
  });

  test("does not alias the caller's receipts", () => {
    const receipt = { k: 1 };
    patchReceiptsIntoDocument("---\n---\n", [receipt]);
    expect(receipt).toStrictEqual({ k: 1 });
  });

  test("refuses documents it cannot splice", () => {
    expect(patchReceiptsIntoDocument("", [])).toBeNull();
    expect(patchReceiptsIntoDocument("id: 1\n---\n", [])).toBeNull();
    expect(patchReceiptsIntoDocument("---\nid: 1\n", [])).toBeNull();
  });
});
