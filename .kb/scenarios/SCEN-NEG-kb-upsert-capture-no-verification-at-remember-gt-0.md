---
title: Refused when verification steps in next actions at remember is above 0
status: active
expects: rejection
text_ref: REQ-kb-upsert-capture-every-step-up-front
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T10:21:34.850Z'
id: SCEN-NEG-kb-upsert-capture-no-verification-at-remember-gt-0
type: scenario
---
Given a project where verification steps in next actions at remember is above 0, which REQ-kb-upsert-capture-every-step-up-front forbids, then Kibi rejects that outcome, and TEST-kb-upsert-capture-with-why fails if the code allows it.
