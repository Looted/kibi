---
title: One returned requirement with proof gaps would get no read-only repair plan
status: active
fact_kind: property_value
subject_key: kibi.coverage.repair_plan
property_key: returned_gap_requirements_without_read_only_repair_plan
operator: eq
value_type: int
value_int: 1
origin:
  kind: agent
  recorded_at: '2026-10-30T14:59:46.678Z'
id: FACT-CASE-kibi-dependency-ordered-repair-plan-requirement-without-plan
type: fact
---
The attempt the coverage report must refuse: a requirement with gaps returned on the page but left out of the plan, or planned by a plan that writes.