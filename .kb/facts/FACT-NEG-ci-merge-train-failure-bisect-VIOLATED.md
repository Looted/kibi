---
title: A pull request leaves a train for failed checks without failing alone
status: active
fact_kind: property_value
subject_key: kibi.ci.merge_train
property_key: pull_requests_ejected_without_failing_alone
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T11:40:03.402Z'
id: FACT-NEG-ci-merge-train-failure-bisect-VIOLATED
type: fact
---
A failed train drops its newest or an arbitrary pull request, or splits without first re-running its failed jobs, so a flake or another pull request's fault removes an innocent one.