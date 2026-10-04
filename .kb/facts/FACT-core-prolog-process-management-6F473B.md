---
title: 'A same-session status query must observe writes made after a previous '
status: active
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.engine.prolog_process
  - post_write_state
  - observed
predicate_namespace: kibi.requirements
canonical_key: logical_requirement_rule(kibi.engine.prolog_process,post_write_state,observed)
polarity: assert
claim_key: CLAIM-5A7BDFF1926F473B
claim_text: A same-session status query must observe writes made after a previous call
tags:
  - lane:ontology
  - requirements
id: FACT-core-prolog-process-management-6F473B
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
