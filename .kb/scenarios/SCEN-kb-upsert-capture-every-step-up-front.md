---
title: A requirement write lists every later kb_check step up front
status: active
expects: success
priority: must
tags:
  - kb_upsert
  - next-actions
  - decision-capture
origin:
  kind: agent
  recorded_at: '2026-11-24T20:01:30.601Z'
id: SCEN-kb-upsert-capture-every-step-up-front
type: scenario
---
Given a project at Kibi level test and a requirement with an unmodeled claim below a tested floor and a current requirement on the same subject, when it is written, then nextActions lists the pair review, the kb_model step, the scenario, the failure-side scenario, the test of both, the link and kibi prove in that one result.
