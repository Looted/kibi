---
title: A workspace with a .git entry Git cannot read is answered from the no-Git store
status: active
fact_kind: property_value
subject_key: kibi.branch_attachment.unreadable_repository
property_key: refusal_error_code
operator: eq
value_type: string
value_string: none
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:16:37.191Z'
id: FACT-NEG-kibi-no-git-unreadable-repository
type: fact
---
An operation in a workspace whose .git entry Git cannot read is not refused (refusal code none): it is answered from a kibi-internal/no-git store created beside the repository. The failure-side scenario of REQ-kibi-no-git-detection-never-inside-repository assumes this state and expects Kibi to reject it.
