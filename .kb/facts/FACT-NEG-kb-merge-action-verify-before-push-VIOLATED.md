---
title: The action pushes a merge that fails the check
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_action
property_key: unverified_merges_pushed
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:38.611Z'
id: FACT-NEG-kb-merge-action-verify-before-push-VIOLATED
type: fact
---
The merged tree fails the configured check, or kibi sync rewrites .kb/symbols.yaml after the merge, and the action pushes the merge anyway, so the pull request now carries a broken KB.