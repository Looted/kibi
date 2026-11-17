---
title: A gating workflow lacks a sound aggregate check
status: active
fact_kind: property_value
subject_key: kibi.ci.required_checks
property_key: gating_workflows_without_one_aggregate_check
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T10:51:10.351Z'
id: FACT-NEG-ci-required-check-aggregate-VIOLATED
type: fact
---
One gating workflow has no aggregate job, or one that misses a job, is skipped when a job fails, or counts a skipped job as success.