---
title: Kibi must refuse an operation in a workspace outside any Git repository, when KIBI_BRANCH is not set, with the error code NOT_A_GIT_REPOSITORY and a message that tells the caller to run git init
status: active
fact_kind: property_value
subject_key: kibi.branch_attachment.outside_git
property_key: refusal_error_code
operator: eq
value_type: string
value_string: NOT_A_GIT_REPOSITORY
claim_text: Kibi must refuse an operation in a workspace outside any Git repository, when KIBI_BRANCH is not set, with the error code NOT_A_GIT_REPOSITORY and a message that tells the caller to run git init
text_ref: REQ-kibi-refuse-operation-workspace-outside-any
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  recorded_at: '2026-11-25T07:06:07.878Z'
claim_key: CLAIM-1C8974D8B94AEB3F
id: FACT-kibi-outside-git-refusal-code
type: fact
---
