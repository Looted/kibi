---
title: An AGENTS.md section that rewords the brief's steps is rejected
status: active
expects: rejection
tags:
  - agent-instructions
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-26T11:41:13.998Z'
id: SCEN-NEG-init-agent-instructions-brief-drift
type: scenario
---
Given a managed section whose change steps are worded apart from the session brief, the agent-instructions test rejects it: an agent reading AGENTS.md and one reading the brief would be told different steps.
