---
title: The Kibi KB merge action must not run the repository's Git hooks when it commits or pushes a merge
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_action
property_key: repository_hooks_run_on_merge
operator: eq
value_type: int
value_int: 0
text_ref: REQ-kb-merge-action-no-hooks
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:35.556Z'
id: FACT-kb-merge-action-no-hooks
type: fact
claim_key: CLAIM-00139F706F1C3981
claim_text: The Kibi KB merge action must not run the repository's Git hooks when it commits or pushes a merge
---
Counts Git hooks the action ran while it committed or pushed a merge; zero means none run.