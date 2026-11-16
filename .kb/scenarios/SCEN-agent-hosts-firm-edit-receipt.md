---
title: A Codex, Cursor or ZCode agent records its verdict instead of being told again
status: active
priority: should
expects: success
tags:
  - hooks
  - firmness
origin:
  kind: agent
  recorded_at: '2026-11-16T07:01:59.338Z'
id: SCEN-agent-hosts-firm-edit-receipt
type: scenario
---
Given src/checkout.ts implements a current firm requirement, when the agent first edits computeTotal in Codex, Cursor or ZCode, then the pre-edit notice tells it to ask the person before an edit that breaks the rule and to record its verdict with kibi review-firm-edit. After the agent records a current keeps receipt for computeTotal, a pre-edit event for that code no longer carries the notice.