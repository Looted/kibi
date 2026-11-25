---
title: A decision in another scope is shown as a card (refused)
status: active
priority: must
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T14:35:35.183Z'
id: SCEN-NEG-search-scope-candidates-other-scope-count-only-OFF
type: scenario
---
Given a decision in another scope that matches a question, when search returns it as a card instead of counting it, then it is refused.