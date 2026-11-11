---
id: REQ-kibi-intent-aware-source-discovery
title: Kibi finds requirements and implementation evidence from natural-language intent
status: open
created_at: 2026-08-13T00:00:00Z
updated_at: 2026-08-13T00:00:00Z
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
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 8): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
semantic_text: Given a natural-language functionality request, Kibi must rank matching requirements, scenarios, tests, facts, and implementation symbols using lexical, semantic, relationship, and source-location evidence. The result must expose deterministic scores, evidence paths, source locations, and explicit zero-result or ambiguity states rather than presenting an unsupported match as proof.
type: req
firmness: default
required_evidence: tested
---

Given a natural-language functionality request, Kibi must rank matching requirements, scenarios, tests, facts, and implementation symbols using lexical, semantic, relationship, and source-location evidence. The result must expose deterministic scores, evidence paths, source locations, and explicit zero-result or ambiguity states rather than presenting an unsupported match as proof.

## Why
Search has to find requirements from unfamiliar wording about a feature, or from the source locations that changed, not only from exact terms. Low-confidence results abstain explicitly instead of posing as matches. Source: changeset "intent-aware-search", Aug 13.
