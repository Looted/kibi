---
title: Outside Git, a working operation is recorded as a rejection
status: active
fact_kind: property_value
subject_key: kibi.telemetry.no_git_operation
property_key: recorded_status
operator: eq
value_type: string
value_string: rejected
origin:
  kind: agent
  ref: 'Maintainer, 2026-11-25: "So I think we should print some kind of warning, an advisory to use Git. but we shouldn''t completely block Kibi usage."'
  recorded_at: '2026-11-25T09:21:55.275Z'
id: FACT-NEG-kibi-no-git-telemetry
type: fact
---
Usage telemetry records an operation that worked in a workspace outside any Git repository as a rejection, so the adoption problem looks unsolved. The failure-side scenario of REQ-kibi-no-git-telemetry-outcome assumes this state and expects Kibi to reject it.
