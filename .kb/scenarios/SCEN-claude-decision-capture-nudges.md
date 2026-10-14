---
title: The person states a rule and the agent changes the code
status: active
priority: must
tags:
  - hooks
  - claude-code
  - capture
origin:
  kind: agent
  recorded_at: '2026-10-14T16:57:40.854Z'
id: SCEN-claude-decision-capture-nudges
type: scenario
---
Given a Kibi workspace, when the person submits "Totals must never be negative.", then the agent is told before it starts that the rule is recorded with kb_upsert as part of the change. When the agent then edits src/checkout.ts and stops without any kb_upsert, the Stop hook asks it once to record the decision or say there was none; a second stop is not asked again, and a session that recorded something with kb_upsert is not asked.