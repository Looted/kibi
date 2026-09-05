---
id: REQ-kibi-verification-evidence-contract
title: Kibi binds proof-bearing tests to stable obligations and fresh proof receipts
status: open
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-13T00:00:00.000Z
source: documentation/requirements/REQ-kibi-verification-evidence-contract.md
priority: must
owner: platform-team
tags:
  - verification
  - e2e
  - playwright
  - receipts
  - proof
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0d306a819eaeffa40bca53923d7146f7ce6829f97ea3029f69c9b1dec79b71e4
logic_claims:
  - CLAIM-90DA2167F7920924
  - CLAIM-25FBD776F3705A82
semantic_inventory:
  - claim_key: CLAIM-90DA2167F7920924
    claim_text: Kibi must give each proof obligation a stable symbol identity, connect executable test symbols to that obligation, and accept proof only from fresh, passed proof receipts bound to the current proof contract, execution fingerprint, and snapshot
    role: normative
    status: modeled
    span:
      start: 0
      end: 243
  - claim_key: CLAIM-25FBD776F3705A82
    claim_text: Unknown attempt histories, retries, skips, failed runs, stale receipts, and mismatched contracts or fingerprints must remain non-proof outcomes
    role: normative
    status: modeled
    span:
      start: 245
      end: 388
links:
  - type: constrains
    target: FACT-REQ-PROOF-VERIFICATION-SUBJECT
  - type: requires_property
    target: FACT-REQ-PROOF-VERIFICATION-CASE-PROOF
  - type: requires_property
    target: FACT-REQ-PROOF-VERIFICATION-NON-PROOF-OUTCOMES
  - type: specified_by
    target: SCEN-kibi-verification-evidence-contract
  - type: verified_by
    target: TEST-kibi-verification-evidence-contract
semantic_text: Kibi must give each proof obligation a stable symbol identity, connect executable test symbols to that obligation, and accept proof only from fresh, passed proof receipts bound to the current proof contract, execution fingerprint, and snapshot. Unknown attempt histories, retries, skips, failed runs, stale receipts, and mismatched contracts or fingerprints must remain non-proof outcomes.
type: req
---

Kibi must give each proof obligation a stable symbol identity, connect executable test symbols to that obligation, and accept proof only from fresh, passed proof receipts bound to the current proof contract, execution fingerprint, and snapshot. Unknown attempt histories, retries, skips, failed runs, stale receipts, and mismatched contracts or fingerprints must remain non-proof outcomes.
