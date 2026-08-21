---
id: REQ-kibi-verification-evidence-contract
title: Kibi binds end-to-end tests to stable cases and fresh proof receipts
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
semantic_source_hash: d24c6602c1b9e9f8749e3942e61e1670062a1dcf311019ca5c718effc4ce5e12
logic_claims:
  - CLAIM-B82AFD45D25355EB
  - CLAIM-6C829C8424C2387C
semantic_inventory:
  - claim_key: CLAIM-B82AFD45D25355EB
    claim_text: Kibi must give each discovered end-to-end case a stable source-and-title identity, connect executable test symbols to that case, and accept proof only from a fresh, passed verification receipt bound to the current verification contract and snapshot
    role: normative
    status: modeled
    span:
      start: 0
      end: 248
    payload_hash: e8da21cde48ae918f7c2fe84b29a7ba9e473162fe438264bc40170a17909c7d1
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
  - claim_key: CLAIM-6C829C8424C2387C
    claim_text: Retries, skips, stale receipts, partial runs, and mismatched contracts must remain non-proof outcomes
    role: normative
    status: modeled
    span:
      start: 250
      end: 351
    payload_hash: e8da21cde48ae918f7c2fe84b29a7ba9e473162fe438264bc40170a17909c7d1
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
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
semantic_text: Kibi must give each discovered end-to-end case a stable source-and-title identity, connect executable test symbols to that case, and accept proof only from a fresh, passed verification receipt bound to the current verification contract and snapshot. Retries, skips, stale receipts, partial runs, and mismatched contracts must remain non-proof outcomes.
type: req
---

Kibi must give each discovered end-to-end case a stable source-and-title identity, connect executable test symbols to that case, and accept proof only from a fresh, passed verification receipt bound to the current verification contract and snapshot. Retries, skips, stale receipts, partial runs, and mismatched contracts must remain non-proof outcomes.
