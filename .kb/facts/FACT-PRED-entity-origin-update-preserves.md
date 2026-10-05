---
title: Updates without origin keep the stored origin
status: active
tags:
  - lane:ontology
  - origin
  - upsert
claim_key: CLAIM-396B38A84EC59888
claim_text: An update without an origin must never change the stored origin
text_ref: .kb/requirements/REQ-kibi-entity-origin.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.entity.origin
  - update_without_origin
  - stored_origin_unchanged
polarity: assert
canonical_key: logical_requirement_rule(kibi.entity.origin,update_without_origin,stored_origin_unchanged)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:21:28.481Z'
id: FACT-PRED-entity-origin-update-preserves
type: fact
---
