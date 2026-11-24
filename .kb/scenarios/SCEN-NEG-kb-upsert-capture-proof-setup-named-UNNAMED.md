---
title: A requirement write names the missing proof setup (refused when broken)
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-24T20:01:42.158Z'
id: SCEN-NEG-kb-upsert-capture-proof-setup-named-UNNAMED
type: scenario
---
Given a workspace without a proof integration, when a requirement write lists kibi prove but not the proof setup, then it is refused: the missing file must be named.
