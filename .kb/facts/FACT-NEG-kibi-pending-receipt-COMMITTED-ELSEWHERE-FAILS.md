---
title: A file committed on another local branch makes this branch's sync fail as missing
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: pending_receipt_committed_on_other_branch_retired
operator: neq
value_type: bool
value_bool: true
tags:
  - negative-path
  - branching
  - sync
origin:
  kind: agent
  recorded_at: '2026-11-15T17:30:00.000Z'
id: FACT-NEG-kibi-pending-receipt-COMMITTED-ELSEWHERE-FAILS
type: fact
---
The failure side of retiring receipts for files committed elsewhere: a file written on one branch and committed on a branch made after it, with no sync there, would make sync on the first branch fail with a missing pending source until the branch KB is recovered.