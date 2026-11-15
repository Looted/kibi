---
title: A receipt written on another branch makes this branch's sync fail
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: pending_receipt_scoped_to_writing_branch
operator: neq
value_type: bool
value_bool: true
tags:
  - negative-path
  - branching
  - sync
origin:
  kind: agent
  recorded_at: '2026-11-15T09:00:00.000Z'
id: FACT-NEG-kibi-pending-receipt-OTHER-BRANCH-FAILS-SYNC
type: fact
---
The failure side of branch-scoped receipts: a receipt for a file committed on one branch would make sync on a branch without that file fail with a missing pending source until the branch KB is recovered.