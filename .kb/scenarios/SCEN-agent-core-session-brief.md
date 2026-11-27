---
title: The session brief names the search, record and check steps and the conflict rule
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-16T17:00:00.000Z'
tags:
  - session-brief
id: SCEN-agent-core-session-brief
type: scenario
---
Given the session brief from kibi-agent-core, when an agent reads it at session start, then it is told to kb_search for the recorded intent before changing behaviour, to record a rule the person states with kb_record in the same turn with their reason, to run the linked tests and kb_check with changed: true (the commit gate's verdict on the change) before its final message, and that a request that would make a recorded requirement or decision false is a question to ask, not a task.
