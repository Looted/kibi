---
title: A receipt for a file no branch holds is retired silently
status: active
fact_kind: property_value
subject_key: kibi.kb.branch
property_key: pending_receipt_uncommitted_missing_file_fails_sync
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
id: FACT-NEG-kibi-pending-receipt-LOST-FILE-RETIRED
type: fact
---
The failure side of the missing-file check: retiring a receipt whose file no local branch has committed would drop knowledge whose authored file is gone without telling anyone.