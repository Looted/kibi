---
id: REQ-kibi-verification-evidence-contract
title: Kibi binds end-to-end tests to stable cases and fresh proof receipts
status: open
created_at: 2026-08-13T00:00:00Z
updated_at: 2026-08-13T00:00:00Z
source: documentation/requirements/REQ-kibi-verification-evidence-contract.md
priority: must
owner: platform-team
tags: [verification, e2e, playwright, receipts, proof]
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d24c6602c1b9e9f8749e3942e61e1670062a1dcf311019ca5c718effc4ce5e12
logic_claims: ["CLAIM-B82AFD45D25355EB","CLAIM-1A610F01C3FDD6FD","CLAIM-B605A89256E0CEF1"]
semantic_inventory: [{"claim_key":"CLAIM-B82AFD45D25355EB","claim_text":"Kibi must give each discovered end-to-end case a stable source-and-title identity, connect executable test symbols to that case, and accept proof only from a fresh, passed verification receipt bound to the current verification contract and snapshot","role":"normative","status":"modeled","span":{"start":0,"end":248},"payload_hash":"43c389888687252ff3b0afb0427302149d4c1e6ce03964dbe2588974de2e9d2c","reason":"This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete."},{"claim_key":"CLAIM-1A610F01C3FDD6FD","claim_text":"Retries, skips, stale receipts, partial runs","role":"descriptive","status":"modeled","span":{"start":250,"end":294},"payload_hash":"43c389888687252ff3b0afb0427302149d4c1e6ce03964dbe2588974de2e9d2c","reason":"No accepted typed interpretation grounds this assertive proposition."},{"claim_key":"CLAIM-B605A89256E0CEF1","claim_text":"mismatched contracts must remain non-proof outcomes","role":"normative","status":"modeled","span":{"start":300,"end":351},"payload_hash":"43c389888687252ff3b0afb0427302149d4c1e6ce03964dbe2588974de2e9d2c","reason":"This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete."}]
links:
  - type: constrains
    target: FACT-REQ-PROOF-VERIFICATION-SUBJECT
  - type: requires_property
    target: FACT-REQ-PROOF-VERIFICATION-CASE-PROOF
  - type: requires_property
    target: FACT-REQ-PROOF-VERIFICATION-RETRY-SAFETY
  - type: requires_property
    target: FACT-REQ-PROOF-VERIFICATION-CONTRACT-SAFETY
  - type: specified_by
    target: SCEN-kibi-verification-evidence-contract
  - type: verified_by
    target: TEST-kibi-verification-evidence-contract
---

Kibi must give each discovered end-to-end case a stable source-and-title identity, connect executable test symbols to that case, and accept proof only from a fresh, passed verification receipt bound to the current verification contract and snapshot. Retries, skips, stale receipts, partial runs, and mismatched contracts must remain non-proof outcomes.
