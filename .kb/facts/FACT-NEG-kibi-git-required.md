---
title: Outside Git, a feature that reads Git fails as an unexplained, retryable failure
status: active
fact_kind: property_value
subject_key: kibi.git_required_refusal
property_key: refusal_error_code
operator: eq
value_type: string
value_string: OPERATION_FAILED
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:17:41.410Z'
id: FACT-NEG-kibi-git-required
type: fact
---
A Kibi feature that reads Git, run outside any Git repository, fails as OPERATION_FAILED (or with no category) on whatever Git command it ran first, without naming the Git-free alternative. The failure-side scenario of REQ-kibi-git-required-refusal assumes this state and expects Kibi to reject it.
