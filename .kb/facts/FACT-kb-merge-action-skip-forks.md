---
title: The Kibi KB merge action must skip pull requests whose branch is in a fork
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_action
property_key: fork_pull_requests_merged
operator: eq
value_type: int
value_int: 0
text_ref: REQ-kb-merge-action-skip-forks
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:34.746Z'
id: FACT-kb-merge-action-skip-forks
type: fact
claim_key: CLAIM-C7EEE3C5EB55C0A9
claim_text: The Kibi KB merge action must skip pull requests whose branch is in a fork
---
Counts pull requests from forks the action tried to merge; zero means they are skipped.