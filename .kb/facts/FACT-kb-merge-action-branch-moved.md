---
title: When a pull request branch moves while the Kibi KB merge action is merging it, the action must not overwrite the new commits and must merge again on the new tip, up to the configured number of attempts
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_action
property_key: moved_branch_commits_overwritten
operator: eq
value_type: int
value_int: 0
text_ref: REQ-kb-merge-action-branch-moved
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:33.936Z'
id: FACT-kb-merge-action-branch-moved
type: fact
claim_key: CLAIM-78EE54E333D35430
claim_text: When a pull request branch moves while the Kibi KB merge action is merging it, the action must not overwrite the new commits and must merge again on the new tip, up to the configured number of attempts
---
Counts commits pushed to a pull request branch while the action merged it that the action's push removed from the branch; zero means the push is refused and the merge redone on the new tip.