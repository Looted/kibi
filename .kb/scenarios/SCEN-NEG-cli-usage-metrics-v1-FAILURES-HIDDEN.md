---
title: kibi usage-metrics fails acceptance and names the metric when the usage log shows repeated mutation failures
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:06:03.822Z'
id: SCEN-NEG-cli-usage-metrics-v1-FAILURES-HIDDEN
type: scenario
---
Given a packed workspace whose diagnostic usage log passed acceptance, when three timed-out kb_upsert calls on the same symbol are appended and kibi usage-metrics --require-acceptance runs, then the command refuses acceptance: it exits 1, reports the acceptance as failed and marks repeated_mutation_failures as failed.

This is the failure side of the usage metrics summary: an audit command that passes a log full of repeated failures would hide the problem it exists to show. documentation/tests/e2e/packed/telemetry-acceptance-gate.test.ts "passes fresh complete evidence and fails with ranked retry diagnostics" exercises it.
