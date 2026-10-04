---
id: FACT-INGESTION-SYNC-MIGRATION
title: Sync baselines legacy prose and enforces semantic changes
type: fact
status: active
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: .kb/facts/FACT-INGESTION-SYNC-MIGRATION.md
fact_kind: predicate
predicate_name: semantic_inventory_sync_migration
predicate_args:
  - legacy_baseline
  - new_requirement
  - semantic_change
canonical_key: semantic_inventory_sync_migration(legacy_baseline,new_requirement,semantic_change)
polarity: assert
claim_key: CLAIM-944B73FD47FD3F8A
claim_text: Markdown sync must baseline existing legacy requirements once, then enforce complete ledgers for new or semantically changed requirements
claim_span_start: 433
claim_span_end: 570
predicate_namespace: kibi.ingestion
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Ground predicate for compatibility-safe sync enforcement.
