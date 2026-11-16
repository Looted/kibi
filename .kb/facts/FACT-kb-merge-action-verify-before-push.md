---
title: The Kibi KB merge action must push a merge only after kibi sync leaves every tracked file unchanged and the configured check passes on the merged tree
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_action
property_key: unverified_merges_pushed
operator: eq
value_type: int
value_int: 0
text_ref: REQ-kb-merge-action-verify-before-push
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:33.095Z'
id: FACT-kb-merge-action-verify-before-push
type: fact
claim_key: CLAIM-08C7614EDD0BD1B7
claim_text: The Kibi KB merge action must push a merge only after kibi sync leaves every tracked file unchanged and the configured check passes on the merged tree
---
Counts merges the action pushed although kibi sync changed a tracked file or the check failed on the merged tree; zero means every pushed merge passed both.