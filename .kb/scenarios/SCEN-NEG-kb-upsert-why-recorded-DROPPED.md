---
title: A requirement write that drops its why is refused
status: active
expects: rejection
tags:
  - negative-path
priority: must
origin:
  kind: agent
  recorded_at: '2026-11-16T16:23:31.936Z'
id: SCEN-NEG-kb-upsert-why-recorded-DROPPED
type: scenario
---
Given a requirement write whose why is not recorded as its rationale and Context section, when it is checked, then it is refused: the why must be recorded.