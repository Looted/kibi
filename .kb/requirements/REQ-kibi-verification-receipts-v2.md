---
id: REQ-kibi-verification-receipts-v2
title: Proof-bearing E2E tests use current-contract verification receipts v2
status: open
created_at: 2026-08-14T00:00:00Z
updated_at: 2026-08-14T00:00:00Z
source: documentation/requirements/REQ-kibi-verification-receipts-v2.md
priority: must
tags: [requirements, proof, verification, receipts, e2e, v2, append-only]
logic_claims:
  - CLAIM-446FFD09299A4CDF
  - CLAIM-FF40133A7F6EE7ED
  - CLAIM-EADB4467F0180C64
  - CLAIM-B9954611D3BBD536
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 60bad4fdaf88babd8719bb6da3145e5fc565b91b3ba6fa771a64ae914f88295c
semantic_inventory:
  - claim_key: CLAIM-446FFD09299A4CDF
    claim_text: Proof-bearing end-to-end tests must use kibi.verification-receipt.v2 evidence produced by kibi verify
    role: normative
    status: ontology_gap
    span: {start: 0, end: 101}
  - claim_key: CLAIM-FF40133A7F6EE7ED
    claim_text: Each v2 receipt must bind exact command argv, the current verification contract hash, unique required case results, valid retry counts and durations, the live code snapshot, outcome, timestamps, and artifact digest
    role: normative
    status: ontology_gap
    span: {start: 103, end: 317}
  - claim_key: CLAIM-EADB4467F0180C64
    claim_text: Receipt history remains append-only, and older v1 entries remain readable historical compatibility data
    role: descriptive
    status: ontology_gap
    span: {start: 319, end: 422}
  - claim_key: CLAIM-B9954611D3BBD536
    claim_text: Only a current-contract receipt matching the live snapshot may prove the test
    role: normative
    status: ontology_gap
    span: {start: 424, end: 501}
links:
  - type: specified_by
    target: SCEN-kibi-verification-receipts-v2
  - type: verified_by
    target: TEST-kibi-verification-receipts-v2
---

Proof-bearing end-to-end tests must use kibi.verification-receipt.v2 evidence produced by kibi verify. Each v2 receipt must bind exact command argv, the current verification contract hash, unique required case results, valid retry counts and durations, the live code snapshot, outcome, timestamps, and artifact digest. Receipt history remains append-only, and older v1 entries remain readable historical compatibility data. Only a current-contract receipt matching the live snapshot may prove the test.
