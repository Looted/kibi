---
title: The merge train lands no train whose train checks have not all passed on its assembled head
status: active
fact_kind: property_value
subject_key: kibi.ci.merge_train
property_key: trains_landed_without_passing_train_checks
operator: eq
value_type: int
value_int: 0
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-17T14:37:18.802Z'
id: FACT-ci-merge-train-train-checks
type: fact
claim_key: CLAIM-B1B9A8C51EA6DD90
claim_text: The merge train merges a train only when its train checks also passed on the exact head it assembled, and admits a pull request without them
---
Counts trains the merge train merges although a configured train check has not passed on the head it assembled, plus pull requests it refuses to board only because a train check never ran on them; zero means it does neither.