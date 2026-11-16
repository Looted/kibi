---
title: The action overwrites commits pushed meanwhile
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_action
property_key: moved_branch_commits_overwritten
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:39.282Z'
id: FACT-NEG-kb-merge-action-branch-moved-VIOLATED
type: fact
---
An author pushes to the pull request while the action merges it, and the action force-pushes its merge, dropping the author's commit; or it gives up after the first refused push and the conflict stays.