---
title: The default mode writes a hook usage log is rejected
status: active
expects: rejection
tags:
  - negative-path
  - antigravity
origin:
  kind: agent
  recorded_at: '2026-11-24T05:07:10.245Z'
id: SCEN-NEG-antigravity-default-writes-usage-log
type: scenario
---
Given no diagnostic opt-in, when the hooks run, then no usage log is written; writing one by default is rejected. packages/antigravity/tests/hook-runner.test.ts and hook-runner-branches.test.ts cover the default and diagnostic telemetry modes.