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
fact_kind: property_value
subject_key: kibi.engine.read_limits
property_key: bounded_reads_running_past_limit
operator: eq
value_type: int
value_int: 0
origin:
  kind: agent
  recorded_at: '2026-10-04T02:18:52.217Z'
id: FACT-PRED-engine-read-limits-stop
type: fact
---
