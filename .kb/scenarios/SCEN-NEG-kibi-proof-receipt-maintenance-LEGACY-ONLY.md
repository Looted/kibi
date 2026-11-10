---
title: 'migrate-legacy aimed at a test without a proof contract changes nothing'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-proof-receipt-maintenance-LEGACY-ONLY
type: scenario
---
Given a test with a legacy verification_receipts block and no proof_contract, when kibi proof migrate-legacy targets it, then it reports that no test carries a legacy block alongside a proof_contract and the legacy block stays.

This is the failure side of legacy migration. documentation/tests/e2e/packed/proof-maintenance-ops.test.ts, in its migrate-legacy case, exercises it.
