---
id: REQ-kibi-change-to-proof-evaluation
title: Kibi measures change-to-proof search and planning quality
status: open
created_at: 2026-08-13T00:00:00Z
updated_at: 2026-08-13T00:00:00Z
source: documentation/requirements/REQ-kibi-change-to-proof-evaluation.md
priority: should
owner: platform-team
tags: [evaluation, search, planning, dogfood]
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ed3c6c2ee05785273f1379355d2f61048fba541068e532c35469a5a08c2ec4dd
logic_claims: ["CLAIM-6BF732751F159168"]
semantic_inventory: [{"claim_key":"CLAIM-6BF732751F159168","claim_text":"Kibi must ship deterministic, reviewable evaluation fixtures for intent search and change-to-proof planning so dogfood projects can compare source-linked retrieval, clause disposition, abstention, and plan quality before and after a KB migration","role":"normative","status":"modeled","span":{"start":0,"end":245},"payload_hash":"643e0f964a79142f2ee976d367504a99319353878ef8d613b55f179a40b50f28","reason":"This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete."}]
links:
  - type: constrains
    target: FACT-REQ-PROOF-EVALUATION-SUBJECT
  - type: requires_property
    target: FACT-REQ-PROOF-EVALUATION-FIXTURES
  - type: specified_by
    target: SCEN-kibi-change-to-proof-evaluation
  - type: verified_by
    target: TEST-kibi-change-to-proof-evaluation
---

Kibi must ship deterministic, reviewable evaluation fixtures for intent search and change-to-proof planning so dogfood projects can compare source-linked retrieval, clause disposition, abstention, and plan quality before and after a KB migration.
