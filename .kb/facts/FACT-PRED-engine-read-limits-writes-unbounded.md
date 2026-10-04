---
title: Writes, module loads and sync compilation are never bounded
status: active
tags:
  - lane:ontology
  - engine
  - limits
claim_key: CLAIM-E198F8E45755DEFA
claim_text: Writes, module loads, and sync compilation must never be bounded by the engine read limits
text_ref: .kb/requirements/REQ-core-engine-read-limits.md
fact_kind: predicate
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.engine.read_limits
  - write_module_load_or_sync_compilation
  - never_bounded
polarity: assert
canonical_key: logical_requirement_rule(kibi.engine.read_limits,write_module_load_or_sync_compilation,never_bounded)
predicate_namespace: kibi.requirements
origin:
  kind: agent
  recorded_at: '2026-10-04T02:19:01.558Z'
id: FACT-PRED-engine-read-limits-writes-unbounded
type: fact
---
