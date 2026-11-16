---
title: a pull request with any other conflict, or with a conflict the merge driver cannot resolve, must be left unchanged
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_action
property_key: blocked_pull_requests_changed
operator: eq
value_type: int
value_int: 0
text_ref: REQ-kb-merge-action-manifest-only
claim_key: CLAIM-966D61299F5C1DD9
claim_text: a pull request with any other conflict, or with a conflict the merge driver cannot resolve, must be left unchanged
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T18:12:49.434Z'
id: FACT-kb-merge-action-blocked-left-unchanged
type: fact
---
Counts pull requests with a conflict outside the Kibi manifests, or with a conflict the merge driver left, whose branch the action changed; zero means they keep their tip.