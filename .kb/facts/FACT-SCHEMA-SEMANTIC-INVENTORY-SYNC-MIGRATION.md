---
title: Sync migrates semantic inventories predicate schema
status: active
tags:
  - lane:ontology
  - predicate-schema
fact_kind: predicate_schema
predicate_namespace: kibi.ingestion
predicate_name: semantic_inventory_sync_migration
predicate_arity: 3
argument_names:
  - baseline_scope
  - enforced_scope
  - reenforced_on
argument_types:
  - requirement_population
  - requirement_population
  - requirement_change
argument_descriptions:
  - Requirements baselined once.
  - Requirements that must carry complete ledgers.
  - Change that re-enforces a complete ledger.
examples:
  - semantic_inventory_sync_migration(legacy_baseline,new_requirement,semantic_change)
id: FACT-SCHEMA-SEMANTIC-INVENTORY-SYNC-MIGRATION
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Predicate schema for semantic_inventory_sync_migration/3.
