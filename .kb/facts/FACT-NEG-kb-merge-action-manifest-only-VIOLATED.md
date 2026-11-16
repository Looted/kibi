---
title: The action pushes a merge that resolved a code conflict
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_action
property_key: non_manifest_conflicts_merged
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:37.942Z'
id: FACT-NEG-kb-merge-action-manifest-only-VIOLATED
type: fact
---
A pull request conflicts in a source file as well as in .kb/symbols.yaml, and the action merges it anyway, settling a conflict a person had to decide.