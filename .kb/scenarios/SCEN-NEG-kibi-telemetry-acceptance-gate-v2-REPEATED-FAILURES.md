---
title: Three consecutive failures on one mutation target fail the telemetry acceptance gate
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:16:32.825Z'
id: SCEN-NEG-kibi-telemetry-acceptance-gate-v2-REPEATED-FAILURES
type: scenario
---
Given a usage log that passed the acceptance gate and then gains three consecutive failed kb_upsert events for the same symbol, when kibi usage-metrics runs with --require-acceptance, then the report fails with repeated_mutation_failures marked failed, the command exits with status 1, and kibi check surfaces repeated_mutation_failures as a quality diagnostic.

This is the failure side of the retry discipline metric: a run of blind retries must fail the gate instead of passing it. documentation/tests/e2e/packed/telemetry-acceptance-gate.test.ts "passes fresh complete evidence and fails with ranked retry diagnostics" exercises it.
