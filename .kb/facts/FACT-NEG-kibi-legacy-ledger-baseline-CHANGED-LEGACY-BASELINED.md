---
title: A legacy requirement whose prose changed after the baseline syncs without a ledger
status: active
tags:
  - negative-path
fact_kind: predicate
predicate_name: semantic_inventory_sync_migration
predicate_namespace: kibi.ingestion
predicate_args:
  - legacy_baseline
  - new_requirement
  - semantic_change
polarity: deny
canonical_key: semantic_inventory_sync_migration(legacy_baseline,new_requirement,semantic_change)
origin:
  kind: agent
  recorded_at: '2026-11-10T09:30:00.000Z'
id: FACT-NEG-kibi-legacy-ledger-baseline-CHANGED-LEGACY-BASELINED
type: fact
---
After the first sync has baselined legacy requirements, a legacy requirement whose semantic prose changes is still treated as baselined and syncs without a complete proposition ledger.
