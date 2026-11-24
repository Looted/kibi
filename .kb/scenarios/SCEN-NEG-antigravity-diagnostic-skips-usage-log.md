---
title: Diagnostic mode writes no hook usage log is rejected
status: active
expects: rejection
tags:
  - negative-path
  - antigravity
origin:
  kind: agent
  recorded_at: '2026-11-24T05:07:13.220Z'
id: SCEN-NEG-antigravity-diagnostic-skips-usage-log
type: scenario
---
Given the diagnostic telemetry opt-in, when the hooks run, then they append hook usage records; diagnostic mode that writes nothing is rejected. packages/antigravity/tests/hook-runner.test.ts covers the usage log written in diagnostic mode.