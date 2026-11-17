---
title: A requirement write returns the steps kb_check still needs
status: active
expects: success
tags:
  - kb_upsert
  - next-actions
priority: must
origin:
  kind: agent
  recorded_at: '2026-11-16T16:11:30.689Z'
id: SCEN-kb-upsert-capture-next-actions
type: scenario
---
Given a firm requirement written with an implementing symbol, no test and an inventory claim without subjects, when it is written, then the result lists a nextActions entry for the claim's subjects, the scenario, the test, the link, the symbol coverage and kibi prove, each with its operation and input, and the warnings they replace are gone.