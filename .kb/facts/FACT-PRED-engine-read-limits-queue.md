---
title: A stopped read frees the engine queue
status: active
tags:
  - lane:ontology
  - engine
  - limits
  - concurrency
claim_key: CLAIM-41ACADA5ED951161
claim_text: A stopped read must free the engine queue for the next client
text_ref: .kb/requirements/REQ-core-engine-read-limits.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.engine.read_limits
  - stopped_read
  - engine_queue_freed_for_next_client
polarity: assert
canonical_key: logical_requirement_rule(kibi.engine.read_limits,stopped_read,engine_queue_freed_for_next_client)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:18:56.854Z'
id: FACT-PRED-engine-read-limits-queue
type: fact
---
