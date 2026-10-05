---
title: Failed upsert stages publish nothing predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_namespace: kibi.persistence
predicate_name: upsert_failure_is_not_durable
predicate_arity: 3
argument_names:
  - failed_stage
  - entity_state
  - relationship_state
argument_types:
  - commit_stage
  - kb_state
  - kb_state
argument_descriptions:
  - Stage whose failure or timeout aborts the commit.
  - Entity state that must not become durable.
  - Relationship state that must not become durable.
examples:
  - upsert_failure_is_not_durable(pre_save_stage,entity,relationships)
id: FACT-SCHEMA-UPSERT-FAILURE-IS-NOT-DURABLE
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Predicate schema for upsert_failure_is_not_durable/3.
