---
title: A refused upsert is never sent as a Kibi error
status: active
expects: rejection
tags:
  - negative-path
  - telemetry
origin:
  kind: agent
  recorded_at: '2026-11-03T13:47:26.994Z'
id: SCEN-NEG-kibi-telemetry-expected-outcomes-refusal-as-error
type: scenario
---
Given telemetry is on and an agent sends an upsert with an invalid status or without a type, when the CLI records the refused command, then Kibi refuses to count it as an error: the telemetry host receives the event with status `rejected` and the refusal's code, not `error` or `operation_failed`.

This is the failure side of the outcome split: an agent's bad payload must not show up as a Kibi crash. packages/cli/tests/usage-telemetry-outcomes-e2e.test.ts "a refused payload is sent as rejected with its code, and never its content" exercises it.