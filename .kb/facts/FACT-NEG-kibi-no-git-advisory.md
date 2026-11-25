---
title: Outside Git, kibi init, kibi doctor and status fail
status: active
fact_kind: property_value
subject_key: kibi.no_git_advisory
property_key: operation_outcome
operator: eq
value_type: string
value_string: failure
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:19:25.809Z'
id: FACT-NEG-kibi-no-git-advisory
type: fact
---
In a workspace outside any Git repository, kibi init exits 1, kibi doctor fails its Git check and the status operation fails, so the person is told to stop instead of what is missing. The failure-side scenario of REQ-kibi-no-git-advisory assumes this state and expects Kibi to reject it.
