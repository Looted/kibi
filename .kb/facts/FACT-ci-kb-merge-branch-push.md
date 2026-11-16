---
title: When a branch other than develop is pushed, the Kibi KB merge workflow must check only that branch's pull request for Kibi manifest conflicts
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_workflow
property_key: other_branch_pushes_checking_other_pull_requests
operator: eq
value_type: int
value_int: 0
text_ref: REQ-ci-kb-merge-branch-push
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:36.361Z'
id: FACT-ci-kb-merge-branch-push
type: fact
claim_key: CLAIM-6D55BD2C000C6ED2
claim_text: When a branch other than develop is pushed, the Kibi KB merge workflow must check only that branch's pull request for Kibi manifest conflicts
---
Counts pushes to branches other than develop after which the workflow checked a pull request other than the pushed branch's own; zero means each such push checks only its own pull request.