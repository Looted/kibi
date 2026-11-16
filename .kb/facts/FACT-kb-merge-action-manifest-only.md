---
title: The Kibi KB merge action must merge the base branch into a pull request only when every conflicting file is a Kibi manifest (.kb/symbols.yaml or a .kb/relationships shard)
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_action
property_key: non_manifest_conflicts_merged
operator: eq
value_type: int
value_int: 0
text_ref: REQ-kb-merge-action-manifest-only
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:17.302Z'
id: FACT-kb-merge-action-manifest-only
type: fact
claim_key: CLAIM-21983BB3394932A4
claim_text: The Kibi KB merge action must merge the base branch into a pull request only when every conflicting file is a Kibi manifest (.kb/symbols.yaml or a .kb/relationships shard)
---
Counts pull requests the action pushed a merge to although a file outside the Kibi manifests conflicted or the merge driver left a conflict; zero means those are always left unchanged.