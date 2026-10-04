---
title: New entities written without origin are recorded as agent-authored
status: active
tags:
  - lane:ontology
  - origin
  - upsert
claim_key: CLAIM-F9D3A08022C90A69
claim_text: kb_upsert and kb_apply_plan must record origin kind agent with the write time on a new entity written without an origin
text_ref: .kb/requirements/REQ-kibi-entity-origin.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.entity.origin
  - new_entity_written_without_origin
  - agent_origin_with_write_time
polarity: assert
canonical_key: logical_requirement_rule(kibi.entity.origin,new_entity_written_without_origin,agent_origin_with_write_time)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:21:25.979Z'
id: FACT-PRED-entity-origin-agent-default
type: fact
---
