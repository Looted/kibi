---
title: Failing usage telemetry adds advisory diagnostics to kb_check without failing it
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T19:30:00.000Z'
id: SCEN-NEG-kibi-telemetry-check-diagnostics-BLOCKING
type: scenario
---
Given a usage log whose acceptance report fails on three consecutive failed upserts and a bypassed validation, when an unfiltered `kibi check --format json` runs, then it still exits 0, its quality diagnostics include repeated_mutation_failures and mutation_validation_bypassed, and every telemetry diagnostic is marked non-blocking.

This is the failure side of surfacing telemetry in kb_check: workflow evidence advises, it never blocks a check. documentation/tests/e2e/packed/telemetry-acceptance-gate.test.ts "passes fresh complete evidence and fails with ranked retry diagnostics" exercises it.
