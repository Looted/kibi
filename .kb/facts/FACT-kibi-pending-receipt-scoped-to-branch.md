---
title: A pending-source receipt must record the branch it was written on, and kibi sync must skip a receipt from another branch whose file is absent instead of failing
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: pending_receipt_scoped_to_writing_branch
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-7936082F20766982
claim_text: A pending-source receipt must record the branch it was written on, and kibi sync must skip a receipt from another branch whose file is absent instead of failing
text_ref: REQ-kibi-pending-receipt-branch-scope
tags:
  - lane:strict
  - fact:property_value
  - branching
  - sync
origin:
  kind: agent
  recorded_at: '2026-11-15T09:00:00.000Z'
id: FACT-kibi-pending-receipt-scoped-to-branch
type: fact
---
A pending-source receipt must record the branch it was written on, and kibi sync must skip a receipt from another branch whose file is absent instead of failing. Grounds a clause of REQ-kibi-pending-receipt-branch-scope.