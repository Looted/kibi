import { describe, expect, test } from "bun:test";

import { validateAgainstSchema } from "../src/cli-validate.js";
import entitySchema from "../src/public/schemas/entity.js";
import {
  MAX_VERIFICATION_RECEIPTS,
  appendOnlyVerificationReceiptHistoryErrors,
  verificationContractHash,
  verificationReceiptCurrentBindingErrors,
  verificationReceiptHistoryErrors,
} from "../src/public/verification-receipt.js";

const contract = {
  version: "kibi.verification-contract.v1",
  runner: "playwright",
  command_argv: ["pnpm", "exec", "playwright", "test"],
  required_case_symbols: ["SYM-CASE-1"],
  required_projects: ["chromium"],
  success_policy: "all_required_cases_first_attempt",
};

const receipt = {
  version: "kibi.verification-receipt.v2",
  receipt_id: "VR-v2-case-001",
  test_id: "TEST-001",
  runner: "playwright",
  command: "pnpm exec playwright test",
  command_argv: ["pnpm", "exec", "playwright", "test"],
  scope: "end_to_end",
  outcome: "passed",
  code_snapshot: "a".repeat(64),
  environment_hash: "b".repeat(64),
  started_at: "2026-08-13T00:00:00Z",
  finished_at: "2026-08-13T00:00:01Z",
  artifact_digest: "c".repeat(64),
  contract_hash: "d".repeat(64),
  case_results: [
    {
      symbol_id: "SYM-CASE-1",
      project: "chromium",
      outcome: "passed",
      retries: 0,
      duration_ms: 1000,
    },
  ],
};

describe("verification contract and receipt v2", () => {
  test("accepts a test entity with a v1 contract and v2 receipt", () => {
    const result = validateAgainstSchema(
      {
        type: "test",
        id: "TEST-001",
        title: "Contracted browser flow",
        status: "active",
        created_at: "2026-08-13T00:00:00Z",
        updated_at: "2026-08-13T00:00:00Z",
        source: "tests/contracted.spec.ts",
        verification_scope: "end_to_end",
        verification_perspective: "consumer",
        verification_contract: contract,
        verification_receipts: [receipt],
      },
      entitySchema,
    );
    expect(result.valid).toBe(true);
  });

  test("rejects duplicate contracted cases", () => {
    const errors = verificationReceiptHistoryErrors("TEST-001", "end_to_end", [
      {
        ...receipt,
        case_results: [...receipt.case_results, ...receipt.case_results],
      },
    ]);
    expect(errors.some((error) => error.includes("duplicates"))).toBe(true);
  });

  test("preserves structurally valid receipts from an earlier contract revision", () => {
    const historyErrors = verificationReceiptHistoryErrors(
      "TEST-001",
      "end_to_end",
      [receipt],
    );
    expect(historyErrors).toEqual([]);

    const bindingErrors = verificationReceiptCurrentBindingErrors(
      "TEST-001",
      "end_to_end",
      receipt,
      contract,
    );
    expect(bindingErrors).toContain(
      "verification receipt contract_hash does not match the current verification_contract",
    );

    expect(
      verificationReceiptCurrentBindingErrors(
        "TEST-001",
        "end_to_end",
        { ...receipt, contract_hash: verificationContractHash(contract) },
        contract,
      ),
    ).toEqual([]);
  });
});

describe("append-only verification receipt history", () => {
  function numberedReceipt(index: number) {
    return {
      ...receipt,
      receipt_id: `VR-rotation-${String(index).padStart(3, "0")}`,
      started_at: `2026-08-13T00:00:${String(index % 60).padStart(2, "0")}Z`,
      finished_at: `2026-08-13T00:00:${String(index % 60).padStart(2, "0")}Z`,
    };
  }

  test("allows strict prefix extension", () => {
    const previous = [numberedReceipt(0), numberedReceipt(1)];
    const next = [...previous, numberedReceipt(2)];
    expect(appendOnlyVerificationReceiptHistoryErrors(previous, next)).toEqual(
      [],
    );
  });

  test("allows cap rotation that appends one receipt and drops only the oldest", () => {
    const previous = Array.from(
      { length: MAX_VERIFICATION_RECEIPTS + 3 },
      (_, index) => numberedReceipt(index),
    );
    const expectedNext = [
      ...previous.slice(-(MAX_VERIFICATION_RECEIPTS - 1)),
      numberedReceipt(previous.length),
    ];
    expect(expectedNext).toHaveLength(MAX_VERIFICATION_RECEIPTS);
    expect(
      appendOnlyVerificationReceiptHistoryErrors(previous, expectedNext),
    ).toEqual([]);
  });

  test("allows cap rotation when the previous history is exactly at the cap", () => {
    const previous = Array.from(
      { length: MAX_VERIFICATION_RECEIPTS },
      (_, index) => numberedReceipt(index),
    );
    const next = [...previous.slice(1), numberedReceipt(previous.length)];
    expect(appendOnlyVerificationReceiptHistoryErrors(previous, next)).toEqual(
      [],
    );
  });

  test("rejects pure pruning without an appended receipt", () => {
    const previous = Array.from(
      { length: MAX_VERIFICATION_RECEIPTS + 2 },
      (_, index) => numberedReceipt(index),
    );
    const next = previous.slice(-MAX_VERIFICATION_RECEIPTS);
    expect(appendOnlyVerificationReceiptHistoryErrors(previous, next)).toEqual([
      `verification_receipts is append-only: expected at least ${previous.length} historical receipt(s), received ${next.length}`,
    ]);
  });

  test("rejects rotation that replaces several historical receipts at once", () => {
    const previous = Array.from(
      { length: MAX_VERIFICATION_RECEIPTS + 3 },
      (_, index) => numberedReceipt(index),
    );
    const next = [
      ...previous.slice(-(MAX_VERIFICATION_RECEIPTS - 2)),
      numberedReceipt(previous.length),
      numberedReceipt(previous.length + 1),
    ];
    expect(
      appendOnlyVerificationReceiptHistoryErrors(previous, next).length,
    ).toBeGreaterThan(0);
  });

  test("rejects rotation below the cap", () => {
    const previous = Array.from(
      { length: MAX_VERIFICATION_RECEIPTS + 3 },
      (_, index) => numberedReceipt(index),
    );
    const next = [...previous.slice(-45), numberedReceipt(previous.length)];
    expect(next.length).toBeLessThan(MAX_VERIFICATION_RECEIPTS);
    expect(appendOnlyVerificationReceiptHistoryErrors(previous, next)).toEqual([
      `verification_receipts is append-only: expected at least ${previous.length} historical receipt(s), received ${next.length}`,
    ]);
  });

  test("rejects removal without replacement", () => {
    const previous = [numberedReceipt(0), numberedReceipt(1)];
    expect(
      appendOnlyVerificationReceiptHistoryErrors(previous, undefined),
    ).toEqual([
      "verification_receipts is append-only and cannot be removed from an existing test",
    ]);
  });
});
