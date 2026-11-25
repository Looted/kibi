---
title: A requirement write lists every later kb_check step up front (refused when broken)
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-24T20:01:31.772Z'
id: SCEN-NEG-kb-upsert-capture-every-step-up-front-MISSING-STEP
type: scenario
---
Given a requirement write whose nextActions leave out a step kb_check will report once the listed steps are done, when the result is checked, then it is refused: every later step must be in the same result.
