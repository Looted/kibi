---
title: 'Entity body context: an upsert that changes semantic_text rewrites the body statement'
status: active
fact_kind: property_value
subject_key: kibi.entity_body_context
property_key: statement_follows_semantic_text
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-63DFD25E686C97ED
claim_text: Kibi kb_upsert must replace the statement in a requirement's document body with the new semantic_text when a write changes the requirement's semantic_text without a document body, and must keep the body's context sections
text_ref: REQ-kb-upsert-statement-follows-semantic-text
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-kb-upsert-statement-follows-semantic-text
origin:
  kind: agent
  recorded_at: '2026-10-14T14:43:04.984Z'
id: FACT-kb-upsert-statement-follows-semantic-text
type: fact
---
