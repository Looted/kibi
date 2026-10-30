---
title: One repair batch would be auto-applicable or skip a mutation safeguard
status: active
fact_kind: property_value
subject_key: kibi.coverage.repair_plan
property_key: batches_auto_applicable_or_missing_mutation_safeguards
operator: eq
value_type: int
value_int: 1
origin:
  kind: agent
  recorded_at: '2026-10-30T14:59:37.819Z'
id: FACT-CASE-kibi-dependency-ordered-repair-plan-auto-applicable-batch
type: fact
---
The attempt the repair plan must refuse: a batch marked auto-applicable, or one that would write without querying, validating and upserting in sequence.