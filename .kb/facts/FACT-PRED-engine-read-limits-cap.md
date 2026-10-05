---
title: The read time limit stays below the hard query timeout
status: active
tags:
  - lane:ontology
  - engine
  - limits
claim_key: CLAIM-C3ED3CB1F036DD86
claim_text: The read time limit must be capped below the hard engine query timeout
text_ref: .kb/requirements/REQ-core-engine-read-limits.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.engine.read_limits
  - configured_read_time_limit
  - capped_below_hard_query_timeout
polarity: assert
canonical_key: logical_requirement_rule(kibi.engine.read_limits,configured_read_time_limit,capped_below_hard_query_timeout)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:18:59.265Z'
id: FACT-PRED-engine-read-limits-cap
type: fact
---
