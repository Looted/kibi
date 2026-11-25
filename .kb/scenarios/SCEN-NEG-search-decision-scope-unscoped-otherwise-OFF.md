---
title: A decision with no scope evidence gets no tier (refused)
status: active
priority: must
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T14:35:18.621Z'
id: SCEN-NEG-search-decision-scope-unscoped-otherwise-OFF
type: scenario
---
Given a lone decision with no code links from a source with no decision linked here, when search gives it no tier or drops it, then it is refused.