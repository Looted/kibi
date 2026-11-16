---
title: Six related requirements in one write result are refused
status: active
expects: rejection
tags:
  - negative-path
priority: must
origin:
  kind: agent
  recorded_at: '2026-11-16T16:11:36.919Z'
id: SCEN-NEG-kb-upsert-related-requirements-cap-TOO-MANY
type: scenario
---
Given a write result that lists six related current requirements, when it is checked against the cap, then it is refused: the list holds at most five.