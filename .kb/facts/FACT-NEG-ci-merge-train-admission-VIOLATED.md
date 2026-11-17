---
title: The merge train admits a pull request that misses a boarding condition
status: active
fact_kind: property_value
subject_key: kibi.ci.merge_train
property_key: pull_requests_admitted_without_label_ready_same_repo_passing_checks
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T11:39:53.960Z'
id: FACT-NEG-ci-merge-train-admission-VIOLATED
type: fact
---
A draft, fork, unlabelled or not-yet-green pull request is merged into a train.