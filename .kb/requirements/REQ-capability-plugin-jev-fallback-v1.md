---
title: Jev classifier optional fallback
status: open
tags:
  - plugins
semantic_text: The optional kibi-plugin-jev semantic classifier must create no TypeSafe client or network calls on import or inactive registry construction, and every classification failure must fall back to builtin analysis without exposing credentials.
logic_claims:
  - CLAIM-80BB0AF5275B6F57
  - CLAIM-F166E1193BEF5732
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: aac2866a2acd0b0c05fee8e8a1c38823c2b9ee01fa5b78a8ecd8e48bc409a249
semantic_inventory:
  - claim_key: CLAIM-80BB0AF5275B6F57
    claim_text: The optional kibi-plugin-jev semantic classifier must create no TypeSafe client or network calls on import or inactive registry construction
    payload_hash: acefed87263c3df2e7c3ce29997d6b849b2339c34a78d953b853ceb23f6594d6
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
    role: normative
    span:
      end: 140
      start: 0
    status: ontology_gap
  - claim_key: CLAIM-F166E1193BEF5732
    claim_text: every classification failure must fall back to builtin analysis without exposing credentials
    payload_hash: acefed87263c3df2e7c3ce29997d6b849b2339c34a78d953b853ceb23f6594d6
    reason: This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.
    role: normative
    span:
      end: 238
      start: 146
    status: ontology_gap
id: REQ-capability-plugin-jev-fallback-v1
type: req
proof_exempt: true
proof_exempt_reason: Import-time and inactive construction perform no client or network calls, malformed KIBI_JEV_TIMEOUT_MS fails closed, and provider failure falls back to builtin classification without exposing credentials. Those behaviors are executed by TEST-e2e-capability-plugins and the offline Jev tests. Client-mapping helpers stay outside the production-symbol ladder.
---
# REQ-capability-plugin-jev-fallback-v1

The optional kibi-plugin-jev semantic classifier must create no TypeSafe client or network calls on import or inactive registry construction, and every classification failure must fall back to builtin analysis without exposing credentials.
