---
title: Semantic inventory is source bound predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_namespace: kibi.ingestion
predicate_name: source_bound_semantic_inventory
predicate_arity: 3
argument_names:
  - source_binding
  - hash_binding
  - span_binding
argument_types:
  - claim_identity_field
  - hash_algorithm
  - claim_identity_field
argument_descriptions:
  - Authored field the ledger binds to.
  - Hash that pins the source text.
  - Span encoding for each entry.
examples:
  - source_bound_semantic_inventory(source_field,sha256,utf8_span)
id: FACT-SCHEMA-SOURCE-BOUND-SEMANTIC-INVENTORY
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Predicate schema for source_bound_semantic_inventory/3.
