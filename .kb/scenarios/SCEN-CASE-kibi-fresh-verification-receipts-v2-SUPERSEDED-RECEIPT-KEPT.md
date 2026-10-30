---
title: Proof ingest drops a passing receipt that a newer pass superseded
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:58:32.601Z'
id: SCEN-CASE-kibi-fresh-verification-receipts-v2-SUPERSEDED-RECEIPT-KEPT
type: scenario
---
Given a test proved five times on one snapshot and binding with the outcomes pass, pass, fail, fail and pass, when each kibi prove run is ingested, then the history keeps only the newest receipt and the newest passing receipt, so a superseded pass or failure that survived compaction is caught.

This covers a kept receipt outside the compaction policy set, a value outside [newest_receipt, newest_passing_receipt, newest_receipt_per_scope_and_contract_hash]. packages/cli/tests/consumer/proof-receipt-compaction.test.ts "ingest keeps only the newest and deciding receipts of every kibi prove run" exercises it by asserting the exact history after each run.
