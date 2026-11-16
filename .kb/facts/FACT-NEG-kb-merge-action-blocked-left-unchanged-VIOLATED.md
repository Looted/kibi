---
title: The action changes a pull request it should leave for a person
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_action
property_key: blocked_pull_requests_changed
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T18:12:50.200Z'
id: FACT-NEG-kb-merge-action-blocked-left-unchanged-VIOLATED
type: fact
---
A pull request conflicts in a source file, or both sides changed one record's status, and the action pushes a merge commit to it anyway, with conflict markers or one side's choice.