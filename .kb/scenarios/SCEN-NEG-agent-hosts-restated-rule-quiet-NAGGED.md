---
title: Rule notes skip a sentence that restates a recorded requirement (refused when broken)
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-24T20:02:21.145Z'
id: SCEN-NEG-agent-hosts-restated-rule-quiet-NAGGED
type: scenario
---
Given a prompt sentence that only restates a current requirement, when the rule note or capture reminder asks to record it, then it is refused.
