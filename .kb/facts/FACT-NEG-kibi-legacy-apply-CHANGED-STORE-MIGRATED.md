---
title: A legacy store that changed after its migration preview is migrated anyway
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: changed_legacy_store_migration_refused
operator: neq
value_type: bool
value_bool: true
tags:
  - negative-path
  - branching
  - migration
origin:
  kind: agent
  recorded_at: '2026-11-15T08:00:00.000Z'
id: FACT-NEG-kibi-legacy-apply-CHANGED-STORE-MIGRATED
type: fact
---
The failure side of the preview binding: a store that changed after its preview would still be moved under the earlier approval.