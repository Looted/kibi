---
title: One downstream repair batch would carry no named dependency
status: active
fact_kind: property_value
subject_key: kibi.coverage.repair_plan
property_key: downstream_batches_without_named_dependencies
operator: eq
value_type: int
value_int: 1
origin:
  kind: agent
  recorded_at: '2026-10-30T14:59:30.571Z'
id: FACT-CASE-kibi-dependency-ordered-repair-plan-unnamed-dependency
type: fact
---
The attempt the repair plan must catch: a blocked downstream batch emitted without the batches it waits for.