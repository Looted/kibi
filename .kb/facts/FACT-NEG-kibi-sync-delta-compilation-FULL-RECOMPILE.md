---
title: Normal sync recompiles unchanged inputs
status: active
tags:
  - negative-path
fact_kind: predicate
predicate_namespace: kibi.requirements
predicate_name: logical_requirement_rule
predicate_args:
  - kibi.engine.journal
  - changed_inputs_only
  - rebuild_replaces_generation
polarity: deny
canonical_key: logical_requirement_rule(kibi.engine.journal,changed_inputs_only,rebuild_replaces_generation)
origin:
  kind: agent
  recorded_at: '2026-11-10T12:00:00.000Z'
id: FACT-NEG-kibi-sync-delta-compilation-FULL-RECOMPILE
type: fact
---
A normal sync after a one-entity edit recompiles entities whose sources did not change.
