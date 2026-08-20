---
id: REQ-kibi-intent-aware-source-discovery
title: Kibi finds requirements and implementation evidence from natural-language intent
status: open
created_at: 2026-08-13T00:00:00Z
updated_at: 2026-08-13T00:00:00Z
source: documentation/requirements/REQ-kibi-intent-aware-source-discovery.md
priority: must
owner: platform-team
tags: [search, intent, source, traceability]
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6f8bed2f8c48b59a26ffbef1506663730f2789149afe8aad06cc1d296d58682f
logic_claims: ["CLAIM-336994B3DE911136","CLAIM-B76303E2EEBD6A41"]
semantic_inventory: [{"claim_key":"CLAIM-336994B3DE911136","claim_text":"Given a natural-language functionality request, Kibi must rank matching requirements, scenarios, tests, facts, and implementation symbols using lexical, semantic, relationship, and source-location evidence","role":"normative","status":"modeled","span":{"start":0,"end":205},"payload_hash":"87fc02b0f8aa71d61af51cf2b04a82157dc69626d501a0589b68740aad54cbbc","reason":"This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete."},{"claim_key":"CLAIM-B76303E2EEBD6A41","claim_text":"The result must expose deterministic scores, evidence paths, source locations, and explicit zero-result or ambiguity states rather than presenting an unsupported match as proof","role":"normative","status":"modeled","span":{"start":207,"end":383},"payload_hash":"87fc02b0f8aa71d61af51cf2b04a82157dc69626d501a0589b68740aad54cbbc","reason":"This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete."}]
links:
  - type: constrains
    target: FACT-REQ-PROOF-INTENT-SUBJECT
  - type: requires_property
    target: FACT-REQ-PROOF-INTENT-RANKED-EVIDENCE
  - type: requires_property
    target: FACT-REQ-PROOF-INTENT-EXPLICIT-UNCERTAINTY
  - type: specified_by
    target: SCEN-kibi-intent-aware-source-discovery
  - type: verified_by
    target: TEST-kibi-intent-aware-source-discovery
---

Given a natural-language functionality request, Kibi must rank matching requirements, scenarios, tests, facts, and implementation symbols using lexical, semantic, relationship, and source-location evidence. The result must expose deterministic scores, evidence paths, source locations, and explicit zero-result or ambiguity states rather than presenting an unsupported match as proof.
