---
title: A present untracked file or a receipt that names no branch is skipped on another branch
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: present_or_unscoped_pending_receipt_checked_on_every_branch
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
id: FACT-NEG-kibi-pending-receipt-PRESENT-FILE-SKIPPED
type: fact
---
The failure side of the carry-over rule: an untracked file stays in the working tree across a checkout, and a receipt written by older Kibi names no branch; skipping either would make sync drop knowledge whose file is right there.