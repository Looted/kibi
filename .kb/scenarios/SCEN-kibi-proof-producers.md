---
title: 'A first-attempt Playwright pass proves through kibi prove'
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-kibi-proof-producers
type: scenario
---
Given a playwright integration whose command drives the installed kibi-cli Playwright reporter for one case that passes on its first attempt, and a test whose binding names that case's native id, when the packed CLI runs kibi prove for the test, then it exits 0 and appends one receipt.

This is the success side of proof producers. documentation/tests/e2e/packed/proof-maintenance-ops.test.ts, in its producers case, exercises it.
