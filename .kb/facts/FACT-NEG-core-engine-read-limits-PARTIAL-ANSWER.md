---
title: A bounded read hits its inference limit and would return a partial answer instead of failing
status: active
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.engine.read_limits
  - read_hits_limit
  - query_limit_exceeded_without_partial_answer
predicate_namespace: kibi.requirements
polarity: deny
canonical_key: logical_requirement_rule(kibi.engine.read_limits,read_hits_limit,query_limit_exceeded_without_partial_answer)
origin:
  kind: agent
  recorded_at: '2026-10-29T21:09:09.598Z'
id: FACT-NEG-core-engine-read-limits-PARTIAL-ANSWER
type: fact
---
