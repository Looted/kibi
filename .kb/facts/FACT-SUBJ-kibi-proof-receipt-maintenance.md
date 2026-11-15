---
title: 'Proof receipt maintenance'
status: active
fact_kind: subject
subject_key: kibi.proof.receipt_maintenance
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: FACT-SUBJ-kibi-proof-receipt-maintenance
type: fact
---

Housekeeping of stored proof receipts: kibi proof prune keeps only each test's newest receipts within the keep window, and migrate-legacy drops legacy receipts only for tests that have a proof contract. It does not create or validate receipts.
