---
title: A preflight 61 minutes before the upsert is not credited and the acceptance gate fails
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:00:42.766Z'
id: SCEN-CASE-kibi-telemetry-acceptance-gate-v2-preflight-61-minutes-before-upsert
type: scenario
---
Given a packed Kibi installation whose usage log holds the complete passing workflow evidence except that the exact-payload kb_validate_upsert preflight ran 61 minutes before its kb_upsert, when kibi usage-metrics runs with --require-acceptance, then the validation_before_upsert metric fails, the report status is failed and the command exits with status 1.

The test case documentation/tests/e2e/packed/telemetry-acceptance-gate.test.ts "does not credit a preflight more than one hour before the upsert" exercises it. It covers the value past the bound of correlated preflight age, `gt 60` minutes.