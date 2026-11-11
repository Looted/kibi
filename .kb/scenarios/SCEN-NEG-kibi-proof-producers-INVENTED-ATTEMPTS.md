---
title: 'Plain JUnit and TAP passes are refused for missing attempt history'
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T13:00:00.000Z'
id: SCEN-NEG-kibi-proof-producers-INVENTED-ATTEMPTS
type: scenario
---
Given a JUnit report and a TAP report that each record one plain pass, when kibi prove runs the junit and tap integrations, then each run fails with "attempt history unavailable" and no passing receipt is appended.

This is the failure side of proof producers: the adapters report the pass without inventing attempts, and Kibi's policy, not the producer, refuses it. documentation/tests/e2e/packed/proof-maintenance-ops.test.ts, in its producers case, exercises it.
