---
title: A brief without the record step or the conflict rule is rejected
status: active
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-16T17:00:00.000Z'
tags:
  - session-brief
  - negative-path
id: SCEN-NEG-agent-core-session-brief-MISSING-RULE
type: scenario
---
Given a session brief that names only the search step and leaves out the conflict rule, when it is checked against the requirement, then it is rejected: the agent would neither record the person's decision nor ask before narrowing a recorded rule.