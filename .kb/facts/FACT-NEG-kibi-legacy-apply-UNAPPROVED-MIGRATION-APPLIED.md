---
title: kb_apply_plan applies a plan that leaves an attached legacy store's migration unapproved
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: legacy_apply_requires_approved_migration
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
id: FACT-NEG-kibi-legacy-apply-UNAPPROVED-MIGRATION-APPLIED
type: fact
---
The failure side of the legacy apply gate: with a legacy store attached, a plan that leaves its migration unapproved would still apply its other actions against the old store.