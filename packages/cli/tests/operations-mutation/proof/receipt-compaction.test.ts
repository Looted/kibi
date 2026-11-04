import { describe, expect, test } from "bun:test";
import {
  PROOF_RECEIPT_COMPACTION_POLICY,
  compactProofReceipts,
  isOrderedReceiptSubsequence,
} from "../../../src/operations/proof/receipt-compaction.js";

const at = (minute: number) => `2026-01-01T00:${String(minute).padStart(2, "0")}:00Z`;
const receipt = (
  name: string,
  minute: number | undefined,
  extra: Record<string, unknown> = {},
) => ({
  name,
  ...(minute === undefined ? {} : { finished_at: at(minute) }),
  outcome: "failed",
  ...extra,
});
const names = (result: { kept: readonly Record<string, unknown>[] }) =>
  result.kept.map((entry) => entry.name);

describe("compactProofReceipts", () => {
  test("names its policy", () => {
    expect(PROOF_RECEIPT_COMPACTION_POLICY).toBe("kibi.proof-receipt-compaction.v1");
  });

  test("keeps nothing from an empty history", () => {
    expect(compactProofReceipts([], { bindingHash: "b" })).toStrictEqual({
      kept: [],
      removed: 0,
    });
  });

  test("keeps the newest receipt and the newest passing one", () => {
    const history = [
      receipt("old-pass", 1, { outcome: "passed" }),
      receipt("new-pass", 2, { outcome: "passed" }),
      receipt("newest", 3),
      receipt("older", 0),
    ];
    const result = compactProofReceipts(history, {});
    expect(names(result)).toStrictEqual(["new-pass", "newest"]);
    expect(result.removed).toBe(2);
    expect(result.kept[0]).toBe(history[1]);
  });

  test("equal stamps resolve to the later entry and unreadable stamps lose", () => {
    expect(
      names(compactProofReceipts([receipt("a", 5), receipt("b", 5)], {})),
    ).toStrictEqual(["b"]);
    expect(
      names(
        compactProofReceipts(
          [
            receipt("a", 5),
            receipt("bad", undefined, { finished_at: "not a date" }),
            receipt("num", undefined, { finished_at: 10 ** 15 }),
            // A number is no stamp even when its digits would parse as a year.
            receipt("year", undefined, { finished_at: 2027 }),
            receipt("none", undefined),
          ],
          {},
        ),
      ),
    ).toStrictEqual(["a"]);
    expect(
      names(
        compactProofReceipts(
          [receipt("none", undefined), receipt("bad", undefined, { finished_at: "x" })],
          {},
        ),
      ),
    ).toStrictEqual(["bad"]);
  });

  test("keeps the newest receipt per scope and contract within a binding", () => {
    const history = [
      receipt("u1", 1, { binding_hash: "B", scope: "unit", contract_hash: "c" }),
      receipt("u2", 2, { binding_hash: "B", scope: "unit", contract_hash: "c" }),
      receipt("i1", 3, { binding_hash: "B", scope: "integration", contract_hash: "c" }),
      receipt("u-d", 4, { binding_hash: "B", scope: "unit", contract_hash: "d" }),
      receipt("other", 5, { binding_hash: "X", scope: "unit", contract_hash: "c" }),
      receipt("other-old", 0, { binding_hash: "X", scope: "unit", contract_hash: "c" }),
      receipt("latest", 9),
    ];
    expect(names(compactProofReceipts(history, { bindingHash: "B" }))).toStrictEqual([
      "u2",
      "i1",
      "u-d",
      "latest",
    ]);
    expect(
      names(
        compactProofReceipts(history, {
          bindingHash: "B",
          legacyBindingHashes: ["X"],
        }),
      ),
    ).toStrictEqual(["u2", "i1", "u-d", "other", "latest"]);
    expect(
      names(compactProofReceipts(history, { legacyBindingHashes: ["X"] })),
    ).toStrictEqual(["other", "latest"]);
  });

  test("groups by the live code snapshot too", () => {
    const history = [
      receipt("s1", 1, { code_snapshot: "S", scope: "unit" }),
      receipt("s2", 2, { code_snapshot: "S", scope: "unit" }),
      receipt("t", 3, { code_snapshot: "T", scope: "unit" }),
      receipt("latest", 9),
    ];
    expect(names(compactProofReceipts(history, { codeSnapshot: "S" }))).toStrictEqual([
      "s2",
      "latest",
    ]);
  });

  test("ignores empty anchors", () => {
    const history = [
      receipt("empty", 1, { binding_hash: "", code_snapshot: "" }),
      receipt("latest", 9),
    ];
    expect(
      names(
        compactProofReceipts(history, {
          bindingHash: "",
          codeSnapshot: "",
          legacyBindingHashes: [""],
        }),
      ),
    ).toStrictEqual(["latest"]);
  });
});

describe("isOrderedReceiptSubsequence", () => {
  const a = { id: "a", n: 1 };
  const b = { id: "b", n: 2 };
  const c = { id: "c", n: 3 };

  test("accepts an ordered subsequence of equal receipts", () => {
    expect(isOrderedReceiptSubsequence([], [])).toBe(true);
    expect(isOrderedReceiptSubsequence([a, c], [a, b, c])).toBe(true);
    expect(isOrderedReceiptSubsequence([{ n: 3, id: "c" }], [a, b, c])).toBe(true);
    expect(isOrderedReceiptSubsequence([a, b, c], [a, b, c])).toBe(true);
  });

  test("rejects reordering, changes and duplicates", () => {
    expect(isOrderedReceiptSubsequence([c, a], [a, b, c])).toBe(false);
    expect(isOrderedReceiptSubsequence([{ id: "a", n: 9 }], [a, b])).toBe(false);
    expect(isOrderedReceiptSubsequence([a, a], [a, b])).toBe(false);
    expect(isOrderedReceiptSubsequence([a], [])).toBe(false);
    expect(isOrderedReceiptSubsequence([b, b], [a, b, b])).toBe(true);
  });
});
