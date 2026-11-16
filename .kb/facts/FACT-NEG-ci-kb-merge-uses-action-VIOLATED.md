---
title: Kibi merges with its own private script
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_workflow
property_key: merges_outside_published_action
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:42.216Z'
id: FACT-NEG-ci-kb-merge-uses-action-VIOLATED
type: fact
---
The workflow merges and pushes with its own shell steps, so the action consumers copy is never run in Kibi's repository and breaks unnoticed.