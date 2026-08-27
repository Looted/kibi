import { describe, expect, test } from "bun:test";

import { validateAgainstSchema } from "../src/cli-validate.js";
import entitySchema from "../src/public/schemas/entity.js";
import {
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
