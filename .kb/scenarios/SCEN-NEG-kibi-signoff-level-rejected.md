---
title: A level change or lowered floor is not left out of signoff
status: active
expects: rejection
text_ref: packages/cli/src/signoff/collect.ts
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T13:40:38.758Z'
id: SCEN-NEG-kibi-signoff-level-rejected
type: scenario
---
Given a change that moves the Kibi level or lowers a requirement's floor, a signoff view that does not list it as a decision is wrong; a raised floor, a retired requirement and an unchanged level list no decision.
