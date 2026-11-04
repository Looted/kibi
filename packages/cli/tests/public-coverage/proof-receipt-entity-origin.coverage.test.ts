import { describe, expect, test } from "bun:test";
import {
  normalizeEntityOrigin,
  readEntityOrigin,
} from "../../src/public/entity-origin.js";
import { PROOF_RECEIPT_VERSION } from "../../src/public/proof-protocol.js";
import { validProofReceiptShape } from "../../src/public/proof-receipt.js";

const SNAPSHOT = "a".repeat(64);

function receipt(overrides: Record<string, unknown> = {}) {
  return {
    version: PROOF_RECEIPT_VERSION,
    kind: "e2e",
    evidence_level: "tested",
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

describe("validProofReceiptShape", () => {
  test("a v2 receipt is valid, with or without claim bindings", () => {
    expect(validProofReceiptShape("TEST-001", receipt())).toBe(true);
    expect(
      validProofReceiptShape(
        "TEST-001",
        receipt({
          claim_bindings: [
            { claim_key: "CLAIM-a", binding: "derived" },
            {
              claim_key: "CLAIM-b",
              binding: "derived",
              scope: "intent",
              obligation: {},
              reason: "r",
            },
            { claim_key: "CLAIM-c", binding: "derived", scope: "code" },
            { claim_key: "CLAIM-d", binding: "derived", scope: "source" },
            { claim_key: "CLAIM-e", binding: "derived", scope: "harness" },
          ],
        }),
      ),
    ).toBe(true);
  });

  test("malformed claim bindings make the receipt invalid", () => {
    for (const claim_bindings of [
      {},
      [null],
      [{ claim_key: "", binding: "derived" }],
      [{ claim_key: "CLAIM-a", binding: "nope" }],
      [{ claim_key: "CLAIM-a", binding: "derived", scope: "other" }],
      [{ claim_key: "CLAIM-a", binding: "derived", obligation: 1 }],
      [{ claim_key: "CLAIM-a", binding: "derived", reason: " " }],
    ])
      expect(
        validProofReceiptShape("TEST-001", receipt({ claim_bindings })),
      ).toBe(false);
  });

  test("timestamps must have the ISO shape", () => {
    expect(
      validProofReceiptShape("TEST-001", receipt({ started_at: "yesterday" })),
    ).toBe(false);
    expect(
      validProofReceiptShape("TEST-001", receipt({ finished_at: 5 })),
    ).toBe(false);
  });
});

describe("entity origin", () => {
  test("rejects an empty ref and a malformed recorded_at", () => {
    expect(normalizeEntityOrigin({ kind: "human", ref: " " })).toStrictEqual({
      error: "origin.ref must be a non-empty string",
    });
    expect(
      normalizeEntityOrigin({ kind: "human", recorded_at: "soon" }),
    ).toStrictEqual({
      error: "origin.recorded_at must be an ISO-8601 timestamp",
    });
  });

  test("an unparseable JSON origin reads as absent", () => {
    expect(readEntityOrigin("{ nope")).toBeNull();
  });
});
