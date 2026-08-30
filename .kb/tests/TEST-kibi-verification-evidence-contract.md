---
id: TEST-kibi-verification-evidence-contract
title: End-to-end proof receipt contract
type: test
status: passing
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-14T00:00:00.000Z
source: documentation/tests/TEST-kibi-verification-evidence-contract.md
priority: must
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - verification
  - e2e
  - playwright
  - receipts
  - proof
  - test
links:
  - type: validates
    target: SCEN-kibi-verification-evidence-contract
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-fresh-verification-receipts
      target: default
  success_policy: all_required_first_attempt
---

Receipt and reporter tests verify stable case IDs, contract and snapshot binding, append-only history across contract evolution, exact argv capture, first-attempt proof semantics, and rejection of stale, skipped, retried, partial, or mismatched runs. Earlier-contract receipts remain immutable audit evidence, while only a receipt for the current contract and snapshot contributes proof.
