---
title: A field name no Kibi schema defines never reaches telemetry
status: active
expects: rejection
tags:
  - negative-path
  - telemetry
origin:
  kind: agent
  recorded_at: '2026-11-03T14:22:43.327Z'
id: SCEN-NEG-kibi-telemetry-agent-signals-invented-field
type: scenario
---
Given telemetry is on and an agent sends a payload with a field or entity id of its own, when Kibi refuses it, then Kibi refuses to send that name: the event carries `other` for an unknown field and holds neither the entity id nor any value from the payload.

This is the failure side of the struggle signals: they must never carry customer vocabulary. packages/cli/tests/usage-telemetry-outcomes-e2e.test.ts "a refused payload is sent as rejected with its code, and never its content" checks that no id or value is sent, and packages/cli/tests/telemetry-details.test.ts checks that invented field names become `other`.