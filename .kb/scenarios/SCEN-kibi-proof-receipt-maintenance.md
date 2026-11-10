---
title: 'Prune keeps the newest receipt and migrate-legacy strips a proof-contract test'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-proof-receipt-maintenance
type: scenario
---
Given a test with two receipts, when the packed CLI runs kibi proof prune --keep 1 for it, then only the newer receipt remains; and given a test with both a proof_contract and a legacy verification_receipts block, kibi proof migrate-legacy removes the legacy block and keeps the proof contract.

This is the success side of receipt maintenance. documentation/tests/e2e/packed/proof-maintenance-ops.test.ts, in its prune and migrate-legacy cases, exercises it.
