---
title: The Kibi KB merge workflow must merge pull requests with the published Kibi KB merge action
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_workflow
property_key: merges_outside_published_action
operator: eq
value_type: int
value_int: 0
text_ref: REQ-ci-kb-merge-uses-action
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:37.210Z'
id: FACT-ci-kb-merge-uses-action
type: fact
claim_key: CLAIM-75CACECFD17CE93C
claim_text: The Kibi KB merge workflow must merge pull requests with the published Kibi KB merge action
---
Counts steps of the Kibi KB merge workflow that merge or push pull request branches without the published actions/kb-merge action; zero means all merging goes through it.