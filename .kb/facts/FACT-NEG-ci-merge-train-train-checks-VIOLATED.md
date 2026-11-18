---
title: The merge train lands a train before its train checks passed
status: active
fact_kind: property_value
subject_key: kibi.ci.merge_train
property_key: trains_landed_without_passing_train_checks
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T14:37:32.502Z'
id: FACT-NEG-ci-merge-train-train-checks-VIOLATED
type: fact
---
A train whose slow train-only check is still running, or failed, is merged because the boarding checks passed on its head.