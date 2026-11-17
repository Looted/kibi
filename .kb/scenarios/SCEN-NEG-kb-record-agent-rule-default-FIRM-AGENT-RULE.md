---
title: An agent rule recorded as firm is refused
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T07:11:00.043Z'
id: SCEN-NEG-kb-record-agent-rule-default-FIRM-AGENT-RULE
type: scenario
---
Given a rule the agent chose that kb_record recorded as firm with a human origin, when it is checked, then it is refused: a rule the agent chose must be recorded as default with origin kind agent.
