---
title: A requirement with several unresolved gap phases could have two ready repair batches
status: active
fact_kind: property_value
subject_key: kibi.coverage.repair_plan
property_key: ready_batches_per_requirement
operator: eq
value_type: int
value_int: 2
origin:
  kind: agent
  recorded_at: '2026-10-30T14:59:21.260Z'
id: FACT-CASE-kibi-dependency-ordered-repair-plan-two-ready-batches
type: fact
---
The attempt the repair plan must contain: a requirement whose proof gaps span several phases, so more than one of its batches could be marked ready at once.