---
title: kibi sync must retire a pending-source receipt whose file is absent from the checkout but committed on another local branch, instead of failing
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: pending_receipt_committed_on_other_branch_retired
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-5A641BD70C6A5BE4
claim_text: kibi sync must retire a pending-source receipt whose file is absent from the checkout but committed on another local branch, instead of failing
text_ref: REQ-kibi-pending-receipt-committed-elsewhere
tags:
  - lane:strict
  - fact:property_value
  - branching
  - sync
origin:
  kind: agent
  recorded_at: '2026-11-15T17:30:00.000Z'
id: FACT-kibi-pending-receipt-committed-elsewhere-retired
type: fact
---
kibi sync must retire a pending-source receipt whose file is absent from the checkout but committed on another local branch, instead of failing. Grounds a clause of REQ-kibi-pending-receipt-committed-elsewhere.