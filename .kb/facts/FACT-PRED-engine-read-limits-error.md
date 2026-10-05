---
title: A limit hit fails with QUERY_LIMIT_EXCEEDED and no partial answer
status: active
tags:
  - lane:ontology
  - engine
  - limits
  - errors
claim_key: CLAIM-F281E365BEDA2D05
claim_text: A read that hits its limit must fail with QUERY_LIMIT_EXCEEDED and the exceeded limit kind and value on the CLI and MCP envelopes instead of returning a partial answer
text_ref: .kb/requirements/REQ-core-engine-read-limits.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.engine.read_limits
  - read_hits_limit
  - query_limit_exceeded_without_partial_answer
polarity: assert
canonical_key: logical_requirement_rule(kibi.engine.read_limits,read_hits_limit,query_limit_exceeded_without_partial_answer)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:18:54.497Z'
id: FACT-PRED-engine-read-limits-error
type: fact
---
