---
title: A bounded read stops at its time or inference limit
status: active
tags:
  - lane:ontology
  - engine
  - limits
claim_key: CLAIM-FDA403C77E8B1F38
claim_text: Each bounded read-only engine request must stop at its configured time or inference limit
text_ref: .kb/requirements/REQ-core-engine-read-limits.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.engine.read_limits
  - bounded_read_exceeds_time_or_inference_limit
  - read_stopped
polarity: assert
canonical_key: logical_requirement_rule(kibi.engine.read_limits,bounded_read_exceeds_time_or_inference_limit,read_stopped)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:18:52.217Z'
id: FACT-PRED-engine-read-limits-stop
type: fact
---
