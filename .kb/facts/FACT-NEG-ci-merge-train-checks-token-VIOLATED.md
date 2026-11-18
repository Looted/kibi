---
title: The merge train reads check runs with a fine-grained token
status: active
fact_kind: property_value
subject_key: kibi.ci.merge_train
property_key: check_run_reads_without_checks_token
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-18T14:19:03.448Z'
id: FACT-NEG-ci-merge-train-checks-token-VIOLATED
type: fact
---
The train reads a pull request's check runs with its fine-grained github-token, gets HTTP 403, and no train step completes.