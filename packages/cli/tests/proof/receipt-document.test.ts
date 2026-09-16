import { describe, expect, test } from "bun:test";
import {
  patchReceiptsIntoDocument,
  removeFrontmatterBlock,
} from "../../src/operations/proof/receipt-document.js";

const HAND_AUTHORED = `---
id: TEST-HAND-AUTHORED
title: Hand authored test
status: active
tags: [smoke, editor]
created_at: 2026-06-10T00:00:00Z
proof_contract:
  version: kibi.proof-contract.v1
  integration: web-e2e
---

Some body text.
`;

const receipt = {
  version: "kibi.proof-receipt.v1",
  receipt_id: "PR-abc123",
  test_id: "TEST-HAND-AUTHORED",
  outcome: "passed",
};

describe("patchReceiptsIntoDocument", () => {
  test("appends a receipts block to frontmatter without touching other bytes", () => {
    const patched = patchReceiptsIntoDocument(HAND_AUTHORED, [receipt]);
    expect(patched).not.toBeNull();
    expect(patched).toContain("tags: [smoke, editor]");
    expect(patched).toContain("created_at: 2026-06-10T00:00:00Z");
    expect(patched).toContain("proof_receipts:");
    expect(patched).toContain("PR-abc123");
    // Body and all pre-existing lines are preserved verbatim.
    for (const line of HAND_AUTHORED.split("\n")) {
      if (line === "---") continue;
      expect(patched).toContain(line);
    }
  });

  test("replaces an existing receipts block in place", () => {
    const withReceipts = patchReceiptsIntoDocument(HAND_AUTHORED, [receipt]);
    expect(withReceipts).not.toBeNull();
    if (withReceipts === null) return;
    const newer = { ...receipt, receipt_id: "PR-def456" };
    const patched = patchReceiptsIntoDocument(withReceipts, [newer]);
    expect(patched).not.toBeNull();
    expect(patched).toContain("PR-def456");
    expect(patched).not.toContain("PR-abc123");
    expect(patched).toContain("tags: [smoke, editor]");
    // Only one receipts block remains.
    expect(patched?.match(/^proof_receipts:/gm)).toHaveLength(1);
  });

  test("returns null for documents without frontmatter", () => {
    expect(patchReceiptsIntoDocument("no frontmatter\n", [])).toBeNull();
  });

  test("returns null for unterminated frontmatter", () => {
    expect(
      patchReceiptsIntoDocument("---\nid: X\nno closing marker\n", []),
    ).toBeNull();
  });

  test("serializes receipts so the snapshotter strip pattern still applies", () => {
    const patched = patchReceiptsIntoDocument(HAND_AUTHORED, [receipt]);
    expect(patched).not.toBeNull();
    if (patched === null) return;
    const lines = patched.split("\n");
    const start = lines.indexOf("proof_receipts:");
    expect(start).toBeGreaterThan(0);
    // The next top-level key (or the closing ---) ends the block; nested
    // receipt keys are indented and never at column 0.
    for (let i = start + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line === "---" || /^[A-Za-z_][A-Za-z0-9_-]*:/.test(line)) break;
      expect(line.startsWith("- ") || /^\s/.test(line) || line === "").toBe(
        true,
      );
    }
  });
});

describe("removeFrontmatterBlock", () => {
  test("removes a legacy block and keeps everything else byte-identical", () => {
    const withLegacy = `---
id: TEST-LEGACY
title: Legacy test
status: active
verification_receipts:
  - version: kibi.verification-receipt.v1
    snapshot: deadbeef
tags: [legacy]
---

body
`;
    const patched = removeFrontmatterBlock(withLegacy, "verification_receipts");
    expect(patched).not.toBeNull();
    expect(patched).not.toContain("verification_receipts");
    expect(patched).not.toContain("deadbeef");
    expect(patched).toContain("tags: [legacy]");
    expect(patched).toContain("id: TEST-LEGACY");
    expect(patched).toContain("body");
  });
  test("returns null when the block is absent", () => {
    expect(
      removeFrontmatterBlock(HAND_AUTHORED, "verification_receipts"),
    ).toBeNull();
  });

  test("returns null for documents without frontmatter", () => {
    expect(removeFrontmatterBlock("plain text\n", "proof_receipts")).toBeNull();
  });
});
