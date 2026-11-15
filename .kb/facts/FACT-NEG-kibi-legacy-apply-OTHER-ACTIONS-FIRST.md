---
title: kb_apply_plan runs a plan's other actions before its approved legacy migration
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: legacy_migration_runs_before_other_actions
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
id: FACT-NEG-kibi-legacy-apply-OTHER-ACTIONS-FIRST
type: fact
---
The failure side of the migration order: actions that read the branch store would run against the old literal-path store before it is migrated.