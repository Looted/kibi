---
title: The dry run lists different siblings than the write
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T19:16:48.325Z'
id: SCEN-NEG-upsert-dry-run-lists-siblings-DIFFERS
type: scenario
---
A dry run of a value change lists no siblings, or writes the value, so the agent only learns about the other requirements after the change landed.

This is the failure side the write must not produce; TEST-upsert-stale-siblings checks it.