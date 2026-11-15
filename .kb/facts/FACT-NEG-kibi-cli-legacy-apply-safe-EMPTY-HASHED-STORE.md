---
title: The CLI apply creates an empty hashed store beside the legacy one and fails
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: cli_apply_safe_migrates_previewed_legacy_store
operator: neq
value_type: bool
value_bool: true
tags:
  - negative-path
  - branching
  - migration
origin:
  kind: agent
  recorded_at: '2026-11-15T17:00:00.000Z'
id: FACT-NEG-kibi-cli-legacy-apply-safe-EMPTY-HASHED-STORE
type: fact
---
The failure side of the CLI legacy apply: an engine started before the migration would serve an empty hashed store, the plan's snapshot check would fail with "KB snapshot changed since planning", and the empty store would then keep the legacy migration from being applied at all.