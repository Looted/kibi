---
title: A receipt whose absent file no local branch has committed must still fail the sync as missing
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: pending_receipt_uncommitted_missing_file_fails_sync
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-A78AACC4AD06D93F
claim_text: A receipt whose absent file no local branch has committed must still fail the sync as missing
text_ref: REQ-kibi-pending-receipt-committed-elsewhere
tags:
  - lane:strict
  - fact:property_value
  - branching
  - sync
origin:
  kind: agent
  recorded_at: '2026-11-15T17:30:00.000Z'
id: FACT-kibi-pending-receipt-uncommitted-missing-fails
type: fact
---
A receipt whose absent file no local branch has committed must still fail the sync as missing. Grounds a clause of REQ-kibi-pending-receipt-committed-elsewhere.