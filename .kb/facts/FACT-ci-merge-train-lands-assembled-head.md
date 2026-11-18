---
title: No train merges without its checks passing on the head it assembled
status: active
fact_kind: property_value
subject_key: kibi.ci.merge_train
property_key: trains_merged_without_passing_checks_on_assembled_head
operator: eq
value_type: int
value_int: 0
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-17T11:40:33.046Z'
id: FACT-ci-merge-train-lands-assembled-head
type: fact
claim_key: CLAIM-4C4A9D5A43F71FCA
claim_text: The merge train merges a train into develop only when the train pull request's required checks passed on the exact head it assembled
---
Counts trains merged into develop although the train pull request's required checks had not all passed on the exact head the train assembled, on the develop tip it was assembled on; zero means none.