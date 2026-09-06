// implements REQ-kibi-proof-evidence-protocol
import { afterEach, describe, expect, test } from "bun:test";
import { proofContractHash } from "../../src/public/proof-fingerprint.js";
import {
  MAX_PROOF_RECEIPTS,
  appendOnlyProofReceiptHistoryErrors,
  proofReceiptCurrentBindingErrors,
  validProofReceiptShape,
} from "../../src/public/proof-receipt.js";
import {
  PROOF_CONTRACT_VERSION,
  PROOF_RECEIPT_VERSION,
} from "../../src/public/proof-protocol.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

const SNAPSHOT = "a".repeat(64);

function baseReceipt(overrides: Record<string, unknown> = {}) {
  return {
    version: PROOF_RECEIPT_VERSION,
    receipt_id: "PR-test-receipt-000001",
    test_id: "TEST-001",
    scope: "end_to_end",
    outcome: "passed",
    code_snapshot: SNAPSHOT,
    environment_hash: SNAPSHOT,
    started_at: "2026-08-13T00:00:00Z",
    finished_at: "2026-08-13T00:00:01Z",
    artifact_digest: SNAPSHOT,
    contract_hash: SNAPSHOT,
    fingerprint: SNAPSHOT,
    fingerprint_components: {
      contract: SNAPSHOT,
      integration: SNAPSHOT,
      command: SNAPSHOT,
      bindings: SNAPSHOT,
      producer: SNAPSHOT,
    },
    integration_id: "self-proof",
    producer: { name: "kibi-command-producer" },
    command_argv: ["node", "scripts/proof.mjs"],
    run_outcome: "passed",
    proof_results: [
      {
        symbol_id: "SYM-1",
        target: "default",
        outcome: "passed",
        binding: "aggregate_run",
        attempts: { status: "unavailable" },
      },
    ],
    ...overrides,
  };
}

describe("proof-receipt remaining timestamp, binding, and rotation branches", () => {
  test("rejects timestamps that fail the ISO shape", () => {
    restores.push(isolateKibiEnv());
    expect(
      validProofReceiptShape(
        "TEST-001",
        baseReceipt({ started_at: "not-an-iso-timestamp" }),
      ),
    ).toBe(false);
  });

  test("current binding reports test id, missing scope, contract, and fingerprint mismatches", () => {
    restores.push(isolateKibiEnv());
    const receipt = baseReceipt();
    expect(
      proofReceiptCurrentBindingErrors("TEST-OTHER", "end_to_end", receipt)[0],
    ).toContain("test_id must equal");
    expect(
      proofReceiptCurrentBindingErrors("TEST-001", undefined, receipt)[0],
    ).toContain("verification_scope is required");

    const contract = {
      version: PROOF_CONTRACT_VERSION,
      integration: "self-proof",
      required_proofs: [{ symbol_id: "SYM-1", target: "default" }],
      success_policy: "all_required_first_attempt" as const,
    };
    expect(
      proofReceiptCurrentBindingErrors(
        "TEST-001",
        "end_to_end",
        receipt,
        contract,
      )[0],
    ).toContain("contract_hash does not match");
    expect(
      proofReceiptCurrentBindingErrors(
        "TEST-001",
        "end_to_end",
        { ...receipt, contract_hash: proofContractHash(contract) },
        contract,
        "b".repeat(64),
      )[0],
    ).toContain("fingerprint does not match");
  });

  test("cap rotation returns false when preserved receipts were rewritten", () => {
    restores.push(isolateKibiEnv());
    const history = Array.from({ length: MAX_PROOF_RECEIPTS }, (_, index) =>
      baseReceipt({
        receipt_id: `PR-rotation-${String(index).padStart(3, "0")}`,
        started_at: `2026-08-10T00:00:${String(index % 60).padStart(2, "0")}Z`,
        finished_at: `2026-08-10T00:00:${String(index % 60).padStart(2, "0")}Z`,
      }),
    );
    const rewritten = [
      ...history.slice(1, -1),
      baseReceipt({ receipt_id: "PR-rewritten-middle" }),
      baseReceipt({ receipt_id: "PR-newest" }),
    ];
    expect(rewritten).toHaveLength(MAX_PROOF_RECEIPTS);
    expect(
      appendOnlyProofReceiptHistoryErrors(history, rewritten)[0],
    ).toContain("append-only");
  });
});
