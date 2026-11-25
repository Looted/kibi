---
title: Kibi must refuse an operation in a workspace with a .git entry that Git cannot read with the error code GIT_REPOSITORY_UNREADABLE
status: active
fact_kind: property_value
subject_key: kibi.branch_attachment.unreadable_repository
property_key: refusal_error_code
operator: eq
value_type: string
value_string: GIT_REPOSITORY_UNREADABLE
claim_key: CLAIM-75928EACD7DE49BD
claim_text: Kibi must refuse an operation in a workspace with a .git entry that Git cannot read with the error code GIT_REPOSITORY_UNREADABLE
text_ref: REQ-kibi-no-git-detection-never-inside-repository
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:16:34.648Z'
id: FACT-kibi-no-git-unreadable-repository-refusal-error-code
type: fact
---
