---
title: Concurrent upserts need a fresh snapshot predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_namespace: kibi.persistence
predicate_name: upsert_concurrency_requires_fresh_snapshot
predicate_arity: 2
argument_names:
  - concurrent_behavior
  - stale_behavior
argument_types:
  - concurrency_outcome
  - concurrency_outcome
argument_descriptions:
  - Outcome for concurrent current runtimes.
  - Outcome for a stale attached snapshot.
examples:
  - upsert_concurrency_requires_fresh_snapshot(current_runtimes_serialize,stale_snapshot_fails_before_mutation)
id: FACT-SCHEMA-UPSERT-CONCURRENCY-REQUIRES-FRESH-SNAPSHOT
type: fact
---
Predicate schema for upsert_concurrency_requires_fresh_snapshot/2.
