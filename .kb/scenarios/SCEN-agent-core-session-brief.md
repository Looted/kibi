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
Given the session brief from kibi-agent-core, when an agent reads it at session start, then it is told to kb_search for the recorded intent before changing behaviour, to record the person's decision with their reason, to run kibi check --staged before finishing, and that a request that would make a recorded requirement or decision false is a question to ask, not a task.