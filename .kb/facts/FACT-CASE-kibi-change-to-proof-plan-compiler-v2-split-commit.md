---
title: A compile plan application would land in two separate commits
status: active
fact_kind: property_value
subject_key: kibi.proof.change_plan
property_key: store_transactions_per_plan_application
operator: eq
value_type: int
value_int: 2
origin:
  kind: agent
  recorded_at: '2026-10-30T15:00:26.714Z'
id: FACT-CASE-kibi-change-to-proof-plan-compiler-v2-split-commit
type: fact
---
The attempt the plan application must refuse: part of a plan landing while the rest fails, so the plan takes more than one commit.