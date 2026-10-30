---
status: active
title: An external kibi sync replaces the branch KB snapshot while an MCP session stays attached to the old one
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.engine.prolog_process
  - external_snapshot_replacement
  - refresh_while_attached
polarity: deny
canonical_key: logical_requirement_rule(kibi.engine.prolog_process,external_snapshot_replacement,refresh_while_attached)
origin:
  kind: agent
  recorded_at: '2026-10-29T21:59:37.003Z'
id: FACT-NEG-core-prolog-process-management-STALE-ATTACHED-SNAPSHOT
type: fact
---
