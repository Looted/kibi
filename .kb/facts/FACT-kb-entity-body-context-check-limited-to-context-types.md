---
title: Kibi must apply the body context check only to requirements, scenarios, tests, ADRs, observation facts and meta facts
status: active
text_ref: REQ-kb-entity-body-context
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-kb-entity-body-context
fact_kind: property_value
subject_key: kibi.entity_body_context
property_key: body_context_checked_entity_types
operator: subset_of
value_type: set
value_set:
  - adr
  - meta_fact
  - observation_fact
  - req
  - scenario
  - test
claim_key: CLAIM-885778C6E96DB6AB
claim_text: 'Kibi must apply the body context check only to requirements, scenarios, tests, ADRs, observation facts and meta facts'
origin:
  kind: agent
  recorded_at: '2026-10-06T19:39:11.363Z'
id: FACT-kb-entity-body-context-check-limited-to-context-types
type: fact
---
