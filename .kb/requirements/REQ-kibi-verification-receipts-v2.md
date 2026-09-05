---
id: REQ-kibi-verification-receipts-v2
title: Proof-bearing E2E tests use current-contract proof receipts v2
status: open
created_at: 2026-08-14T00:00:00Z
updated_at: 2026-08-14T00:00:00Z
source: documentation/requirements/REQ-kibi-verification-receipts-v2.md
priority: must
tags: [requirements, proof, verification, receipts, e2e, v2, append-only]
logic_claims:
  - CLAIM-A6734C6CCC68461C
  - CLAIM-1B5C90C8255DC923
  - CLAIM-8B06994E3CF38F57
  - CLAIM-7759B4F299814C2C
semantic_text: Proof-bearing tests must use kibi.proof-receipt.v1 evidence produced by kibi prove. Each proof receipt must bind exact integration command argv, the current proof contract hash, the effective execution fingerprint, complete required proof obligations, the live code snapshot, run-level outcome, timestamps, and artifact digest. Proof receipt history remains append-only with deterministic idempotent receipt identity. Only a current proof receipt matching the live snapshot, contract hash, and execution fingerprint may prove the test.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 06b7cacf07513fccbafb1079830006b16c719ea7be456f4bc733c2975f0dbb10
semantic_inventory:
  - claim_key: CLAIM-A6734C6CCC68461C
    claim_text: Proof-bearing tests must use kibi.proof-receipt.v1 evidence produced by kibi prove
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 82
  - claim_key: CLAIM-1B5C90C8255DC923
    claim_text: Each proof receipt must bind exact integration command argv, the current proof contract hash, the effective execution fingerprint, complete required proof obligations, the live code snapshot, run-level outcome, timestamps, and artifact digest
    role: normative
    status: ontology_gap
    span:
      start: 84
      end: 326
  - claim_key: CLAIM-8B06994E3CF38F57
    claim_text: Proof receipt history remains append-only with deterministic idempotent receipt identity
    role: descriptive
    status: ontology_gap
    span:
      start: 328
      end: 416
  - claim_key: CLAIM-7759B4F299814C2C
    claim_text: Only a current proof receipt matching the live snapshot, contract hash, and execution fingerprint may prove the test
    role: normative
    status: ontology_gap
    span:
      start: 418
      end: 534
links:
  - type: specified_by
    target: SCEN-kibi-verification-receipts-v2
  - type: verified_by
    target: TEST-kibi-verification-receipts-v2
---

Proof-bearing tests must use kibi.proof-receipt.v1 evidence produced by kibi prove. Each proof receipt must bind exact integration command argv, the current proof contract hash, the effective execution fingerprint, complete required proof obligations, the live code snapshot, run-level outcome, timestamps, and artifact digest. Proof receipt history remains append-only with deterministic idempotent receipt identity. Only a current proof receipt matching the live snapshot, contract hash, and execution fingerprint may prove the test.
