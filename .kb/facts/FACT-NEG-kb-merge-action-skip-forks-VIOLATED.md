---
title: The action tries to merge a fork pull request
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_action
property_key: fork_pull_requests_merged
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:40.067Z'
id: FACT-NEG-kb-merge-action-skip-forks-VIOLATED
type: fact
---
The action merges a pull request whose branch lives in a fork and fails when its push is denied, failing the run for every other pull request's report.