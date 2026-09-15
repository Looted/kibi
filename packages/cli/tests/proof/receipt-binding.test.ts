/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { describe, expect, test } from "bun:test";
import {
  PROOF_RECEIPT_SCHEMA,
  validProofReceiptShape,
} from "../../src/public/proof-receipt.js";
import { receiptBindingHash } from "../../src/public/proof-fingerprint.js";
import { removeFrontmatterBlock } from "../../src/operations/proof/receipt-document.js";

const contract = {
  version: "kibi.proof-contract.v1" as const,
  integration: "self-proof",
  required_proofs: [
    { symbol_id: "SYM-test-binding", target: "default" },
  ],
  success_policy: "all_required_first_attempt" as const,
};

const doc = `---
id: TEST-binding
title: Binding test
---

Body text.
`;

describe("receiptBindingHash", () => {
  test("is stable for identical contract and document", () => {
    expect(receiptBindingHash(contract, doc)).toBe(
      receiptBindingHash(contract, doc),
    );
  });

  test("changes when the test document changes", () => {
    expect(receiptBindingHash(contract, `${doc}\nMore body.\n`)).not.toBe(
      receiptBindingHash(contract, doc),
    );
  });

  test("changes when the contract changes", () => {
    expect(
      receiptBindingHash({ ...contract, integration: "other" }, doc),
    ).not.toBe(receiptBindingHash(contract, doc));
  });

  test("changes when the code scope changes", () => {
    const scopeA = [{ symbolId: "SYM-a", sourceHash: "hash-1" }];
    const scopeB = [{ symbolId: "SYM-a", sourceHash: "hash-2" }];
    const base = receiptBindingHash(contract, doc, scopeA);
    expect(receiptBindingHash(contract, doc, scopeA)).toBe(base);
    expect(receiptBindingHash(contract, doc, scopeB)).not.toBe(base);
    expect(receiptBindingHash(contract, doc)).not.toBe(base);
  });

  test("code scope ordering does not change the binding", () => {
    const forward = receiptBindingHash(contract, doc, [
      { symbolId: "SYM-a", sourceHash: "h1" },
      { symbolId: "SYM-b", sourceHash: "h2" },
    ]);
    const backward = receiptBindingHash(contract, doc, [
      { symbolId: "SYM-b", sourceHash: "h2" },
      { symbolId: "SYM-a", sourceHash: "h1" },
    ]);
    expect(forward).toBe(backward);
  });

  test("ignores receipt-block differences once the caller strips them", () => {
    const withReceipts = `---
id: TEST-binding
title: Binding test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-xyz
---

Body text.
`;
    const strip = (text: string): string =>
      removeFrontmatterBlock(text, "proof_receipts") ?? text;
    expect(receiptBindingHash(contract, strip(doc))).toBe(
      receiptBindingHash(contract, strip(withReceipts)),
    );
  });
});

describe("PROOF_RECEIPT_SCHEMA binding_hash", () => {
  const baseReceipt = {
    version: "kibi.proof-receipt.v1",
    receipt_id: "PR-abc12345",
    test_id: "TEST-binding",
    scope: "end_to_end",
    outcome: "passed",
    code_snapshot: "a".repeat(64),
    environment_hash: "b".repeat(64),
    started_at: "2026-09-14T00:00:00Z",
    finished_at: "2026-09-14T01:00:00Z",
    artifact_digest: "c".repeat(64),
    contract_hash: "d".repeat(64),
    fingerprint: "e".repeat(64),
    fingerprint_components: {
      contract: "1".repeat(64),
      integration: "2".repeat(64),
      command: "3".repeat(64),
      bindings: "4".repeat(64),
      producer: "5".repeat(64),
    },
    integration_id: "self-proof",
    producer: { name: "kibi-command-producer" },
    command_argv: ["node", "scripts/run-proof-producer.mjs"],
    run_outcome: "passed",
    proof_results: [],
  };

  test("accepts a receipt without binding_hash (legacy receipts stay valid)", () => {
    expect(validProofReceiptShape("TEST-binding", baseReceipt)).toBe(true);
  });

  test("accepts a hex64 binding_hash", () => {
    expect(
      validProofReceiptShape("TEST-binding", {
        ...baseReceipt,
        binding_hash: "f".repeat(64),
      }),
    ).toBe(true);
  });

  test("rejects a malformed binding_hash", () => {
    expect(
      validProofReceiptShape("TEST-binding", {
        ...baseReceipt,
        binding_hash: "not-a-hash",
      }),
    ).toBe(false);
  });

  test("schema exposes binding_hash as optional", () => {
    const properties = PROOF_RECEIPT_SCHEMA.properties as unknown as Record<
      string,
      { required?: boolean }
    >;
    expect(properties.binding_hash).toBeDefined();
    expect(PROOF_RECEIPT_SCHEMA.required).not.toContain("binding_hash");
  });
});
