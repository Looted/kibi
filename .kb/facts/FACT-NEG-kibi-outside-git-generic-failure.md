---
title: An operation outside Git answers as if it were an unexplained, retryable failure
status: active
fact_kind: property_value
subject_key: kibi.branch_attachment.outside_git
property_key: refusal_error_code
operator: eq
value_type: string
value_string: OPERATION_FAILED
origin:
  kind: agent
  recorded_at: '2026-11-25T07:11:49.940Z'
id: FACT-NEG-kibi-outside-git-generic-failure
type: fact
---
An operation in a workspace outside any Git repository answers as if it were an unexplained failure: OPERATION_FAILED, or no error category at all, with a diagnostic that does not say to run git init. The failure-side scenario of REQ-kibi-refuse-operation-workspace-outside-any assumes this state and expects Kibi to refuse it with NOT_A_GIT_REPOSITORY instead.
