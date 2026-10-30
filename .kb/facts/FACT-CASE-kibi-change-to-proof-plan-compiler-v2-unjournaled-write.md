---
title: One plan write would happen before the journal records it
status: active
fact_kind: property_value
subject_key: kibi.proof.change_plan
property_key: writes_without_prior_journal_entry
operator: eq
value_type: int
value_int: 1
origin:
  kind: agent
  recorded_at: '2026-10-30T15:00:41.073Z'
id: FACT-CASE-kibi-change-to-proof-plan-compiler-v2-unjournaled-write
type: fact
---
The attempt the plan application must contain: a file written by the plan that the journal did not record first, so a failure could not restore it.